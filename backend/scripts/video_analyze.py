#!/usr/bin/env python3
"""
video_analyze.py  –  CCTV incident detection for Percepta
Called by videoProcessor.js:
    python video_analyze.py <video_file> <output_dir>

WHY THIS APPROACH:
  Fixed thresholds fail because normal videos vary wildly in activity level.
  A birthday party, a crowded street, and an empty room all have different
  "normal" motion. Using a fixed number means either missing real incidents
  (too high) or flooding normal videos with false positives (too low).

  The correct method is SPIKE DETECTION: compare the current frame's motion
  to the rolling median of the past 30 seconds in that same video.
  An incident is when motion suddenly jumps 4x above what's been normal SO FAR.

  This means:
  - Busy street with constant traffic → high baseline → only flags sudden jumps
  - Quiet empty room → low baseline → even small sudden movement gets flagged
  - Works correctly for both without any manual tuning per video

DETECTION LAYERS:
  Layer 1 — MOG2 + spike ratio
    Background subtraction. Flags when foreground coverage suddenly jumps
    4x above the rolling 30-second median. Pre-warmed for 5s before flagging.

  Layer 2 — Optical flow + spike ratio
    Dense optical flow. Flags when average pixel velocity suddenly spikes.
    Catches fast violence, running, sudden falls.

  Layer 3 — Brightness spike
    Flags sudden brightness jumps (explosions, arc flash, fire flash).
    Compared against rolling 5-second mean.

  Layer 4 — YOLO (optional, needs ultralytics)
    Object detection for known dangerous objects: knives, bats, fire.
    Falls back silently if not installed.

FALSE POSITIVE PREVENTION:
  - 5-second MOG2 warmup: no flagging during background model learning
  - Spike ratio (not absolute value): adapts to each video's activity level
  - Absolute minimum floor: ignores tiny noise blips
  - Requires 2 consecutive triggered frames (eliminates single-frame glitches)
  - 6-second dedup window per incident type

FRAME SAVING:
  - Every incident frame saved (no cap)
  - 1 periodic context frame per 10 seconds (no hard cap)

pip install opencv-python-headless           (required)
pip install ultralytics                      (optional, adds weapon detection)
"""

import sys, json, os, cv2, numpy as np

INCIDENT_CLASSES = {
    "knife": "assault", "scissors": "assault", "baseball bat": "assault",
    "fire":  "fire",
}
PERSON_CLASS = "person"

SEVERITY_MAP = {
    "assault": "critical", "fire": "high",
    "explosion": "critical", "motion_anomaly": "high",
    "crowd": "medium", "fall": "high",
}

WARMUP_SECONDS   = 5      # pre-warm MOG2 — no flagging during this period
SPIKE_RATIO      = 4.0    # current must be this many times the rolling median
FLOW_SPIKE_RATIO = 4.0    # same for optical flow
FG_FLOOR         = 0.020  # absolute minimum fg coverage to flag (2.0% of frame)
FLOW_FLOOR       = 2.0    # absolute minimum flow magnitude to flag
BRIGHTNESS_JUMP  = 1.40   # brightness must jump 40% above rolling 5s mean
BRIGHTNESS_FLOOR = 145    # absolute minimum brightness to flag
ROLLING_WINDOW_S = 30     # seconds for rolling median
CONSEC_REQUIRED  = 2      # consecutive triggered frames before flagging incident
DEDUP_SEC        = 6      # suppress same-type incidents within this window
PERIODIC_S       = 10     # save one context keyframe every N seconds

# Scene cut / camera switch detection
# If whole-frame mean absolute diff exceeds this many std-devs above its own rolling mean,
# it's a cut. MOG2 is reset and flagging suppressed for WARMUP_SECONDS.
SCENE_CUT_STDDEV = 4.0    # how many std-devs above rolling mean = cut
SCENE_CUT_FLOOR  = 20.0   # absolute minimum diff to call a cut (ignore tiny lighting shifts)

# Minimum rolling median before flagging motion anomalies.
# Prevents flagging the first person who enters a previously empty scene
# (the median would be near-zero, making any movement look like a huge spike).
MIN_MEDIAN_TO_FLAG = 0.004  # at least 0.4% average fg before we trust spike ratios


def main():
    if len(sys.argv) < 3:
        _fail("Usage: video_analyze.py <video_file> <output_dir>")

    video_path, output_dir = sys.argv[1], sys.argv[2]
    if not os.path.isfile(video_path):
        _fail(f"File not found: {video_path}")
    os.makedirs(output_dir, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        _fail(f"Cannot open: {video_path}")
    fps          = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration     = total_frames / fps
    width        = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height       = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()

    try:
        from ultralytics import YOLO
        yolo = YOLO("yolov8n.pt")
        model_label = "MOG2-spike + optical-flow-spike + brightness + yolov8n"
    except Exception:
        yolo = None
        model_label = "MOG2-spike + optical-flow-spike + brightness (no YOLO)"

    result = _analyze(video_path, output_dir, fps, duration, yolo)
    result.update({
        "duration": round(duration, 2), "fps": round(fps, 2),
        "total_frames": total_frames, "resolution": f"{width}x{height}",
        "detection_model": model_label,
    })
    print(json.dumps(result, ensure_ascii=False))
    sys.exit(0)


def _analyze(video_path, output_dir, fps, duration, yolo):
    kernel        = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    warmup_frames = int(fps * WARMUP_SECONDS)
    rolling_n     = int(fps * ROLLING_WINDOW_S)

    # MOG2 with high history — needs to see enough background before it's reliable
    mog2 = cv2.createBackgroundSubtractorMOG2(
        history=500, varThreshold=60, detectShadows=True
    )

    cap = cv2.VideoCapture(video_path)

    # ── Pre-warmup: feed first 5 seconds with fast learning, don't flag ────
    for _ in range(warmup_frames):
        ret, frame = cap.read()
        if not ret:
            break
        mog2.apply(frame, learningRate=0.05)

    incidents         = []
    keyframes         = []
    person_counts     = []
    fg_rolling        = []        # rolling window of fg ratios
    flow_rolling      = []        # rolling window of flow magnitudes
    brightness_hist   = []        # full history for brightness spike
    frame_diff_hist   = []        # rolling window of whole-frame diffs for cut detection

    prev_gray         = None
    prev_small        = None      # downsampled previous frame for cut detection
    consec_mog2       = 0         # consecutive frames with MOG2 spike
    consec_flow       = 0         # consecutive frames with flow spike
    frame_idx         = warmup_frames
    last_periodic_ts  = -PERIODIC_S
    cut_suppress_until = 0.0      # suppress flagging until this timestamp after a cut

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        ts   = frame_idx / fps
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # ── Scene cut detection (camera switch / hard edit) ─────────────
        # Downsample for speed. If whole-frame diff is huge, it's a cut not motion.
        small = cv2.resize(gray, (80, 60)).astype(np.float32)
        is_cut = False
        if prev_small is not None:
            frame_diff = float(np.mean(np.abs(small - prev_small)))
            frame_diff_hist.append(frame_diff)
            if len(frame_diff_hist) > int(fps * 10):
                frame_diff_hist.pop(0)
            if len(frame_diff_hist) >= 10:
                fd_mean = float(np.mean(frame_diff_hist[:-1]))
                fd_std  = float(np.std(frame_diff_hist[:-1]))
                if (frame_diff > fd_mean + SCENE_CUT_STDDEV * fd_std and
                        frame_diff > SCENE_CUT_FLOOR):
                    is_cut = True
                    # Reset MOG2 so it learns the new background
                    mog2 = cv2.createBackgroundSubtractorMOG2(
                        history=500, varThreshold=60, detectShadows=True
                    )
                    fg_rolling.clear()
                    flow_rolling.clear()
                    consec_mog2 = 0
                    consec_flow = 0
                    cut_suppress_until = ts + WARMUP_SECONDS
        prev_small = small

        # ── Layer 1: MOG2 spike detection ───────────────────────────────
        fg_mask  = mog2.apply(frame)
        fg_bin   = cv2.threshold(fg_mask, 200, 255, cv2.THRESH_BINARY)[1]
        fg_clean = cv2.morphologyEx(fg_bin, cv2.MORPH_OPEN,  kernel)
        fg_clean = cv2.morphologyEx(fg_clean, cv2.MORPH_CLOSE, kernel)
        fg_ratio = float(np.sum(fg_clean > 0)) / fg_clean.size

        contours, _ = cv2.findContours(fg_clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        large_blobs = [c for c in contours if cv2.contourArea(c) > 500]

        # Motion anomaly: adaptive spike ratio + minimum median guard + cut suppression
        fg_rolling.append(fg_ratio)
        if len(fg_rolling) > rolling_n:
            fg_rolling.pop(0)
        fg_median   = float(np.median(fg_rolling)) if fg_rolling else fg_ratio
        fg_spike    = fg_ratio / max(fg_median, 0.001)
        in_suppress = ts < cut_suppress_until
        mog2_raw    = (fg_spike >= SPIKE_RATIO
                       and fg_ratio >= FG_FLOOR
                       and fg_median >= MIN_MEDIAN_TO_FLAG
                       and not in_suppress)

        if mog2_raw:
            consec_mog2 += 1
        else:
            consec_mog2 = 0
        mog2_incident = "motion_anomaly" if consec_mog2 >= CONSEC_REQUIRED else None

        # ── Layer 2: Optical flow spike detection ───────────────────────
        flow_magnitude = 0.0
        flow_incident  = None

        if prev_gray is not None:
            flow      = cv2.calcOpticalFlowFarneback(
                prev_gray, gray, None, 0.5, 3, 15, 3, 5, 1.2, 0
            )
            mag, _    = cv2.cartToPolar(flow[..., 0], flow[..., 1])
            flow_magnitude = float(np.mean(mag))

            flow_rolling.append(flow_magnitude)
            if len(flow_rolling) > rolling_n:
                flow_rolling.pop(0)
            flow_median  = float(np.median(flow_rolling)) if flow_rolling else flow_magnitude
            flow_spike_r = flow_magnitude / max(flow_median, 0.1)
            flow_raw     = (flow_spike_r >= FLOW_SPIKE_RATIO
                            and flow_magnitude >= FLOW_FLOOR
                            and not in_suppress)

            if flow_raw:
                consec_flow += 1
            else:
                consec_flow = 0
            if consec_flow >= CONSEC_REQUIRED:
                flow_incident = "motion_anomaly"

        prev_gray = gray

        # ── Layer 3: Brightness spike ────────────────────────────────────
        brightness          = float(np.mean(gray))
        brightness_incident = None
        brightness_hist.append(brightness)

        if len(brightness_hist) > int(fps * 2):   # wait 2s before flagging
            window       = brightness_hist[-max(1, int(fps * 5)):]
            recent_mean  = float(np.mean(window[:-1])) if len(window) > 1 else brightness
            if brightness > recent_mean * BRIGHTNESS_JUMP and brightness > BRIGHTNESS_FLOOR:
                brightness_incident = "explosion"

        # ── Layer 4: YOLO ────────────────────────────────────────────────
        yolo_detections = []
        yolo_incident   = None
        person_count    = 0

        if yolo is not None:
            for r in yolo(frame, verbose=False, conf=0.35):
                for box in r.boxes:
                    cls  = yolo.names[int(box.cls[0])]
                    conf = float(box.conf[0])
                    x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
                    if cls == PERSON_CLASS:
                        person_count += 1
                    inc = INCIDENT_CLASSES.get(cls)
                    if inc:
                        yolo_incident = inc
                    yolo_detections.append({
                        "class": cls, "confidence": round(conf, 3),
                        "bbox": [x1, y1, x2, y2],
                    })
        person_counts.append(person_count)

        # ── Combine layers (priority order) ─────────────────────────────
        incident_type = (
            brightness_incident
            or yolo_incident
            or mog2_incident
            or flow_incident
        )
        is_incident = incident_type is not None

        # ── Save keyframe ────────────────────────────────────────────────
        save_periodic = (ts - last_periodic_ts) >= PERIODIC_S

        if is_incident or save_periodic:
            fname      = f"frame_{frame_idx:06d}.jpg"
            fpath      = os.path.join(output_dir, fname)
            annotated  = frame.copy()

            for c in large_blobs:
                bx, by, bw, bh = cv2.boundingRect(c)
                cv2.rectangle(annotated, (bx, by), (bx+bw, by+bh), (0, 140, 255), 1)

            for det in yolo_detections:
                x1, y1, x2, y2 = det["bbox"]
                color = (0, 0, 220) if INCIDENT_CLASSES.get(det["class"]) else (0, 200, 60)
                cv2.rectangle(annotated, (x1,y1), (x2,y2), color, 2)
                cv2.putText(annotated, f"{det['class']} {det['confidence']:.2f}",
                            (x1, max(y1-6, 14)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1)

            oy = 22
            if brightness_incident:
                cv2.putText(annotated, f"FLASH/EXPLOSION  b={brightness:.0f}",
                            (6,oy), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,0,255), 2); oy += 24
            if mog2_incident:
                cv2.putText(annotated, f"MOG2 SPIKE  {fg_spike:.1f}x  fg={fg_ratio:.2%}",
                            (6,oy), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,80,0), 2); oy += 24
            if flow_incident:
                cv2.putText(annotated, f"FLOW SPIKE  mag={flow_magnitude:.2f}",
                            (6,oy), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200,0,200), 2)

            cv2.imwrite(fpath, annotated)

            if not is_incident:
                last_periodic_ts = ts

            keyframes.append({
                "frame_index": frame_idx, "timestamp": round(ts, 2),
                "timestamp_str": _hms(ts), "path": fpath, "filename": fname,
                "detections": yolo_detections, "is_incident": is_incident,
                "people_count": person_count,
                "fg_ratio": round(fg_ratio, 4), "fg_spike": round(fg_spike, 2),
                "flow_mag": round(flow_magnitude, 3),
            })

        # ── Register incident (dedup) ────────────────────────────────────
        if is_incident:
            same   = [i for i in incidents if i["type"] == incident_type]
            last_t = same[-1]["timestamp"] if same else -999
            if ts - last_t > DEDUP_SEC:
                details = []
                if brightness_incident: details.append(f"brightness {brightness:.0f}")
                if mog2_incident:       details.append(f"fg spike {fg_spike:.1f}x ({fg_ratio:.1%})")
                if flow_incident:       details.append(f"flow {flow_magnitude:.2f}")
                incidents.append({
                    "type": incident_type, "severity": SEVERITY_MAP.get(incident_type, "medium"),
                    "timestamp": round(ts, 2), "timestamp_str": _hms(ts),
                    "frame_index": frame_idx, "frame_file": f"frame_{frame_idx:06d}.jpg",
                    "detections": yolo_detections, "details": ", ".join(details),
                })

        frame_idx += 1

    cap.release()

    # ── Crowd detection ──────────────────────────────────────────────────
    avg_people = 0.0
    if person_counts:
        avg_people = sum(person_counts) / len(person_counts)
        max_people = max(person_counts)
        if max_people >= 8 and not any(i["type"] == "crowd" for i in incidents):
            incidents.insert(0, {
                "type": "crowd", "severity": "medium",
                "timestamp": 0.0, "timestamp_str": "00:00:00",
                "frame_index": 0, "frame_file": "", "detections": [],
                "details": f"max {max_people} people, avg {avg_people:.1f}",
            })

    return {
        "incidents": incidents, "keyframes": keyframes,
        "summary": _summary(incidents, keyframes, duration),
        "incident_count": len(incidents), "keyframe_count": len(keyframes),
        "avg_people": round(avg_people, 1),
    }


def _summary(incidents, keyframes, duration):
    if not incidents:
        return f"No incidents detected in {_hms(duration)} video. {len(keyframes)} keyframes extracted."
    types    = list({i["type"] for i in incidents})
    critical = sum(1 for i in incidents if i["severity"] == "critical")
    parts    = [f"{len(incidents)} incident(s) detected"]
    if critical: parts.append(f"{critical} critical")
    parts.append(f"types: {', '.join(types)}")
    parts.append(f"{len(keyframes)} keyframes saved")
    return ". ".join(parts) + "."


def _hms(s):
    s = int(s)
    return f"{s//3600:02d}:{(s%3600)//60:02d}:{s%60:02d}"


def _fail(msg):
    print(json.dumps({"error": msg}))
    sys.exit(1)


if __name__ == "__main__":
    main()
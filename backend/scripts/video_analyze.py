#!/usr/bin/env python3
"""
video_analyze.py — Violence / Anomaly Detection + YOLO Person Counting
=======================================================================
Loads your fine-tuned binary R3D-18 model (Normal vs Violence/Anomaly).
Falls back to Kinetics pretrained weights if no checkpoint is found.
"""

import sys
import json
import os
import cv2
import numpy as np
from pathlib import Path

# Binary classes produced by train_anomaly.py
CATEGORIES_BINARY = ["Normal", "Violence"]

SEVERITY_MAP = {
    "Normal":   "low",
    "Violence": "high",
    "Anomaly":  "high",
}

# ── Config ──────────────────────────────────────────────────────
CLIP_LEN             = 16
CLIP_STEP            = 8
FRAME_SIZE           = 112

CONFIDENCE_TH        = 0.80    # Minimum confidence to flag as violence
NORMAL_TH            = 0.35    # If normal score >= this AND tops, skip
ANOMALY_MARGIN       = 0.40    # Violence score must beat normal by this margin

MIN_INCIDENT_GAP_SEC = 4.0
MAX_KEYFRAMES        = 20
YOLO_PERSON_CONF     = 0.35
YOLO_SAMPLE_INTERVAL = 30

# Paths where the training script saves the checkpoint
MODEL_SEARCH_PATHS = [
    "./models/anomaly_classifier.pth",
    "./backend/models/anomaly_classifier.pth",
    "../models/anomaly_classifier.pth",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "anomaly_classifier.pth"),
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models", "anomaly_classifier.pth"),
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend", "models", "anomaly_classifier.pth"),
]


def main():
    if len(sys.argv) < 3:
        _fail("Usage: video_analyze.py <video_file> <output_dir>")

    video_path = sys.argv[1]
    output_dir = sys.argv[2]

    if not os.path.isfile(video_path):
        _fail(f"Video file not found: {video_path}")

    os.makedirs(output_dir, exist_ok=True)

    model, device, categories, mode = load_model()
    print(f"[CrimeDetector] Mode: {mode} | Classes: {categories}", file=sys.stderr)

    yolo_model = load_yolo_model()

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        _fail(f"Cannot open video: {video_path}")

    fps          = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration     = total_frames / fps if fps > 0 else 0
    width        = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height       = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()

    people_counts = []
    if yolo_model is not None:
        print(f"[YOLO] Counting people across video ({total_frames} frames)...", file=sys.stderr)
        people_counts = count_people_in_video(video_path, yolo_model, total_frames, YOLO_SAMPLE_INTERVAL)
        avg_people = round(sum(people_counts) / max(len(people_counts), 1), 1)
        max_people = max(people_counts) if people_counts else 0
        print(f"[YOLO] Avg people: {avg_people}, Max: {max_people}, Samples: {len(people_counts)}", file=sys.stderr)
    else:
        avg_people = 0
        max_people = 0

    all_frames = read_all_frames(video_path, FRAME_SIZE)
    n_frames   = len(all_frames)

    clip_results = []
    i = 0
    while i + CLIP_LEN <= n_frames:
        clip   = all_frames[i: i + CLIP_LEN]
        scores = classify_clip(clip, model, device, categories)
        clip_results.append((i, scores))
        i += CLIP_STEP

    if n_frames > 0 and (len(clip_results) == 0 or clip_results[-1][0] + CLIP_LEN < n_frames):
        tail = all_frames[-CLIP_LEN:] if n_frames >= CLIP_LEN else all_frames
        while len(tail) < CLIP_LEN:
            tail.append(tail[-1])
        start_f = max(0, n_frames - CLIP_LEN)
        scores  = classify_clip(tail, model, device, categories)
        clip_results.append((start_f, scores))

    incidents  = []
    keyframes  = []
    last_incident_ts = -9999

    kf_interval_frames = max(1, int(fps * 10))
    saved_kf_indices   = set()
    fi = 0
    kf_count = 0
    while fi < n_frames and kf_count < MAX_KEYFRAMES:
        saved_kf_indices.add(fi)
        fi += kf_interval_frames
        kf_count += 1

    for (start_f, scores) in clip_results:
        mid_f  = min(start_f + CLIP_LEN // 2, n_frames - 1)
        ts     = mid_f / fps

        normal_score   = scores.get("Normal",   scores.get("normal",   0.0))
        # Support both "Violence" and "Anomaly" key names
        violence_score = scores.get("Violence", scores.get("Anomaly",  0.0))
        top_cat        = max(scores, key=scores.get)
        top_score      = scores[top_cat]

        # Skip if classified as Normal with high confidence
        if top_cat == "Normal" or normal_score >= NORMAL_TH:
            continue

        # Skip if violence confidence is too low
        if violence_score < CONFIDENCE_TH:
            continue

        # Skip if margin over normal is too small
        if violence_score - normal_score < ANOMALY_MARGIN:
            print(f"[Filter] Skipping Violence ({violence_score:.2f}) — margin too small vs Normal ({normal_score:.2f})", file=sys.stderr)
            continue

        # Enforce minimum gap between incidents
        if ts - last_incident_ts < MIN_INCIDENT_GAP_SEC:
            continue

        last_incident_ts = ts
        cat      = "Violence"
        score    = violence_score
        severity = SEVERITY_MAP.get(cat, "high")

        kf_filename = f"frame_{mid_f:06d}.jpg"
        kf_abs_path = os.path.join(output_dir, kf_filename)

        if mid_f not in saved_kf_indices:
            saved_kf_indices.add(mid_f)

        raw = read_frame_at(video_path, mid_f)
        if raw is not None:
            cv2.imwrite(kf_abs_path, raw)

        frame_people_count = 0
        if yolo_model is not None and raw is not None:
            frame_people_count = detect_people_in_frame(yolo_model, raw)

        keyframes.append({
            "frame_index":   mid_f,
            "timestamp":     round(ts, 2),
            "timestamp_str": seconds_to_hms(ts),
            "filename":      kf_filename,
            "path":          kf_abs_path,
            "is_incident":   True,
            "people_count":  frame_people_count,
            "detections":    [],
            "category":      cat,
            "confidence":    round(score, 3),
        })

        incidents.append({
            "type":          cat,
            "severity":      severity,
            "timestamp":     round(ts, 2),
            "timestamp_str": seconds_to_hms(ts),
            "frame_index":   mid_f,
            "frame_file":    kf_filename,
            "path":          kf_abs_path,
            "confidence":    round(score, 3),
            "details":       f"{cat} detected with {round(score * 100, 1)}% confidence",
            "detections":    [],
            "people_count":  frame_people_count,
        })

    incident_frame_indices = {kf["frame_index"] for kf in keyframes}

    for fi in sorted(saved_kf_indices):
        if fi in incident_frame_indices:
            continue
        kf_filename = f"frame_{fi:06d}.jpg"
        kf_abs_path = os.path.join(output_dir, kf_filename)
        raw = read_frame_at(video_path, fi)
        if raw is not None:
            cv2.imwrite(kf_abs_path, raw)

        frame_people_count = 0
        if yolo_model is not None and raw is not None:
            frame_people_count = detect_people_in_frame(yolo_model, raw)

        keyframes.append({
            "frame_index":   fi,
            "timestamp":     round(fi / fps, 2),
            "timestamp_str": seconds_to_hms(fi / fps),
            "filename":      kf_filename,
            "path":          kf_abs_path,
            "is_incident":   False,
            "people_count":  frame_people_count,
            "detections":    [],
        })

    keyframes.sort(key=lambda x: x["timestamp"])
    incidents.sort(key=lambda x: x["timestamp"])

    violence_detected = len(incidents) > 0
    danger_level      = compute_danger_level(incidents)
    summary           = build_summary(incidents, keyframes, duration, violence_detected, danger_level, avg_people)

    result = {
        "incidents":         incidents,
        "keyframes":         keyframes,
        "summary":           summary,
        "incident_count":    len(incidents),
        "keyframe_count":    len(keyframes),
        "duration":          round(duration, 2),
        "fps":               round(fps, 2),
        "total_frames":      total_frames,
        "resolution":        f"{width}x{height}",
        "avg_people":        avg_people,
        "max_people":        max_people,
        "violence_detected": violence_detected,
        "danger_level":      danger_level,
        "detection_model":   f"R3D-18 Fine-tuned Binary ({mode})",
        "mode":              mode,
    }

    print(json.dumps(result, ensure_ascii=False))
    sys.exit(0)


# ── YOLO ─────────────────────────────────────────────────────────

def load_yolo_model():
    try:
        from ultralytics import YOLO
        script_dir  = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.join(script_dir, "..")
        for p in [
            os.path.join(backend_dir, "yolov8n.pt"),
            os.path.join(script_dir, "yolov8n.pt"),
            "yolov8n.pt",
        ]:
            if os.path.isfile(p):
                yolo = YOLO(p)
                print(f"[YOLO] Loaded model from: {p}", file=sys.stderr)
                return yolo
        yolo = YOLO("yolov8n.pt")
        print("[YOLO] Auto-downloaded yolov8n.pt", file=sys.stderr)
        return yolo
    except ImportError:
        print("[YOLO] WARNING: ultralytics not installed.", file=sys.stderr)
        return None
    except Exception as e:
        print(f"[YOLO] WARNING: {e}", file=sys.stderr)
        return None


def detect_people_in_frame(yolo_model, frame_bgr):
    try:
        results = yolo_model(frame_bgr, verbose=False, conf=YOLO_PERSON_CONF)
        return sum(1 for r in results for box in r.boxes if int(box.cls[0]) == 0)
    except Exception:
        return 0


def count_people_in_video(video_path, yolo_model, total_frames, sample_interval):
    counts    = []
    cap       = cv2.VideoCapture(video_path)
    frame_idx = 0
    while frame_idx < total_frames:
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if not ret:
            break
        counts.append(detect_people_in_frame(yolo_model, frame))
        frame_idx += sample_interval
    cap.release()
    return counts


# ── Danger level ──────────────────────────────────────────────────

def compute_danger_level(incidents):
    if not incidents:
        return "safe"
    severities = [i["severity"] for i in incidents]
    if "critical" in severities:
        return "critical"
    elif "high" in severities:
        return "critical" if severities.count("high") >= 3 else "high"
    elif "medium" in severities:
        return "high" if severities.count("medium") >= 3 else "medium"
    return "low"


# ── Model loading ─────────────────────────────────────────────────

def load_model():
    import torch
    import torch.nn as nn
    from torchvision.models.video import r3d_18, R3D_18_Weights

    device     = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    categories = CATEGORIES_BINARY   # ["Normal", "Violence"]
    num_classes = len(categories)

    # Build model architecture (matches train_anomaly.py)
    model = r3d_18(weights=R3D_18_Weights.DEFAULT)
    in_features = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(p=0.5),
        nn.Linear(in_features, 256),
        nn.ReLU(),
        nn.Dropout(p=0.3),
        nn.Linear(256, num_classes),
    )

    # Try to load fine-tuned checkpoint
    ckpt_path = None
    for p in MODEL_SEARCH_PATHS:
        if os.path.isfile(p):
            ckpt_path = p
            break

    if ckpt_path:
        try:
            state = torch.load(ckpt_path, map_location=device)
            model.load_state_dict(state)
            mode = f"Fine-tuned Binary (from {ckpt_path})"
            print(f"[CrimeDetector] ✅ Loaded fine-tuned weights: {ckpt_path}", file=sys.stderr)
        except Exception as e:
            mode = "Kinetics Pretrained (checkpoint load failed)"
            print(f"[CrimeDetector] WARNING: Could not load checkpoint ({e}). "
                  f"Using pretrained weights.", file=sys.stderr)
    else:
        mode = "Kinetics Pretrained (no fine-tuned checkpoint found)"
        print("[CrimeDetector] WARNING: No fine-tuned checkpoint found. "
              "Run train_anomaly.py first for best results.", file=sys.stderr)
        print(f"[CrimeDetector] Searched: {MODEL_SEARCH_PATHS}", file=sys.stderr)

    model = model.to(device)
    model.eval()
    return model, device, categories, mode


# ── Inference ────────────────────────────────────────────────────

def classify_clip(frames_bgr, model, device, categories):
    import torch
    import torch.nn.functional as F

    tensor = preprocess_clip(frames_bgr).to(device)
    with torch.no_grad():
        logits = model(tensor)
    probs = F.softmax(logits, dim=1)[0].cpu().numpy()
    return {cat: float(probs[i]) for i, cat in enumerate(categories)}


def preprocess_clip(frames_bgr):
    import torch
    clips = []
    for frame in frames_bgr:
        frame_rgb     = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        frame_resized = cv2.resize(frame_rgb, (FRAME_SIZE, FRAME_SIZE))
        clips.append(frame_resized)
    arr  = np.stack(clips, axis=0).astype(np.float32) / 255.0
    mean = np.array([0.43216, 0.394666, 0.37645], dtype=np.float32)
    std  = np.array([0.22803, 0.22145,  0.216989], dtype=np.float32)
    arr  = (arr - mean) / std
    return torch.from_numpy(arr).permute(3, 0, 1, 2).unsqueeze(0)


# ── Frame I/O ─────────────────────────────────────────────────────

def read_all_frames(video_path, target_size):
    cap    = cv2.VideoCapture(video_path)
    frames = []
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frames.append(cv2.resize(frame, (target_size, target_size)))
    cap.release()
    return frames


def read_frame_at(video_path, frame_index):
    cap = cv2.VideoCapture(video_path)
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
    ret, frame = cap.read()
    cap.release()
    return frame if ret else None


# ── Helpers ───────────────────────────────────────────────────────

def build_summary(incidents, keyframes, duration, violence_detected, danger_level, avg_people):
    parts = []
    if violence_detected:
        parts.append(f"VIOLENCE DETECTED — Danger Level: {danger_level.upper()}")
        parts.append(f"{len(incidents)} incident(s) detected in {seconds_to_hms(duration)} video")
        critical = [i for i in incidents if i["severity"] == "critical"]
        high     = [i for i in incidents if i["severity"] == "high"]
        if critical: parts.append(f"{len(critical)} critical")
        if high:     parts.append(f"{len(high)} high severity")
    else:
        parts.append("NO VIOLENCE DETECTED — Video is safe")
        parts.append(f"Video duration: {seconds_to_hms(duration)}")
    if avg_people > 0:
        parts.append(f"Average {avg_people} people detected")
    parts.append(f"{len(keyframes)} keyframes saved")
    return ". ".join(parts) + "."


def seconds_to_hms(s):
    h   = int(s // 3600)
    m   = int((s % 3600) // 60)
    sec = int(s % 60)
    return f"{h:02d}:{m:02d}:{sec:02d}"


def _fail(msg):
    print(json.dumps({"error": msg}, ensure_ascii=False))
    sys.exit(1)


if __name__ == "__main__":
    main()





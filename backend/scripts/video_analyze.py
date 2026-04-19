#!/usr/bin/env python3
"""
video_analyze.py — Anomaly / Crime Incident Detection + YOLO Person Counting
=============================================================================
Supports two modes (auto-detected from available checkpoint):

  1. BINARY MODE  (anomaly_classifier.pth present)
     Normal vs Anomaly binary classification.
     Best when you have limited training data.

  2. 14-CLASS MODE  (ucf_crime_classifier.pth present)
     Full UCF-Crime 14 category classification.

  3. FALLBACK  (no checkpoint)
     Uses Kinetics-pretrained R3D-18 as rough proxy.

Additionally uses YOLOv8 for person detection and counting.

Called by videoProcessor.js:
    python video_analyze.py <video_file> <output_dir>

Requirements:
    pip install torch torchvision opencv-python numpy ultralytics

Stdout: JSON result
Exit 0 = success, 1 = error
"""

import sys
import json
import os
import cv2
import numpy as np
from pathlib import Path

# ── Categories ──────────────────────────────────────────────────
CATEGORIES_14 = [
    "Abuse", "Arrest", "Arson", "Assault", "Burglary",
    "Explosion", "Fighting", "Normal", "RoadAccident",
    "Robbery", "Shooting", "Shoplifting", "Stealing", "Vandalism",
]

CATEGORIES_BINARY = ["Normal", "Anomaly"]

SEVERITY_MAP = {
    "Abuse":       "high",
    "Arrest":      "medium",
    "Arson":       "critical",
    "Assault":     "high",
    "Burglary":    "high",
    "Explosion":   "critical",
    "Fighting":    "high",
    "Normal":      "low",
    "RoadAccident":"critical",
    "Robbery":     "critical",
    "Shooting":    "critical",
    "Shoplifting": "medium",
    "Stealing":    "medium",
    "Vandalism":   "medium",
    "Anomaly":     "high",
}

# ── Config ──────────────────────────────────────────────────────
CLIP_LEN              = 16
CLIP_STEP             = 8
FRAME_SIZE            = 112
CONFIDENCE_TH         = 0.55    # Higher threshold to reduce false positives
NORMAL_TH             = 0.70
MIN_INCIDENT_GAP_SEC  = 4.0
MAX_KEYFRAMES         = 20
YOLO_PERSON_CONF      = 0.35    # Confidence threshold for YOLO person detection
YOLO_SAMPLE_INTERVAL  = 30      # Sample every N frames for person counting


def main():
    if len(sys.argv) < 3:
        _fail("Usage: video_analyze.py <video_file> <output_dir>")

    video_path = sys.argv[1]
    output_dir = sys.argv[2]

    if not os.path.isfile(video_path):
        _fail(f"Video file not found: {video_path}")

    os.makedirs(output_dir, exist_ok=True)

    # ── Load crime/anomaly classification model ──────────────────
    model, device, categories, mode = load_model()
    print(f"[CrimeDetector] Mode: {mode} | Classes: {categories}", file=sys.stderr)

    # ── Load YOLO model for person detection ─────────────────────
    yolo_model = load_yolo_model()

    # ── Open video ──────────────────────────────────────────────
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        _fail(f"Cannot open video: {video_path}")

    fps          = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration     = total_frames / fps if fps > 0 else 0
    width        = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height       = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()

    # ── Count people using YOLO on sampled frames ────────────────
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

    # ── Extract clips and classify ───────────────────────────────
    all_frames = read_all_frames(video_path, FRAME_SIZE)
    n_frames   = len(all_frames)

    clip_results = []  # list of (start_frame, scores_dict)

    i = 0
    while i + CLIP_LEN <= n_frames:
        clip   = all_frames[i : i + CLIP_LEN]
        scores = classify_clip(clip, model, device, categories)
        clip_results.append((i, scores))
        i += CLIP_STEP

    # Handle tail clip
    if n_frames > 0 and (len(clip_results) == 0 or clip_results[-1][0] + CLIP_LEN < n_frames):
        tail = all_frames[-CLIP_LEN:] if n_frames >= CLIP_LEN else all_frames
        while len(tail) < CLIP_LEN:
            tail.append(tail[-1])
        start_f = max(0, n_frames - CLIP_LEN)
        scores  = classify_clip(tail, model, device, categories)
        clip_results.append((start_f, scores))

    # ── Build incident list ──────────────────────────────────────
    incidents   = []
    keyframes   = []
    last_ts_per_category = {}

    # Periodic keyframe indices (one every ~10s, up to MAX_KEYFRAMES)
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

        top_cat   = max(scores, key=scores.get)
        top_score = scores[top_cat]

        # Skip clearly normal clips
        if top_cat == "Normal" and top_score >= NORMAL_TH:
            continue

        # Get suspicious (non-Normal) categories above threshold
        suspicious = [
            (cat, sc) for cat, sc in scores.items()
            if cat != "Normal" and sc >= CONFIDENCE_TH
        ]

        if not suspicious:
            continue

        suspicious.sort(key=lambda x: x[1], reverse=True)

        for cat, score in suspicious:
            # Temporal deduplication
            last_ts = last_ts_per_category.get(cat, -9999)
            if ts - last_ts < MIN_INCIDENT_GAP_SEC:
                continue

            last_ts_per_category[cat] = ts
            severity = SEVERITY_MAP.get(cat, "high")

            # Save keyframe — USE ABSOLUTE PATH
            kf_filename = f"frame_{mid_f:06d}.jpg"
            kf_abs_path = os.path.join(output_dir, kf_filename)

            if mid_f not in saved_kf_indices:
                saved_kf_indices.add(mid_f)

            # Always save the incident frame (full resolution)
            raw = read_frame_at(video_path, mid_f)
            if raw is not None:
                cv2.imwrite(kf_abs_path, raw)

            # Get people count for this frame using YOLO
            frame_people_count = 0
            if yolo_model is not None and raw is not None:
                frame_people_count = detect_people_in_frame(yolo_model, raw)

            keyframes.append({
                "frame_index":   mid_f,
                "timestamp":     round(ts, 2),
                "timestamp_str": seconds_to_hms(ts),
                "filename":      kf_filename,
                "path":          kf_abs_path,   # ← ABSOLUTE PATH for report generator
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
                "path":          kf_abs_path,   # ← ABSOLUTE PATH
                "confidence":    round(score, 3),
                "details":       f"{cat} detected with {round(score*100, 1)}% confidence",
                "detections":    [],
                "people_count":  frame_people_count,
            })
            break  # Only report top category per clip

    # ── Save periodic (non-incident) keyframes ───────────────────
    incident_frame_indices = {kf["frame_index"] for kf in keyframes}

    for fi in sorted(saved_kf_indices):
        if fi in incident_frame_indices:
            continue  # Already saved as incident frame
        kf_filename = f"frame_{fi:06d}.jpg"
        kf_abs_path = os.path.join(output_dir, kf_filename)
        raw = read_frame_at(video_path, fi)
        if raw is not None:
            cv2.imwrite(kf_abs_path, raw)

        # Get people count for this frame using YOLO
        frame_people_count = 0
        if yolo_model is not None and raw is not None:
            frame_people_count = detect_people_in_frame(yolo_model, raw)

        keyframes.append({
            "frame_index":   fi,
            "timestamp":     round(fi / fps, 2),
            "timestamp_str": seconds_to_hms(fi / fps),
            "filename":      kf_filename,
            "path":          kf_abs_path,   # ← ABSOLUTE PATH
            "is_incident":   False,
            "people_count":  frame_people_count,
            "detections":    [],
        })

    keyframes.sort(key=lambda x: x["timestamp"])
    incidents.sort(key=lambda x: x["timestamp"])

    # ── Determine violence status and danger level ───────────────
    violence_detected = len(incidents) > 0
    danger_level = compute_danger_level(incidents)

    summary = build_summary(incidents, keyframes, duration, violence_detected, danger_level, avg_people)

    result = {
        "incidents":          incidents,
        "keyframes":          keyframes,
        "summary":            summary,
        "incident_count":     len(incidents),
        "keyframe_count":     len(keyframes),
        "duration":           round(duration, 2),
        "fps":                round(fps, 2),
        "total_frames":       total_frames,
        "resolution":         f"{width}x{height}",
        "avg_people":         avg_people,
        "max_people":         max_people,
        "violence_detected":  violence_detected,
        "danger_level":       danger_level,
        "detection_model":    f"CNN-Crime-Classifier ({mode})",
        "mode":               mode,
    }

    print(json.dumps(result, ensure_ascii=False))
    sys.exit(0)


# ── YOLO Person Detection ────────────────────────────────────────

def load_yolo_model():
    """Load YOLOv8 model for person detection."""
    try:
        from ultralytics import YOLO

        # Look for yolov8n.pt in common locations
        script_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.join(script_dir, "..")
        
        possible_paths = [
            os.path.join(backend_dir, "yolov8n.pt"),
            os.path.join(script_dir, "yolov8n.pt"),
            "yolov8n.pt",  # Will download if not found
        ]

        model_path = None
        for p in possible_paths:
            if os.path.isfile(p):
                model_path = p
                break

        if model_path:
            yolo = YOLO(model_path)
            print(f"[YOLO] Loaded model from: {model_path}", file=sys.stderr)
        else:
            # ultralytics will auto-download yolov8n.pt
            yolo = YOLO("yolov8n.pt")
            print("[YOLO] Auto-downloaded yolov8n.pt", file=sys.stderr)

        return yolo

    except ImportError:
        print("[YOLO] WARNING: ultralytics not installed. Person counting disabled.", file=sys.stderr)
        print("[YOLO] Install with: pip install ultralytics", file=sys.stderr)
        return None
    except Exception as e:
        print(f"[YOLO] WARNING: Failed to load YOLO model: {e}", file=sys.stderr)
        return None


def detect_people_in_frame(yolo_model, frame_bgr):
    """Detect and count people in a single frame using YOLO."""
    try:
        results = yolo_model(frame_bgr, verbose=False, conf=YOLO_PERSON_CONF)
        person_count = 0
        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                # Class 0 = person in COCO dataset
                if cls_id == 0:
                    person_count += 1
        return person_count
    except Exception:
        return 0


def count_people_in_video(video_path, yolo_model, total_frames, sample_interval):
    """Sample frames at intervals and count people in each."""
    counts = []
    cap = cv2.VideoCapture(video_path)

    frame_idx = 0
    while frame_idx < total_frames:
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if not ret:
            break
        count = detect_people_in_frame(yolo_model, frame)
        counts.append(count)
        frame_idx += sample_interval

    cap.release()
    return counts


# ── Danger Level Computation ─────────────────────────────────────

def compute_danger_level(incidents):
    """Compute overall danger level based on incidents."""
    if not incidents:
        return "safe"

    severities = [i["severity"] for i in incidents]

    if "critical" in severities:
        return "critical"
    elif "high" in severities:
        if severities.count("high") >= 3:
            return "critical"
        return "high"
    elif "medium" in severities:
        if severities.count("medium") >= 3:
            return "high"
        return "medium"
    else:
        return "low"


# ── Model loading ─────────────────────────────────────────────────

def load_model():
    """
    Priority order:
      1. anomaly_classifier.pth  → binary Normal vs Anomaly
      2. ucf_crime_classifier.pth → 14-class UCF-Crime
      3. Kinetics pretrained (no fine-tuning, fallback)
    """
    import torch
    import torch.nn as nn
    from torchvision.models.video import r3d_18, R3D_18_Weights

    device     = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    script_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(script_dir, "..", "models")

    binary_ckpt   = os.path.join(models_dir, "anomaly_classifier.pth")
    crime14_ckpt  = os.path.join(models_dir, "ucf_crime_classifier.pth")

    # ── Case 1: Binary anomaly checkpoint ──────────────────────
    if os.path.isfile(binary_ckpt):
        categories = CATEGORIES_BINARY
        model = r3d_18(weights=None)
        in_f  = model.fc.in_features
        model.fc = nn.Sequential(
            nn.Dropout(p=0.5),
            nn.Linear(in_f, 256),
            nn.ReLU(),
            nn.Dropout(p=0.3),
            nn.Linear(256, 2),
        )
        state = torch.load(binary_ckpt, map_location=device)
        model.load_state_dict(state, strict=False)
        print(f"[CrimeDetector] Loaded binary anomaly checkpoint: {binary_ckpt}", file=sys.stderr)
        mode = "Binary Anomaly Detector"

    # ── Case 2: 14-class UCF-Crime checkpoint ──────────────────
    elif os.path.isfile(crime14_ckpt):
        categories = CATEGORIES_14
        model = r3d_18(weights=None)
        in_f  = model.fc.in_features
        model.fc = nn.Linear(in_f, len(categories))
        state = torch.load(crime14_ckpt, map_location=device)
        model.load_state_dict(state, strict=False)
        print(f"[CrimeDetector] Loaded 14-class UCF-Crime checkpoint: {crime14_ckpt}", file=sys.stderr)
        mode = "UCF-Crime 14-class Classifier"

    # ── Case 3: No checkpoint — Kinetics pretrained fallback ───
    else:
        categories = CATEGORIES_14
        model = r3d_18(weights=R3D_18_Weights.DEFAULT)
        in_f  = model.fc.in_features
        model.fc = nn.Linear(in_f, len(categories))
        print("[CrimeDetector] WARNING: No fine-tuned checkpoint found.", file=sys.stderr)
        print("[CrimeDetector] Using Kinetics-pretrained weights (reduced accuracy).", file=sys.stderr)
        print(f"[CrimeDetector] Train a model and place it in: {models_dir}/", file=sys.stderr)
        mode = "Kinetics Pretrained (No Fine-Tuning)"

    model = model.to(device)
    model.eval()
    return model, device, categories, mode


# ── Inference ────────────────────────────────────────────────────

def classify_clip(frames_bgr, model, device, categories):
    import torch
    import torch.nn.functional as F

    tensor = preprocess_clip(frames_bgr)
    tensor = tensor.to(device)

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
    tensor = torch.from_numpy(arr).permute(3, 0, 1, 2).unsqueeze(0)  # (1,3,T,H,W)
    return tensor


# ── Frame I/O ─────────────────────────────────────────────────────

def read_all_frames(video_path, target_size):
    cap    = cv2.VideoCapture(video_path)
    frames = []
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame = cv2.resize(frame, (target_size, target_size))
        frames.append(frame)
    cap.release()
    return frames


def read_frame_at(video_path, frame_index):
    """Read a single frame at given index at FULL resolution for keyframe saving."""
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
        types = list({i["type"] for i in incidents})
        critical = [i for i in incidents if i["severity"] == "critical"]
        high     = [i for i in incidents if i["severity"] == "high"]
        parts.append(f"{len(incidents)} incident(s) detected in {seconds_to_hms(duration)} video")
        if critical:
            parts.append(f"{len(critical)} critical")
        if high:
            parts.append(f"{len(high)} high severity")
        parts.append(f"Types: {', '.join(types)}")
    else:
        parts.append(f"NO VIOLENCE DETECTED — Video is safe")
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
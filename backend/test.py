#!/usr/bin/env python3
"""
flag_suspicious.py — Flags suspicious videos in the normal dataset
===================================================================
Analyzes each video and scores it based on:
- Average brightness (dark scenes = suspicious)
- Motion intensity (high motion = suspicious)
- Scene cuts / flashing (rapid cuts = suspicious)

Moves flagged videos to a review folder so you can check them manually.

Usage:
    python flag_suspicious.py

Output:
    - Prints a report of flagged videos
    - Moves flagged videos to ./video/review_these/
    - Saves a full report to ./video/flag_report.txt
"""

import cv2
import numpy as np
import os
import shutil
from pathlib import Path

# ── Config ───────────────────────────────────────────────────────
NORMAL_DIR   = "./video/data_video_non_violence"
REVIEW_DIR   = "./video/review_these"
REPORT_PATH  = "./video/flag_report.txt"

# Thresholds — tune these if too many / too few flagged
DARK_THRESHOLD        = 60    # Average brightness below this = dark video (0-255)
MOTION_THRESHOLD      = 18.0  # Average frame difference above this = high motion
FLASH_THRESHOLD       = 30.0  # Brightness change between frames = rapid cuts/flashing
SAMPLE_FRAMES         = 30    # How many frames to sample per video (faster)

# A video is flagged if it fails ANY of these checks
# ─────────────────────────────────────────────────────────────────


def analyze_video(video_path, sample_frames=30):
    """
    Returns a dict with:
      - avg_brightness: mean pixel brightness
      - avg_motion: mean absolute difference between consecutive frames
      - avg_flash: mean brightness change between frames
      - duration: video duration in seconds
      - width, height, fps
    """
    cap   = cv2.VideoCapture(str(video_path))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps   = cap.get(cv2.CAP_PROP_FPS) or 25.0
    w     = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h     = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    if total <= 0:
        cap.release()
        return None

    # Sample evenly spaced frames
    indices = np.linspace(0, total - 1, min(sample_frames, total), dtype=int)

    frames      = []
    brightness  = []

    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
        ret, frame = cap.read()
        if not ret:
            continue
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        frames.append(gray)
        brightness.append(np.mean(gray))

    cap.release()

    if len(frames) < 2:
        return None

    # Motion: mean absolute difference between consecutive frames
    motions = []
    flashes = []
    for i in range(1, len(frames)):
        diff   = cv2.absdiff(frames[i], frames[i - 1])
        motions.append(np.mean(diff))
        flashes.append(abs(brightness[i] - brightness[i - 1]))

    return {
        "avg_brightness": float(np.mean(brightness)),
        "avg_motion":     float(np.mean(motions)),
        "avg_flash":      float(np.mean(flashes)),
        "duration":       round(total / fps, 1),
        "width":          w,
        "height":         h,
        "fps":            fps,
    }


def main():
    normal_path = Path(NORMAL_DIR)
    review_path = Path(REVIEW_DIR)
    review_path.mkdir(parents=True, exist_ok=True)

    exts  = {".mp4", ".avi", ".mov", ".mkv", ".wmv"}
    files = sorted([f for f in normal_path.rglob("*") if f.suffix.lower() in exts])

    print(f"Found {len(files)} videos in {NORMAL_DIR}")
    print(f"Analyzing {SAMPLE_FRAMES} frames per video...\n")

    flagged   = []
    clean     = []
    failed    = []

    for i, f in enumerate(files):
        print(f"  [{i+1}/{len(files)}] {f.name}", end="  ", flush=True)

        stats = analyze_video(f, SAMPLE_FRAMES)

        if stats is None:
            print("❌ Could not read")
            failed.append(f.name)
            continue

        reasons = []

        if stats["avg_brightness"] < DARK_THRESHOLD:
            reasons.append(f"dark (brightness={stats['avg_brightness']:.1f})")

        if stats["avg_motion"] > MOTION_THRESHOLD:
            reasons.append(f"high motion ({stats['avg_motion']:.1f})")

        if stats["avg_flash"] > FLASH_THRESHOLD:
            reasons.append(f"rapid cuts/flash ({stats['avg_flash']:.1f})")

        if reasons:
            reason_str = ", ".join(reasons)
            print(f"⚠️  FLAGGED — {reason_str}")
            flagged.append((f.name, reason_str, stats))
        else:
            print(f"✅ OK  (bright={stats['avg_brightness']:.0f} motion={stats['avg_motion']:.1f})")
            clean.append(f.name)

    # ── Move flagged videos to review folder ──
    print(f"\n{'='*60}")
    print(f"Flagged: {len(flagged)} | Clean: {len(clean)} | Failed: {len(failed)}")
    print(f"\nMoving flagged videos to: {REVIEW_DIR}")

    moved = 0
    for name, reason, stats in flagged:
        src = normal_path / name
        dst = review_path / name
        if src.exists():
            shutil.move(str(src), str(dst))
            moved += 1

    print(f"Moved {moved} videos to review folder.")

    # ── Write report ──
    with open(REPORT_PATH, "w", encoding="utf-8") as rep:
        rep.write(f"FLAG REPORT — {NORMAL_DIR}\n")
        rep.write(f"{'='*60}\n")
        rep.write(f"Total videos: {len(files)}\n")
        rep.write(f"Flagged: {len(flagged)}\n")
        rep.write(f"Clean: {len(clean)}\n")
        rep.write(f"Failed to read: {len(failed)}\n\n")

        rep.write(f"FLAGGED VIDEOS (moved to {REVIEW_DIR}):\n")
        rep.write(f"{'-'*60}\n")
        for name, reason, stats in flagged:
            rep.write(f"  {name}\n")
            rep.write(f"    Reason: {reason}\n")
            rep.write(f"    Stats:  brightness={stats['avg_brightness']:.1f}  "
                      f"motion={stats['avg_motion']:.1f}  "
                      f"flash={stats['avg_flash']:.1f}  "
                      f"duration={stats['duration']}s  "
                      f"{stats['width']}x{stats['height']}\n\n")

        rep.write(f"\nFAILED TO READ:\n")
        for name in failed:
            rep.write(f"  {name}\n")

    print(f"\nFull report saved to: {REPORT_PATH}")
    print(f"\nNext steps:")
    print(f"  1. Open '{REVIEW_DIR}' and watch the flagged videos")
    print(f"  2. Delete the ones that look problematic (movie scenes, military, weapons)")
    print(f"  3. Move back any that are actually fine")
    print(f"  4. Retrain: python train_anomaly.py --data_dir ./video --epochs 30 --batch_size 2 --clips_per_video 6")


if __name__ == "__main__":
    main()
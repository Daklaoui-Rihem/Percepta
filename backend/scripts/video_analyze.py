import sys
import json
import os
import cv2
import math
from pathlib import Path

# Incident class mappings from COCO dataset classes
# Map YOLO class names to incident types
INCIDENT_CLASSES = {
    "person": None,
    "knife": "assault",
    "scissors": "assault", 
    "gun": "assault",
    "baseball bat": "assault",
    "fire": "fire",
    "smoke": "fire",
}

SEVERITY_MAP = {
    "assault": "critical",
    "fire": "high",
    "vehicle_collision": "critical",
    "person_accident": "high",
    "crowd": "medium",
    "suspicious": "medium",
    "fall": "high",
}

def main():
    if len(sys.argv) < 3:
        _fail("Usage: video_analyze.py <video_file> <output_dir>")

    video_path = sys.argv[1]
    output_dir = sys.argv[2]

    if not os.path.isfile(video_path):
        _fail(f"Video file not found: {video_path}")

    os.makedirs(output_dir, exist_ok=True)

    # Load video metadata first
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        _fail(f"Cannot open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0
    width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()

    # Try YOLO detection, fall back to frame-only extraction
    try:
        result = run_yolo_detection(video_path, output_dir, fps, total_frames, duration)
    except ImportError:
        result = run_frame_extraction_only(video_path, output_dir, fps, total_frames, duration)
    except Exception as e:
        result = run_frame_extraction_only(video_path, output_dir, fps, total_frames, duration)
        result["detection_note"] = f"YOLO unavailable, frame extraction only: {str(e)}"

    result["duration"] = round(duration, 2)
    result["fps"] = round(fps, 2)
    result["total_frames"] = total_frames
    result["resolution"] = f"{width}x{height}"

    print(json.dumps(result, ensure_ascii=False))
    sys.exit(0)


def run_yolo_detection(video_path, output_dir, fps, total_frames, duration):
    from ultralytics import YOLO

    model = YOLO("yolov8n.pt")   # nano — fast, downloads ~6MB on first run

    incidents = []
    keyframes = []
    person_counts = []

    # Sample one frame per second
    sample_interval = max(1, int(fps))
    cap = cv2.VideoCapture(video_path)
    frame_idx = 0
    saved_count = 0
    vehicle_classes = {"car", "truck", "motorcycle", "bicycle", "bus"}
    prev_vehicle_boxes = []
    recent_gray_frames = []

    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        recent_gray_frames.append(gray)
        if len(recent_gray_frames) > 2:
            recent_gray_frames.pop(0)

        if frame_idx % sample_interval == 0:
            timestamp = frame_idx / fps
            results = model(frame, verbose=False, conf=0.4)

            detections = []
            person_count = 0
            incident_found = None

            for r in results:
                for box in r.boxes:
                    cls_name = model.names[int(box.cls[0])]
                    conf     = float(box.conf[0])
                    x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]

                    if cls_name == "person":
                        person_count += 1

                    incident_type = INCIDENT_CLASSES.get(cls_name)
                    if incident_type:
                        incident_found = incident_type

                    detections.append({
                        "class": cls_name,
                        "confidence": round(conf, 3),
                        "bbox": [x1, y1, x2, y2],
                    })

            person_counts.append(person_count)

            vehicle_boxes = [d for d in detections if d["class"] in vehicle_classes]
            persons = [d for d in detections if d["class"] == "person"]

            # Detect vehicle overlap/collision (boxes significantly overlapping)
            if len(vehicle_boxes) >= 2:
                for i in range(len(vehicle_boxes)):
                    for j in range(i+1, len(vehicle_boxes)):
                        if boxes_overlap(vehicle_boxes[i]["bbox"], vehicle_boxes[j]["bbox"], threshold=0.15):
                            incident_found = "vehicle_collision"

            # Detect person on ground near vehicles (person bbox much lower than vehicles)
            if persons and vehicle_boxes and incident_found is None:
                for person in persons:
                    px1, py1, px2, py2 = person["bbox"]
                    person_area = (px2-px1) * (py2-py1)
                    if person_area < 5000:  # small/fallen person
                        incident_found = "person_accident"

            # Detect close person interaction with HIGH TEMPORAL MOTION (action recognition proxy)
            if len(persons) >= 2 and incident_found is None:
                for i in range(len(persons)):
                    for j in range(i+1, len(persons)):
                        if boxes_overlap(persons[i]["bbox"], persons[j]["bbox"], threshold=0.08):
                            # Calculate intersection bounding box
                            bx1 = max(persons[i]["bbox"][0], persons[j]["bbox"][0])
                            by1 = max(persons[i]["bbox"][1], persons[j]["bbox"][1])
                            bx2 = min(persons[i]["bbox"][2], persons[j]["bbox"][2])
                            by2 = min(persons[i]["bbox"][3], persons[j]["bbox"][3])
                            
                            # Check rapid motion within intersection (fighting vs hugging)
                            if bx2 > bx1 and by2 > by1 and len(recent_gray_frames) >= 2:
                                roi_curr = recent_gray_frames[-1][by1:by2, bx1:bx2]
                                roi_prev = recent_gray_frames[-2][by1:by2, bx1:bx2]
                                
                                diff = cv2.absdiff(roi_curr, roi_prev)
                                motion_score = float(cv2.mean(diff)[0])
                                
                                # Significant motion in overlap = Active Assault/Struggle
                                if motion_score > 6.0:
                                    incident_found = "assault"

            # Save keyframe if incident detected or at regular intervals (every 30s)
            is_incident_frame = incident_found is not None
            is_periodic       = saved_count < 10 and frame_idx % (int(fps) * 30) == 0

            if is_incident_frame or is_periodic or saved_count == 0:
                frame_filename = f"frame_{frame_idx:06d}.jpg"
                frame_path     = os.path.join(output_dir, frame_filename)

                # Draw bounding boxes on saved frame
                annotated = frame.copy()
                for det in detections:
                    x1, y1, x2, y2 = det["bbox"]
                    color = (0, 0, 255) if INCIDENT_CLASSES.get(det["class"]) else (0, 200, 0)
                    cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
                    label = f"{det['class']} {det['confidence']:.2f}"
                    cv2.putText(annotated, label, (x1, y1 - 8),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
                cv2.imwrite(frame_path, annotated)

                keyframes.append({
                    "frame_index":   frame_idx,
                    "timestamp":     round(timestamp, 2),
                    "timestamp_str": seconds_to_hms(timestamp),
                    "path":          frame_path,
                    "filename":      frame_filename,
                    "detections":    detections,
                    "is_incident":   is_incident_frame,
                    "people_count":  person_count,
                })
                saved_count += 1

            if is_incident_frame:
                severity = SEVERITY_MAP.get(incident_found, "medium")

                # Avoid duplicate incidents within 5 seconds
                last_ts = incidents[-1]["timestamp"] if incidents else -999
                if timestamp - last_ts > 5:
                    incidents.append({
                        "type":          incident_found,
                        "severity":      severity,
                        "timestamp":     round(timestamp, 2),
                        "timestamp_str": seconds_to_hms(timestamp),
                        "frame_index":   frame_idx,
                        "frame_file":    frame_filename,
                        "detections":    detections,
                    })

        frame_idx += 1

    cap.release()

    # Crowd detection: flag if avg > 5 people for sustained period
    if person_counts:
        avg_people = sum(person_counts) / len(person_counts)
        max_people = max(person_counts)
        if max_people >= 8 and not any(i["type"] == "crowd" for i in incidents):
            incidents.insert(0, {
                "type":          "crowd",
                "severity":      "medium",
                "timestamp":     0,
                "timestamp_str": "00:00:00",
                "frame_index":   0,
                "details":       f"Max {max_people} people detected, avg {avg_people:.1f}",
            })

    summary = build_summary(incidents, keyframes, duration)

    return {
        "incidents":       incidents,
        "keyframes":       keyframes,
        "summary":         summary,
        "incident_count":  len(incidents),
        "keyframe_count":  len(keyframes),
        "avg_people":      round(sum(person_counts)/len(person_counts), 1) if person_counts else 0,
        "detection_model": "yolov8n",
    }

def boxes_overlap(box1, box2, threshold=0.1):
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])
    if x2 <= x1 or y2 <= y1:
        return False
    intersection = (x2-x1) * (y2-y1)
    area1 = (box1[2]-box1[0]) * (box1[3]-box1[1])
    area2 = (box2[2]-box2[0]) * (box2[3]-box2[1])
    union = area1 + area2 - intersection
    return (intersection / union) > threshold


def run_frame_extraction_only(video_path, output_dir, fps, total_frames, duration):
    """Fallback: extract key frames without YOLO (no detection boxes)."""
    cap = cv2.VideoCapture(video_path)
    keyframes = []
    interval = max(1, int(fps * 10))   # one frame every 10 seconds
    frame_idx = 0
    saved = 0

    while saved < 12:
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if not ret:
            break

        timestamp = frame_idx / fps
        fname = f"frame_{frame_idx:06d}.jpg"
        fpath = os.path.join(output_dir, fname)
        cv2.imwrite(fpath, frame)

        keyframes.append({
            "frame_index":   frame_idx,
            "timestamp":     round(timestamp, 2),
            "timestamp_str": seconds_to_hms(timestamp),
            "path":          fpath,
            "filename":      fname,
            "detections":    [],
            "is_incident":   False,
            "people_count":  0,
        })
        saved += 1
        frame_idx += interval

    cap.release()

    return {
        "incidents":       [],
        "keyframes":       keyframes,
        "summary":         f"Frame extraction completed. {len(keyframes)} keyframes saved. Install ultralytics for incident detection.",
        "incident_count":  0,
        "keyframe_count":  len(keyframes),
        "avg_people":      0,
        "detection_model": "frame_extraction_only",
    }


def build_summary(incidents, keyframes, duration):
    if not incidents:
        return f"No incidents detected in {seconds_to_hms(duration)} video. {len(keyframes)} keyframes extracted."

    types = list({i["type"] for i in incidents})
    critical = [i for i in incidents if i["severity"] == "critical"]

    parts = [f"{len(incidents)} incident(s) detected"]
    if critical:
        parts.append(f"{len(critical)} critical")
    parts.append(f"Types: {', '.join(types)}")
    parts.append(f"{len(keyframes)} keyframes saved")
    return ". ".join(parts) + "."


def seconds_to_hms(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


def _fail(msg):
    print(json.dumps({"error": msg}, ensure_ascii=False))
    sys.exit(1)


if __name__ == "__main__":
    main()
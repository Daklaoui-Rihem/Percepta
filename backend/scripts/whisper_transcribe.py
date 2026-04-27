#!/usr/bin/env python3
import sys
import json
import os
import math
import re
from collections import Counter


def main():
    if len(sys.argv) < 2:
        _fail("Usage: whisper_transcribe.py <file_path> [language]")

    file_path = sys.argv[1]
    language  = sys.argv[2] if len(sys.argv) > 2 else "auto"
    if language == "auto":
        language = None

    if not os.path.isfile(file_path):
        _fail(f"File not found: {file_path}")

    try:
        import whisper
        model = whisper.load_model("large-v3-turbo")
    except Exception as e:
        _fail(f"Failed to load Whisper model: {e}")

    try:
        import warnings
        warnings.filterwarnings("ignore")
        import contextlib
        import io 
        f = io.StringIO()
        with contextlib.redirect_stdout(f):
            result_raw = model.transcribe(
                file_path,
                language=language,
                beam_size=5,
                verbose=False,
            )

        segments   = []
        text_parts = []
        total_prob = 0.0
        num_segments = 0

        for seg in result_raw["segments"]:
            text_parts.append(seg["text"].strip())
            segments.append({
                "start": round(seg["start"], 2),
                "end":   round(seg["end"],   2),
                "text":  seg["text"].strip(),
            })
            total_prob += seg.get("avg_logprob", 0)
            num_segments += 1

        if num_segments > 0:
            avg_logprob = total_prob / num_segments
            confidence = round(max(0.0, min(1.0, math.exp(avg_logprob))) * 100, 1)
        else:
            confidence = 0.0
        avg_confidence = confidence
        full_text = " ".join(text_parts)

    except Exception as e:
        _fail(f"Transcription failed: {e}")

    result = {
        "text":     full_text,
        "language": result_raw.get("language", "fr"),
        "duration": round(result_raw.get("duration", 0), 1),
        "confidence": avg_confidence,
        "segments": segments,
    }
    print(json.dumps(result, ensure_ascii=False))
    sys.exit(0)





def _fail(msg: str):
    print(json.dumps({"error": msg}, ensure_ascii=False))
    sys.exit(1)


if __name__ == "__main__":
    main()
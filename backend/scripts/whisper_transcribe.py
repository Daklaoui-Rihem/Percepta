#!/usr/bin/env python3
"""
whisper_transcribe.py  —  Tuned for NVIDIA RTX 2050 (4 GB VRAM)

Called by audioProcessor.js as a child process:
    python whisper_transcribe.py <file_path> [language]

Arguments:
    file_path   absolute path to the audio file
    language    optional: 'fr' | 'en' | 'ar' | 'auto'  (default: auto)

Stdout on success  — one JSON line:
    {
      "text":     "full transcription...",
      "language": "fr",
      "duration": 123.4,
      "segments": [{"start": 0.0, "end": 3.2, "text": "..."}]
    }

Stdout on error  — one JSON line:
    {"error": "description of what went wrong"}

Exit code 0 = success, 1 = error.

RTX 2050 notes:
  - 4 GB VRAM  →  compute_type="int8"  (not float16, that needs ~3.2 GB)
  - int8 is ~5% less accurate than float16 but the difference is imperceptible
    for real speech; accuracy is still far above whisper-medium
  - Model size on disk: ~1.6 GB, downloaded once to
    C:\\Users\\<you>\\AppData\\Local\\huggingface\\hub\\  (Windows cache)
"""

import sys
import json
import os


def main():
    # ── Arguments ──────────────────────────────────────────────
    if len(sys.argv) < 2:
        _fail("Usage: whisper_transcribe.py <file_path> [language]")

    file_path = sys.argv[1]
    language  = sys.argv[2] if len(sys.argv) > 2 else "auto"
    if language == "auto":
        language = None          # None = Whisper auto-detects

    # ── File check ─────────────────────────────────────────────
    if not os.path.isfile(file_path):
        _fail(f"File not found: {file_path}")

    # ── Load model ─────────────────────────────────────────────
    # First call downloads the model (~1.6 GB).
    # Subsequent calls load from disk in ~3-5 seconds.
    #
    # compute_type="int8"
    #   RTX 2050 has 4 GB VRAM.  float16 needs ~3.2 GB and leaves no headroom
    #   for the rest of Windows — you WILL get CUDA out-of-memory errors.
    #   int8 uses ~2 GB VRAM, runs fast, and accuracy is nearly identical.
    #
    # device="cuda", device_index=0
    #   Forces GPU use.  If you ever get a CUDA error, change to device="cpu"
    #   temporarily to confirm the file itself isn't the problem.
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel(
            "large-v3-turbo",
            device="cuda",
            device_index=0,
            compute_type="int8",       # ← critical for 4 GB VRAM
            num_workers=1,
        )
    except Exception as e:
        _fail(f"Failed to load Whisper model: {e}")

    # ── Transcribe ─────────────────────────────────────────────
    # vad_filter=True  strips silence before processing — speeds up
    # meeting recordings that have long quiet gaps between speakers.
    #
    # beam_size=5  is Whisper's default and gives best accuracy.
    # Lower to beam_size=1 only if you need faster turnaround.
    try:
        segments_iter, info = model.transcribe(
            file_path,
            language=language,
            beam_size=5,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 500},
            word_timestamps=False,
        )

        segments   = []
        text_parts = []

        for seg in segments_iter:           # generator — must consume
            text_parts.append(seg.text.strip())
            segments.append({
                "start": round(seg.start, 2),
                "end":   round(seg.end,   2),
                "text":  seg.text.strip(),
            })

    except Exception as e:
        _fail(f"Transcription failed: {e}")

    # ── Output ─────────────────────────────────────────────────
    result = {
        "text":     " ".join(text_parts),
        "language": info.language,           # detected or forced
        "duration": round(info.duration, 1),
        "segments": segments,
    }
    # ensure_ascii=False keeps Arabic / French characters intact
    print(json.dumps(result, ensure_ascii=False))
    sys.exit(0)


def _fail(msg: str):
    print(json.dumps({"error": msg}, ensure_ascii=False))
    sys.exit(1)


if __name__ == "__main__":
    main()
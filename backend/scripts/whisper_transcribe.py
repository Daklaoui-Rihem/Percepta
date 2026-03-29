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
import math
import re
from collections import Counter


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
            vad_filter=False,
            condition_on_previous_text=False,
            word_timestamps=False,
        )

        segments   = []
        text_parts = []
        total_prob = 0.0
        num_segments = 0

        for seg in segments_iter:           # generator — must consume
            text_parts.append(seg.text.strip())
            segments.append({
                "start": round(seg.start, 2),
                "end":   round(seg.end,   2),
                "text":  seg.text.strip(),
            })
            total_prob += math.exp(seg.avg_logprob)
            num_segments += 1
            
        avg_confidence = round((total_prob / num_segments) * 100, 1) if num_segments > 0 else 0.0

        # ── Local Extractive Summary ──
        full_text = " ".join(text_parts)
        summary = generate_summary(full_text)

    except Exception as e:
        _fail(f"Transcription failed: {e}")

    # ── Output ─────────────────────────────────────────────────
    result = {
        "text":     full_text,
        "language": info.language,           # detected or forced
        "duration": round(info.duration, 1),
        "confidence": avg_confidence,
        "summary": summary,
        "segments": segments,
    }
    # ensure_ascii=False keeps Arabic / French characters intact
    print(json.dumps(result, ensure_ascii=False))
    sys.exit(0)


def generate_summary(text, top_n=3):
    """
    Extractive summarization using word frequency.
    Works for EN, FR, AR without needing heavy NLTK models.
    Updated to handle unpunctuated songs by fallback chunking.
    """
    if not text or len(text) < 50:
        return text

    # 1. Split into processing units (sentences or chunks)
    # Try splitting by punctuation first
    units = [u.strip() for u in re.split(r'(?<=[.!?؟])\s+', text.strip()) if u.strip()]
    
    # If no punctuation (less than top_n units found), split by fixed length chunks (around 15 words)
    # This is critical for lyrics/songs where Whisper often doesn't add periods.
    if len(units) < top_n + 1:
        words_only = text.strip().split()
        if not words_only: return text
        chunk_size = 18
        units = [" ".join(words_only[i:i+chunk_size]) for i in range(0, len(words_only), chunk_size)]

    if len(units) <= top_n:
        return text

    # 2. Score words by frequency using a broader multilingual stop set
    words = re.findall(r'\w+', text.lower())
    stops = {
        'the', 'and', 'is', 'a', 'to', 'in', 'it', 'of', 'for', 'with', 'that', 'this', 'on', 'was', 'be', 'at', 'as', 'but',
        'le', 'la', 'les', 'des', 'est', 'un', 'une', 'dans', 'pour', 'qui', 'avec', 'sur', 'du', 'au', 'ce', 'se', 'que',
        'في', 'من', 'على', 'ان', 'هذا', 'كان', 'إلى', 'مع', 'عن', 'ما', 'لو', 'لا', 'يا', 'هو', 'هي', 'ني', 'لي'
    }
    
    filtered = [w for w in words if w not in stops and len(w) > 2]
    if not filtered:
        # Fallback if text is entirely common words: take spread of sentences
        step = len(units) // top_n
        return "... ".join([units[i*step] for i in range(top_n)])

    freqs = Counter(filtered)
    
    # 3. Score units by summing word frequencies
    scores = []
    for u in units:
        u_words = re.findall(r'\w+', u.lower())
        if not u_words:
            scores.append(0)
            continue
        # Base score from word frequency
        word_score = sum(freqs.get(w, 0) for w in u_words)
        # Length penalty (we want dense phrases, not just long ones)
        normalized_score = word_score / (math.log(len(u_words) + 2))
        scores.append(normalized_score)

    # 4. Smart selection:
    # Instead of just top N scores (which might all be the same chorus line),
    # we pick the highest scoring sentences from different parts of the file.
    part_size = len(units) // top_n
    selected_indices = []
    for i in range(top_n):
        start = i * part_size
        end = (i + 1) * part_size if i < top_n - 1 else len(units)
        part_scores = scores[start:end]
        if part_scores:
            best_in_part = start + part_scores.index(max(part_scores))
            selected_indices.append(best_in_part)

    # Ensure uniqueness and return sorted output
    final_indices = sorted(list(set(selected_indices)))
    summary_pts = [units[i].strip() for i in final_indices]
    
    # Combine with ellipsis if we had to chunk it
    separator = "... " if len(units) > 10 else " "
    return separator.join(summary_pts)


def _fail(msg: str):
    print(json.dumps({"error": msg}, ensure_ascii=False))
    sys.exit(1)


if __name__ == "__main__":
    main()
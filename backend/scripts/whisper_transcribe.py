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
        summary = generate_summary(full_text)

    except Exception as e:
        _fail(f"Transcription failed: {e}")

    result = {
        "text":     full_text,
        "language": result_raw.get("language", "fr"),
        "duration": round(result_raw.get("duration", 0), 1),
        "confidence": avg_confidence,
        "summary": summary,
        "segments": segments,
    }
    print(json.dumps(result, ensure_ascii=False))
    sys.exit(0)


def generate_summary(text, top_n=3):
    if not text or len(text) < 50:
        return text

    units = [u.strip() for u in re.split(r'(?<=[.!?؟])\s+', text.strip()) if u.strip()]

    if len(units) < top_n + 1:
        words_only = text.strip().split()
        if not words_only: return text
        chunk_size = 18
        units = [" ".join(words_only[i:i+chunk_size]) for i in range(0, len(words_only), chunk_size)]

    if len(units) <= top_n:
        return text

    words = re.findall(r'\w+', text.lower())
    stops = {
        'the', 'and', 'is', 'a', 'to', 'in', 'it', 'of', 'for', 'with', 'that', 'this', 'on', 'was', 'be', 'at', 'as', 'but',
        'le', 'la', 'les', 'des', 'est', 'un', 'une', 'dans', 'pour', 'qui', 'avec', 'sur', 'du', 'au', 'ce', 'se', 'que',
        'في', 'من', 'على', 'ان', 'هذا', 'كان', 'إلى', 'مع', 'عن', 'ما', 'لو', 'لا', 'يا', 'هو', 'هي', 'ني', 'لي'
    }

    filtered = [w for w in words if w not in stops and len(w) > 2]
    if not filtered:
        step = len(units) // top_n
        return "... ".join([units[i*step] for i in range(top_n)])

    freqs = Counter(filtered)

    scores = []
    for u in units:
        u_words = re.findall(r'\w+', u.lower())
        if not u_words:
            scores.append(0)
            continue
        word_score = sum(freqs.get(w, 0) for w in u_words)
        normalized_score = word_score / (math.log(len(u_words) + 2))
        scores.append(normalized_score)

    part_size = len(units) // top_n
    selected_indices = []
    for i in range(top_n):
        start = i * part_size
        end = (i + 1) * part_size if i < top_n - 1 else len(units)
        part_scores = scores[start:end]
        if part_scores:
            best_in_part = start + part_scores.index(max(part_scores))
            selected_indices.append(best_in_part)

    final_indices = sorted(list(set(selected_indices)))
    summary_pts = [units[i].strip() for i in final_indices]
    separator = "... " if len(units) > 10 else " "
    return separator.join(summary_pts)


def _fail(msg: str):
    print(json.dumps({"error": msg}, ensure_ascii=False))
    sys.exit(1)


if __name__ == "__main__":
    main()
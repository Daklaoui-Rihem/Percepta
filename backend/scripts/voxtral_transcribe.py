#!/usr/bin/env python3
"""
voxtral_transcribe.py — Transcription via Mistral Voxtral API

Appelé par audioProcessor.js comme processus enfant :
    python voxtral_transcribe.py <file_path> [language]

Arguments:
    file_path   chemin absolu vers le fichier audio
    language    optionnel: 'fr' | 'en' | 'ar' | 'auto' (défaut: auto)

Stdout en cas de succès — une ligne JSON:
    {
      "text":       "transcription complète...",
      "language":   "fr",
      "duration":   123.4,
      "confidence": 85.0,
      "summary":    "résumé extrait...",
      "segments":   []
    }

Stdout en cas d'erreur:
    {"error": "description de l'erreur"}

Exit code 0 = succès, 1 = erreur.

Installation: pip install mistralai
"""

import sys
import json
import os
import base64
import re
import math
from collections import Counter
from xmlrpc import client
def detect_language_from_text(text: str) -> str:
    """Simple heuristic language detection from transcribed text."""
    if not text:
        return "fr"

    import re
    arabic_chars = len(re.findall(r'[\u0600-\u06FF]', text))
    total_chars = len(text.replace(' ', ''))

    if total_chars == 0:
        return "fr"

    if arabic_chars / total_chars > 0.2:
        return "ar"

    french_words = ['je', 'vous', 'nous', 'est', 'les', 'des', 'une', 'pour',
                    'avec', 'dans', 'sur', 'qui', 'que', 'bonjour', 'merci']
    english_words = ['the', 'and', 'is', 'are', 'you', 'have', 'this', 'that',
                     'with', 'for', 'hello', 'please', 'thank']

    text_lower = text.lower()
    fr_score = sum(1 for w in french_words if f' {w} ' in f' {text_lower} ')
    en_score = sum(1 for w in english_words if f' {w} ' in f' {text_lower} ')

    if fr_score > en_score:
        return "fr"
    elif en_score > fr_score:
        return "en"
    else:
        return "fr"  # default to French for your use case

def main():
    # ── Arguments ──────────────────────────────────────────
    if len(sys.argv) < 2:
        _fail("Usage: voxtral_transcribe.py <file_path> [language]")

    file_path = sys.argv[1]
    language  = sys.argv[2] if len(sys.argv) > 2 else "auto"

    # ── Vérification du fichier ────────────────────────────
    if not os.path.isfile(file_path):
        _fail(f"Fichier introuvable: {file_path}")

    # ── Clé API ────────────────────────────────────────────
    api_key = os.environ.get("MISTRAL_API_KEY", "")
    if not api_key:
        _fail("MISTRAL_API_KEY manquante dans les variables d'environnement")

    # ── Vérification de la taille (limite API: ~50MB encodé en base64) ──
    file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
    if file_size_mb > 35:
        _fail(f"Fichier trop grand pour Voxtral API: {file_size_mb:.1f}MB (max ~35MB)")

    # ── Lecture et encodage du fichier audio ───────────────
    try:
        with open(file_path, "rb") as f:
            audio_bytes = f.read()
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
    except Exception as e:
        _fail(f"Impossible de lire le fichier audio: {e}")

    # ── Déterminer le type MIME ────────────────────────────
    ext = os.path.splitext(file_path)[1].lower()
    mime_types = {
        ".mp3":  "audio/mpeg",
        ".wav":  "audio/wav",
        ".m4a":  "audio/mp4",
        ".ogg":  "audio/ogg",
        ".mpeg": "audio/mpeg",
        ".mpga": "audio/mpeg",
        ".webm": "audio/webm",
        ".flac": "audio/flac",
    }
    mime_type = mime_types.get(ext, "audio/mpeg")

    # ── Appel API Mistral Voxtral ──────────────────────────
    try:
        from mistralai.client import Mistral
        client = Mistral(api_key=api_key)
        with open(file_path, "rb") as f:
            audio_bytes = f.read()
            response = client.audio.transcriptions.complete(
                model="voxtral-mini-2602",
                file={
                    "file_name": os.path.basename(file_path),
                    "content": audio_bytes
                    },
                language=None if language == "auto" else language,
                )

        transcribed_text = response.text.strip()

        # Try to get language from response, otherwise detect from text
        detected_language = getattr(response, "language", None)
        if not detected_language or detected_language == "auto":
            detected_language = detect_language_from_text(transcribed_text)

    except ImportError as e:
        _fail(f"ImportError: {str(e)}")
    except Exception as e:
        error_msg = str(e)
        if "401" in error_msg or "Unauthorized" in error_msg:
            _fail("Clé API Mistral invalide. Vérifie MISTRAL_API_KEY dans ton .env")
        elif "429" in error_msg or "rate" in error_msg.lower():
            _fail("Limite de rate atteinte sur l'API Mistral. Réessaie dans quelques secondes.")
        elif "413" in error_msg or "too large" in error_msg.lower():
            _fail(f"Fichier audio trop grand pour l'API Mistral ({file_size_mb:.1f}MB)")
        else:
            _fail(f"Erreur API Mistral: {error_msg}")

    # ── Construction du résultat ───────────────────────────
    # Voxtral ne retourne pas duration/segments comme Whisper
    # On estime la durée depuis le fichier si possible
    duration = estimate_duration(file_path)
    summary  = generate_summary(transcribed_text, duration)

    result = {
        "text":       transcribed_text,
        "language":   detected_language,
        "duration":   round(duration, 1),
        "confidence": 90.0,   # Voxtral ne donne pas de score, on met une valeur fixe
        "summary":    summary,
        "segments":   [],     # Voxtral ne retourne pas de segments horodatés
    }

    print(json.dumps(result, ensure_ascii=False))
    sys.exit(0)


def estimate_duration(file_path: str) -> float:
    """Tente d'estimer la durée audio via mutagen ou retourne 0."""
    try:
        from mutagen import File as MutagenFile
        audio = MutagenFile(file_path)
        if audio and hasattr(audio.info, "length"):
            return float(audio.info.length)
    except Exception:
        pass
    return 0.0


def generate_summary(text: str, duration_sec: float = 0) -> str:
    """Résumé extractif simple — même logique que whisper_transcribe.py."""
    if not text or len(text) < 50:
        return text

    top_n = 3
    units = [u.strip() for u in re.split(r'(?<=[.!?؟])\s+', text.strip()) if u.strip()]

    if len(units) < top_n + 1:
        words_only = text.strip().split()
        if not words_only:
            return text
        chunk_size = 18
        units = [" ".join(words_only[i:i+chunk_size]) for i in range(0, len(words_only), chunk_size)]

    if len(units) <= top_n:
        return text

    words = re.findall(r'\w+', text.lower())
    stops = {
        'the','and','is','a','to','in','it','of','for','with','that','this','on','was',
        'le','la','les','des','est','un','une','dans','pour','qui','avec','sur','du','au',
        'في','من','على','ان','هذا','كان','إلى','مع','عن'
    }
    filtered = [w for w in words if w not in stops and len(w) > 2]
    if not filtered:
        return text

    freqs = Counter(filtered)
    scores = []
    for u in units:
        u_words = re.findall(r'\w+', u.lower())
        if not u_words:
            scores.append(0)
            continue
        word_score = sum(freqs.get(w, 0) for w in u_words)
        normalized  = word_score / (math.log(len(u_words) + 2))
        scores.append(normalized)

    part_size = len(units) // top_n
    selected  = []
    for i in range(top_n):
        start = i * part_size
        end   = (i + 1) * part_size if i < top_n - 1 else len(units)
        part_scores = scores[start:end]
        if part_scores:
            best = start + part_scores.index(max(part_scores))
            selected.append(best)

    final = sorted(list(set(selected)))
    parts = [units[i].strip() for i in final]
    return "... ".join(parts)


def _fail(msg: str):
    print(json.dumps({"error": msg}, ensure_ascii=False))
    sys.exit(1)


if __name__ == "__main__":
    main()
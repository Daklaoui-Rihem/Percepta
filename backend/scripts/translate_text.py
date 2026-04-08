#!/usr/bin/env python3
"""
translate_text.py — Translates text using deep-translator (Google Translate API wrapper)
                    Falls back to a simple message if the package is not installed.

Called by audioProcessor.js after transcription:
    python translate_text.py <source_lang> <target_lang> <text_file_path>

Arguments:
    source_lang   detected language code: 'fr', 'en', 'ar', or 'auto'
    target_lang   target language code:   'fr', 'en', 'ar'
    text_file     path to a UTF-8 text file containing the text to translate
                  (using a file avoids command-line length limits for long texts)

Stdout on success:
    {"translated": "the translated text here..."}

Stdout on error:
    {"error": "description"}

Exit code 0 = success, 1 = error.

Install requirement:
    pip install deep-translator
"""

import sys
import json
import os

# Map our internal codes to deep-translator language names
LANG_MAP = {
    'fr': 'french',
    'en': 'english',
    'ar': 'arabic',
}

def main():
    if len(sys.argv) < 4:
        _fail("Usage: translate_text.py <source_lang> <target_lang> <text_file>")

    source_lang = sys.argv[1].lower()
    target_lang = sys.argv[2].lower()
    text_file   = sys.argv[3]

    # Read text from file
    if not os.path.isfile(text_file):
        _fail(f"Text file not found: {text_file}")

    with open(text_file, 'r', encoding='utf-8') as f:
        text = f.read().strip()

    if not text:
        _fail("Text file is empty")

    # Normalize language codes
    source = LANG_MAP.get(source_lang, 'auto')
    target = LANG_MAP.get(target_lang)

    if not target:
        _fail(f"Unsupported target language: {target_lang}. Supported: fr, en, ar")

    # If source == target, no translation needed
    if source != 'auto' and source == target:
        print(json.dumps({"translated": text}, ensure_ascii=False))
        sys.exit(0)

    try:
        from deep_translator import GoogleTranslator
    except ImportError:
        _fail(
            "deep-translator is not installed. "
            "Run: pip install deep-translator"
        )

    try:
        # Google Translate has a ~5000 char limit per request, so chunk if needed
        translated = translate_chunked(text, source, target)
        print(json.dumps({"translated": translated}, ensure_ascii=False))
        sys.exit(0)

    except Exception as e:
        _fail(f"Translation failed: {e}")


def translate_chunked(text: str, source: str, target: str, chunk_size: int = 4500) -> str:
    """
    Splits text into chunks at sentence boundaries and translates each chunk.
    Reassembles in order.
    """
    from deep_translator import GoogleTranslator

    if len(text) <= chunk_size:
        translator = GoogleTranslator(source=source, target=target)
        return translator.translate(text)

    # Split into sentences, then group into chunks
    import re
    sentences = re.split(r'(?<=[.!?؟\n])\s+', text.strip())
    chunks = []
    current = ""

    for sentence in sentences:
        if len(current) + len(sentence) + 1 <= chunk_size:
            current += (" " if current else "") + sentence
        else:
            if current:
                chunks.append(current)
            current = sentence

    if current:
        chunks.append(current)

    translator = GoogleTranslator(source=source, target=target)
    translated_parts = []

    for chunk in chunks:
        if chunk.strip():
            translated_parts.append(translator.translate(chunk))

    return " ".join(translated_parts)


def _fail(msg: str):
    print(json.dumps({"error": msg}, ensure_ascii=False))
    sys.exit(1)


if __name__ == "__main__":
    main()
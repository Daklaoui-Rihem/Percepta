#!/usr/bin/env python3
"""
extract_entities.py — Extracts structured key information from transcribed text.

Designed for emergency/incident call transcriptions (911, SAMU, police, etc.)
Supports Arabic, French, and English.

Called by audioProcessor.js after Whisper transcription:
    python extract_entities.py <text_file> <language>

Arguments:
    text_file   path to a UTF-8 text file containing the transcription
    language    detected language code: 'fr', 'en', 'ar', or 'auto'

Stdout on success:
    {
      "location": "Rue de la Paix, Paris",
      "phones": ["+33612345678", "15"],
      "people_count": 3,
      "incident_type": "Accident de voiture",
      "severity": "high",
      "victim_names": ["Jean", "Marie"],
      "caller_name": "Ahmed",
      "date_mentioned": "ce matin",
      "time_mentioned": "14h30",
      "additional_details": "Deux blessés graves, un léger",
      "confidence": 0.87
    }

Stdout on error:
    {"error": "description"}

Exit code 0 = success, 1 = error.

Requirements:
    pip install anthropic
    OR
    pip install openai
    (set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env)

Falls back to rule-based extraction if no API key is available.
"""

import sys
import json
import os
import re

# ── Language configs ───────────────────────────────────────────
PROMPTS = {
    'fr': """Tu es un assistant d'analyse d'appels d'urgence. Analyse la transcription suivante et extrais les informations clés.

Transcription:
{text}

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans backticks) contenant:
{{
  "location": "lieu exact mentionné ou null",
  "phones": ["liste des numéros de téléphone mentionnés"],
  "people_count": nombre_de_personnes_ou_null,
  "incident_type": "type d'incident (accident, incendie, agression, malaise médical, etc.) ou null",
  "severity": "low/medium/high/critical basé sur le contenu",
  "victim_names": ["noms des victimes mentionnés"],
  "caller_name": "nom de l'appelant ou null",
  "date_mentioned": "date mentionnée ou null",
  "time_mentioned": "heure mentionnée ou null",
  "additional_details": "autres détails importants en une phrase",
  "confidence": score_de_confiance_entre_0_et_1
}}""",

    'en': """You are an emergency call analysis assistant. Analyze the following transcription and extract key information.

Transcription:
{text}

Reply ONLY with a valid JSON object (no markdown, no backticks) containing:
{{
  "location": "exact location mentioned or null",
  "phones": ["list of phone numbers mentioned"],
  "people_count": number_of_people_or_null,
  "incident_type": "type of incident (accident, fire, assault, medical emergency, etc.) or null",
  "severity": "low/medium/high/critical based on content",
  "victim_names": ["names of victims mentioned"],
  "caller_name": "caller's name or null",
  "date_mentioned": "date mentioned or null",
  "time_mentioned": "time mentioned or null",
  "additional_details": "other important details in one sentence",
  "confidence": confidence_score_between_0_and_1
}}""",

    'ar': """أنت مساعد تحليل مكالمات الطوارئ. قم بتحليل النص التالي واستخرج المعلومات الأساسية.

النص المفرّغ:
{text}

أجب فقط بكائن JSON صالح (بدون markdown أو backticks) يحتوي على:
{{
  "location": "الموقع الدقيق المذكور أو null",
  "phones": ["قائمة أرقام الهاتف المذكورة"],
  "people_count": عدد_الأشخاص_أو_null,
  "incident_type": "نوع الحادث (حادث سيارة، حريق، اعتداء، طوارئ طبية، إلخ) أو null",
  "severity": "low/medium/high/critical بناءً على المحتوى",
  "victim_names": ["أسماء الضحايا المذكورة"],
  "caller_name": "اسم المتصل أو null",
  "date_mentioned": "التاريخ المذكور أو null",
  "time_mentioned": "الوقت المذكور أو null",
  "additional_details": "تفاصيل مهمة أخرى في جملة واحدة",
  "confidence": درجة_الثقة_بين_0_و_1
}}"""
}


def main():
    if len(sys.argv) < 2:
        _fail("Usage: extract_entities.py <text_file> [language]")

    text_file = sys.argv[1]
    language = sys.argv[2].lower() if len(sys.argv) > 2 else 'auto'

    if not os.path.isfile(text_file):
        _fail(f"Text file not found: {text_file}")

    with open(text_file, 'r', encoding='utf-8') as f:
        text = f.read().strip()

    if not text:
        _fail("Text file is empty")

    # Normalize language
    if language == 'auto' or language not in PROMPTS:
        language = detect_language(text)

    # Try LLM extraction first, fall back to rule-based
    result = None

    anthropic_key = os.environ.get('ANTHROPIC_API_KEY', '')
    openai_key = os.environ.get('OPENAI_API_KEY', '')

    if anthropic_key:
        result = extract_with_anthropic(text, language, anthropic_key)
    elif openai_key:
        result = extract_with_openai(text, language, openai_key)

    if not result:
        # Fall back to rule-based extraction
        result = extract_rule_based(text, language)

    print(json.dumps(result, ensure_ascii=False))
    sys.exit(0)


# ── Anthropic (Claude) extraction ─────────────────────────────
def extract_with_anthropic(text: str, language: str, api_key: str) -> dict:
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        prompt = PROMPTS.get(language, PROMPTS['en']).format(text=text[:3000])

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",  # Fast and cheap for extraction
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}]
        )

        raw = message.content[0].text.strip()
        # Clean potential markdown fences
        raw = re.sub(r'^```json?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)

        parsed = json.loads(raw)
        parsed['extraction_method'] = 'llm_anthropic'
        return parsed

    except Exception as e:
        # Silently fall through to next method
        return None


# ── OpenAI extraction ──────────────────────────────────────────
def extract_with_openai(text: str, language: str, api_key: str) -> dict:
    try:
        import openai
        client = openai.OpenAI(api_key=api_key)

        prompt = PROMPTS.get(language, PROMPTS['en']).format(text=text[:3000])

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
            temperature=0.1,
        )

        raw = response.choices[0].message.content.strip()
        raw = re.sub(r'^```json?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)

        parsed = json.loads(raw)
        parsed['extraction_method'] = 'llm_openai'
        return parsed

    except Exception as e:
        return None


# ── Rule-based fallback extraction ─────────────────────────────
def extract_rule_based(text: str, language: str) -> dict:
    """
    Regex + keyword-based extraction.
    Less accurate but works offline with no API keys.
    """
    result = {
        "location": None,
        "phones": [],
        "people_count": None,
        "incident_type": None,
        "severity": "medium",
        "victim_names": [],
        "caller_name": None,
        "date_mentioned": None,
        "time_mentioned": None,
        "additional_details": None,
        "confidence": 0.45,
        "extraction_method": "rule_based"
    }

    text_lower = text.lower()

    # ── Phone numbers ──────────────────────────────────────────
    phone_patterns = [
        r'\+?[\d\s\-\(\)]{10,15}',        # International format
        r'\b0[1-9][\s\.\-]?\d{2}[\s\.\-]?\d{2}[\s\.\-]?\d{2}[\s\.\-]?\d{2}\b',  # French
        r'\b\d{2,4}[\s\-]\d{2,4}[\s\-]\d{2,4}\b',  # Generic
        r'\b1[0-9]\b',                     # Emergency short numbers (15, 17, 18, etc.)
    ]
    phones_found = set()
    for pattern in phone_patterns:
        matches = re.findall(pattern, text)
        for m in matches:
            clean = re.sub(r'[\s\-\(\)]', '', m)
            if len(clean) >= 2:
                phones_found.add(clean)
    result['phones'] = list(phones_found)[:5]

    # ── People count ───────────────────────────────────────────
    count_patterns = {
        'fr': [
            r'(\d+)\s*(?:personne|personnes|blessé|blessés|victime|victimes|mort|morts|individu|individus)',
            r'(?:un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\s+(?:personne|blessé|victime)',
        ],
        'en': [
            r'(\d+)\s*(?:person|people|victim|victims|injured|dead|individual)',
            r'(?:one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:person|people|victim)',
        ],
        'ar': [
            r'(\d+)\s*(?:شخص|أشخاص|ضحية|ضحايا|جريح|جرحى|قتيل|قتلى)',
        ]
    }

    word_to_num = {
        'un': 1, 'une': 1, 'deux': 2, 'trois': 3, 'quatre': 4, 'cinq': 5,
        'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9, 'dix': 10,
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    }

    lang_patterns = count_patterns.get(language, count_patterns['en'])
    for pattern in lang_patterns:
        match = re.search(pattern, text_lower)
        if match:
            try:
                num_str = match.group(1) if match.lastindex else match.group(0).split()[0]
                result['people_count'] = word_to_num.get(num_str, int(num_str))
                break
            except (ValueError, IndexError):
                pass

    # ── Incident type ──────────────────────────────────────────
    incident_keywords = {
        'fr': {
            'accident de voiture': ['accident', 'voiture', 'collision', 'choc', 'renversé'],
            'incendie': ['feu', 'incendie', 'flamme', 'brûle', 'fumée'],
            'agression': ['agression', 'attaque', 'coups', 'bagarre', 'violence'],
            'malaise médical': ['malaise', 'inconscient', 'ne respire pas', 'douleur', 'crise cardiaque', 'infarctus'],
            'noyade': ['noyade', 'se noie', 'eau', 'rivière', 'piscine'],
            'chute': ['chute', 'tombé', 'tombe', 'échelle', 'escalier'],
            'vol / cambriolage': ['vol', 'cambriolage', 'cambrioleur', 'voleur', 'vole'],
            'fugue / personne disparue': ['disparu', 'fugue', 'introuvable', 'cherche'],
        },
        'en': {
            'car accident': ['accident', 'crash', 'collision', 'car', 'vehicle', 'hit'],
            'fire': ['fire', 'burning', 'smoke', 'flames', 'blaze'],
            'assault': ['assault', 'attack', 'hit', 'fight', 'stabbed', 'shot'],
            'medical emergency': ['unconscious', 'not breathing', 'chest pain', 'heart attack', 'seizure', 'stroke'],
            'drowning': ['drowning', 'drowning', 'water', 'river', 'pool'],
            'fall': ['fallen', 'fall', 'fell', 'ladder', 'stairs'],
            'robbery': ['robbery', 'theft', 'stolen', 'burglar', 'robbed'],
            'missing person': ['missing', 'disappeared', 'cannot find', 'lost'],
        },
        'ar': {
            'حادث سيارة': ['حادث', 'سيارة', 'تصادم', 'اصطدام'],
            'حريق': ['حريق', 'نار', 'يحترق', 'دخان', 'لهب'],
            'اعتداء': ['اعتداء', 'هجوم', 'ضرب', 'مشادة'],
            'طوارئ طبية': ['إغماء', 'لا يتنفس', 'ألم', 'نوبة قلبية', 'سكتة'],
            'غرق': ['غرق', 'يغرق', 'ماء', 'نهر', 'حمام سباحة'],
            'سقوط': ['سقوط', 'سقط', 'تسلق', 'درج'],
            'سرقة': ['سرقة', 'لص', 'اقتحام', 'سرق'],
            'شخص مفقود': ['مفقود', 'اختفى', 'لا يُعثر'],
        }
    }

    lang_incidents = incident_keywords.get(language, incident_keywords['en'])
    max_score = 0
    best_incident = None
    for incident, keywords in lang_incidents.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > max_score:
            max_score = score
            best_incident = incident

    result['incident_type'] = best_incident

    # ── Severity ───────────────────────────────────────────────
    critical_words = {
        'fr': ['mort', 'décédé', 'critique', 'grave', 'urgence absolue', 'ne respire plus', 'inconscient', 'sang'],
        'en': ['dead', 'deceased', 'critical', 'severe', 'not breathing', 'unconscious', 'blood', 'dying'],
        'ar': ['ميت', 'حرج', 'خطير', 'لا يتنفس', 'فاقد الوعي', 'دم'],
    }
    high_words = {
        'fr': ['blessé grave', 'fracture', 'beaucoup de sang', 'douleur intense', 'accident grave'],
        'en': ['seriously injured', 'fracture', 'lot of blood', 'severe pain', 'major accident'],
        'ar': ['مصاب خطير', 'كسر', 'نزيف شديد', 'ألم حاد'],
    }

    crit = critical_words.get(language, critical_words['en'])
    high = high_words.get(language, high_words['en'])

    if any(w in text_lower for w in crit):
        result['severity'] = 'critical'
    elif any(w in text_lower for w in high):
        result['severity'] = 'high'
    elif result['people_count'] and result['people_count'] > 5:
        result['severity'] = 'high'
    else:
        result['severity'] = 'medium'

    # ── Time patterns ──────────────────────────────────────────
    time_pattern = r'\b\d{1,2}[h:]\d{2}\b|\b\d{1,2}\s*(?:heures?|h|am|pm)\b'
    time_match = re.search(time_pattern, text_lower)
    if time_match:
        result['time_mentioned'] = time_match.group(0)

    # ── Date patterns ──────────────────────────────────────────
    date_keywords_fr = ['aujourd\'hui', 'ce matin', 'ce soir', 'hier', 'ce midi', 'cette nuit']
    date_keywords_en = ['today', 'this morning', 'this evening', 'yesterday', 'tonight']
    date_keywords_ar = ['اليوم', 'هذا الصباح', 'هذا المساء', 'أمس', 'الليلة']

    all_date_kw = date_keywords_fr + date_keywords_en + date_keywords_ar
    for kw in all_date_kw:
        if kw in text_lower:
            result['date_mentioned'] = kw
            break

    date_pattern = r'\b\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}\b'
    date_match = re.search(date_pattern, text)
    if date_match:
        result['date_mentioned'] = date_match.group(0)

    return result


# ── Language detection (simple heuristic) ─────────────────────
def detect_language(text: str) -> str:
    arabic_chars = len(re.findall(r'[\u0600-\u06FF]', text))
    total_chars = len(text.replace(' ', ''))

    if total_chars == 0:
        return 'fr'

    if arabic_chars / total_chars > 0.3:
        return 'ar'

    french_indicators = ['le ', 'la ', 'les ', 'un ', 'une ', 'des ', 'est ', 'et ', ' je ', ' vous ', ' nous ']
    english_indicators = ['the ', 'a ', 'an ', 'is ', 'are ', 'and ', ' i ', ' you ', ' we ']

    text_lower = text.lower()
    fr_score = sum(1 for w in french_indicators if w in text_lower)
    en_score = sum(1 for w in english_indicators if w in text_lower)

    return 'fr' if fr_score >= en_score else 'en'


def _fail(msg: str):
    print(json.dumps({"error": msg}, ensure_ascii=False))
    sys.exit(1)


if __name__ == "__main__":
    main()
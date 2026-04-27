import sys
import json
import os
import re

# ── Config ─────────────────────────────────────────────────────
EMOTION_MODEL   = "j-hartmann/emotion-english-distilroberta-base"
SENTIMENT_MODEL = "lxyuan/distilbert-base-multilingual-cased-sentiments-student"

SPACY_MODELS = {
    'fr': 'fr_core_news_sm',
    'en': 'en_core_web_sm',
    'ar': 'xx_ent_wiki_sm',
    'auto': 'xx_ent_wiki_sm',
}


# ══════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════
def main():
    if len(sys.argv) < 2:
        _fail("Usage: extract_entities.py <text_file> [language]")

    text_file = sys.argv[1]
    language  = sys.argv[2].lower() if len(sys.argv) > 2 else 'auto'

    if not os.path.isfile(text_file):
        _fail(f"Text file not found: {text_file}")

    with open(text_file, 'r', encoding='utf-8') as f:
        text = f.read().strip()

    if not text:
        _fail("Text file is empty")

    if language not in SPACY_MODELS:
        language = detect_language(text)

    # ── Step 1: spaCy NER ──────────────────────────────────────
    ner_result = run_spacy_ner(text, language)

    # ── Step 2: HuggingFace emotion + sentiment ───────────────
    hf_result  = run_hf_analysis(text)

    # ── Step 3: deep heuristic analysis ───────────────────────
    deep       = run_deep_heuristics(text, language)

    # ── Merge everything ───────────────────────────────────────
    result = {**deep, **ner_result}

    # Layer in HF emotion data
    result['sentiment']       = hf_result.get('sentiment', 'neutral')
    result['dominant_emotion']= hf_result.get('dominant_emotion', 'neutral')
    result['emotion_scores']  = hf_result.get('emotion_scores', {})

    # Upgrade severity if emotion signals detected
    if hf_result.get('dominant_emotion') in ('fear', 'anger') and result['severity'] == 'medium':
        result['severity'] = 'high'
        result['anomalies'].append(
            f"emotion model detected '{hf_result['dominant_emotion']}' — severity upgraded"
        )

    # Add emotion to emotional_markers
    dom = hf_result.get('dominant_emotion')
    if dom and dom not in result['emotional_markers']:
        result['emotional_markers'].append(dom)

    # Bump hidden_distress confidence if emotion model agrees
    if result['hidden_distress']['detected'] and dom in ('fear', 'disgust'):
        old_conf = result['hidden_distress']['confidence']
        result['hidden_distress']['confidence'] = min(old_conf + 0.15, 0.95)
        result['hidden_distress']['signals'].append(
            f"emotion model independently detected '{dom}'"
        )

    result['extraction_method'] = 'spacy+hf_local'
    print(json.dumps(result, ensure_ascii=False))
    sys.exit(0)


# ══════════════════════════════════════════════════════════════
# STEP 1 — spaCy NER
# ══════════════════════════════════════════════════════════════
def run_spacy_ner(text, language):
    out = {
        'location': None, 'victim_names': [],
        'caller_name': None, 'phones': [],
    }

    model_name = SPACY_MODELS.get(language, 'xx_ent_wiki_sm')
    try:
        import spacy
        try:
            nlp = spacy.load(model_name)
        except OSError:
            # Try multilingual fallback
            try:
                nlp = spacy.load('xx_ent_wiki_sm')
            except OSError:
                # spaCy not installed or no models — return empty, heuristics will fill in
                return out

        doc = nlp(text[:3000])

        locations, persons = [], []
        for ent in doc.ents:
            if ent.label_ in ('LOC', 'GPE', 'FAC'):
                locations.append(ent.text)
            elif ent.label_ == 'PER':
                persons.append(ent.text)

        if locations:
            out['location'] = locations[0]
        if persons:
            out['caller_name'] = persons[0]
            out['victim_names'] = persons[1:4]

    except ImportError:
        pass  # spaCy not installed — heuristics will handle it

    # Phone numbers via regex (spaCy doesn't do phones well)
    phone_patterns = [
        r'\+?[\d][\d\s\-\(\)]{8,14}[\d]',
        r'\b0[1-9](?:[\s\.\-]?\d{2}){4}\b',
        r'\b1[0-9]\b',
    ]
    found = set()
    for pat in phone_patterns:
        for m in re.findall(pat, text):
            clean = re.sub(r'[\s\-\(\)]', '', m)
            if len(clean) >= 2:
                found.add(clean)
    out['phones'] = list(found)[:5]

    return out


# ══════════════════════════════════════════════════════════════
# STEP 2 — HuggingFace local inference
# ══════════════════════════════════════════════════════════════
def run_hf_analysis(text):
    out = {'sentiment': 'neutral', 'dominant_emotion': 'neutral', 'emotion_scores': {}}

    # Truncate — models have 512 token limit
    snippet = text[:512]

    # ── Emotion classification ─────────────────────────────────
    try:
        from transformers import pipeline
        emotion_pipe = pipeline(
            "text-classification",
            model=EMOTION_MODEL,
            top_k=None,       # return all labels
            truncation=True,
        )
        scores = emotion_pipe(snippet)
        # scores is list of list of dicts: [[{label, score}, ...]]
        if scores and scores[0]:
            sorted_scores = sorted(scores[0], key=lambda x: x['score'], reverse=True)
            out['dominant_emotion'] = sorted_scores[0]['label'].lower()
            out['emotion_scores'] = {
                item['label'].lower(): round(item['score'], 3)
                for item in sorted_scores
            }
    except Exception as e:
        # Model not downloaded yet or transformers not installed
        out['emotion_scores'] = {'error': str(e)[:80]}

    # ── Sentiment classification (multilingual) ────────────────
    try:
        from transformers import pipeline
        sentiment_pipe = pipeline(
            "text-classification",
            model=SENTIMENT_MODEL,
            truncation=True,
        )
        result = sentiment_pipe(snippet)
        if result:
            out['sentiment'] = result[0]['label'].lower()
    except Exception:
        pass

    return out


# ══════════════════════════════════════════════════════════════
# STEP 3 — Deep heuristic analysis (free, no models needed)
# ══════════════════════════════════════════════════════════════
def run_deep_heuristics(text, language):
    text_lower = text.lower()
    words      = text_lower.split()
    sentences  = [s.strip() for s in re.split(r'[.!?؟\n]+', text.strip()) if s.strip()]

    result = {
        'people_count'      : None,
        'incident_type'     : None,
        'severity'          : 'medium',
        'date_mentioned'    : None,
        'time_mentioned'    : None,
        'additional_details': None,
        'confidence'        : 0.5,
        'hidden_distress': {
            'detected'          : False,
            'confidence'        : 0.0,
            'signals'           : [],
            'covert_message'    : None,
            'recommended_action': 'standard',
        },
        'anomalies'         : [],
        'emotional_markers' : [],
        'narrative_coherence': 'coherent',
        'worst_case_scenario': None,
        'worst_case_likelihood': 'low',
        'caller_speaking_freely': True,
    }

    # ── Incident type ──────────────────────────────────────────
    incidents = {
        'fr': {
            'accident de voiture' : ['accident', 'collision', 'voiture', 'renversé'],
            'incendie'            : ['feu', 'incendie', 'flamme', 'fumée'],
            'agression'           : ['agression', 'attaque', 'frappe', 'coups', 'bagarre'],
            'malaise médical'     : ['malaise', 'inconscient', 'douleur', 'crise', 'respire'],
            'violence domestique' : ['mari', 'conjoint', 'frappe', 'violence', 'menace chez'],
            'vol / cambriolage'   : ['vol', 'cambriolage', 'voleur'],
            'personne disparue'   : ['disparu', 'introuvable', 'fugue'],
        },
        'en': {
            'car accident'      : ['accident', 'crash', 'collision', 'vehicle'],
            'fire'              : ['fire', 'burning', 'smoke', 'flames'],
            'assault'           : ['assault', 'attack', 'fight', 'stabbed', 'shot'],
            'medical emergency' : ['unconscious', 'breathing', 'chest pain', 'heart', 'seizure'],
            'domestic violence' : ['husband', 'wife', 'partner', 'hitting', 'scared home'],
            'robbery'           : ['robbery', 'theft', 'stolen', 'burglar'],
            'missing person'    : ['missing', 'disappeared', 'lost', 'cannot find'],
        },
        'ar': {
            'حادث سيارة'  : ['حادث', 'تصادم', 'سيارة'],
            'حريق'        : ['حريق', 'نار', 'دخان'],
            'اعتداء'      : ['اعتداء', 'ضرب', 'هجوم'],
            'طوارئ طبية'  : ['إغماء', 'تنفس', 'ألم'],
            'عنف أسري'    : ['زوج', 'يضرب', 'خائف', 'أمان'],
            'سرقة'        : ['سرقة', 'لص', 'سرق'],
        },
    }
    lang_inc = incidents.get(language, incidents['en'])
    best, best_score = None, 0
    for inc, kws in lang_inc.items():
        sc = sum(1 for kw in kws if kw in text_lower)
        if sc > best_score:
            best_score, best = sc, inc
    result['incident_type'] = best

    # ── People count ───────────────────────────────────────────
    word_nums = {'un':1,'une':1,'deux':2,'trois':3,'quatre':4,'cinq':5,
                 'one':1,'two':2,'three':3,'four':4,'five':5}
    cpat = r'(\d+|un|une|deux|trois|quatre|cinq|one|two|three|four|five)\s*(?:personne|blessé|victime|mort|person|victim|injured|dead|شخص|ضحية)'
    m = re.search(cpat, text_lower)
    if m:
        n = m.group(1)
        result['people_count'] = word_nums.get(n, int(n) if n.isdigit() else None)

    # ── Time / date ────────────────────────────────────────────
    tm = re.search(r'\b\d{1,2}[h:]\d{2}\b|\b\d{1,2}\s*(?:heures?|h|am|pm)\b', text_lower)
    if tm:
        result['time_mentioned'] = tm.group(0)
    for kw in ["aujourd'hui","ce matin","ce soir","hier","tonight","today","this morning","yesterday","اليوم","أمس"]:
        if kw in text_lower:
            result['date_mentioned'] = kw
            break
    dm = re.search(r'\b\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}\b', text)
    if dm:
        result['date_mentioned'] = dm.group(0)

    # ── Severity ───────────────────────────────────────────────
    crit_kws = ['mort','dead','dying','ne respire','not breathing','inconscient','unconscious','sang','blood','arme','weapon','قتل','ميت']
    high_kws = ['blessé grave','seriously injured','fracture','beaucoup de sang','heart attack','crise cardiaque','نوبة']
    if any(w in text_lower for w in crit_kws):
        result['severity'] = 'critical'
    elif any(w in text_lower for w in high_kws):
        result['severity'] = 'high'
    elif result['people_count'] and result['people_count'] > 3:
        result['severity'] = 'high'

    # ══════════════════════════════════════════════════════════
    # DISTRESS DETECTION ENGINE
    # 7 independent signals, each adds to distress_score
    # ══════════════════════════════════════════════════════════
    signals, anomalies, emo_markers = [], [], []
    score = 0.0

    # Signal 1 — Yes/No ratio (coded call)
    yn_pats = {
        'fr': r'\b(oui|non|peut-être|d\'accord)\b',
        'en': r'\b(yes|no|yeah|nope|okay|sure)\b',
        'ar': r'\b(نعم|لا|ربما|حسناً)\b',
    }
    yn_count = len(re.findall(yn_pats.get(language, yn_pats['en']), text_lower))
    yn_ratio = yn_count / max(len(words), 1)
    if yn_ratio > 0.22 and len(sentences) >= 3:
        signals.append("high yes/no response ratio — caller may not be speaking freely")
        score += 0.35

    # Signal 2 — Missing location for location-dependent emergency
    loc_emer = ['accident','fire','incendie','assault','agression','حادث','حريق']
    needs_loc = any(kw in text_lower for kw in loc_emer)
    # Check heuristic location presence (spaCy result merged later)
    heuristic_loc = bool(re.search(r'\b(?:rue|avenue|street|road|allée)\s+\w+|\b\d+\s+\w+\s+(?:street|avenue)', text_lower))
    if needs_loc and not heuristic_loc:
        signals.append("location-dependent emergency but no address detected")
        anomalies.append("address absent for location-dependent emergency type")
        score += 0.25

    # Signal 3 — Unusual calm + severe content co-occurrence
    calm_kws = {
        'fr': ['s\'il vous plaît','merci','pardon','excusez','désolé'],
        'en': ['please','thank you','sorry','excuse me','no worries'],
        'ar': ['من فضلك','شكرا','آسف'],
    }
    calm_count  = sum(1 for w in calm_kws.get(language, calm_kws['en']) if w in text_lower)
    severe_count= sum(1 for w in crit_kws if w in text_lower)
    if calm_count >= 2 and severe_count >= 1:
        signals.append("unusual politeness alongside severe content — possible coercion or shock dissociation")
        emo_markers.append("inappropriate_calm")
        score += 0.30

    # Signal 4 — Direct contradiction pairs
    contra_pairs = {
        'fr': [('tout va bien','aide'),('pas de problème','urgent'),("c'est normal",'vite'),('va bien','danger')],
        'en': [('everything is fine','help'),('no problem','urgent'),("it's okay",'hurry'),('fine','please come'),('just ordering','emergency')],
        'ar': [('كل شيء بخير','مساعدة'),('لا مشكلة','عاجل')],
    }
    for (reassure, urgency) in contra_pairs.get(language, contra_pairs['en']):
        if reassure in text_lower and urgency in text_lower:
            signals.append(f"contradiction: reassurance ('{reassure}') alongside urgency signal ('{urgency}')")
            anomalies.append(f"contradictory phrases co-present: '{reassure}' and '{urgency}'")
            score += 0.45
            break

    # Signal 5 — Coded / indirect request patterns
    coded_pats = {
        'fr': [r'je voudrais commander',r'est-ce que vous pouvez venir',r'quelqu\'un ici avec moi',r'je ne peux pas (?:parler|bouger)',r'si vous comprenez'],
        'en': [r"i'd like to order",r'can you send someone',r"i can't (:really)?talk",r"there's someone (:here|with me)",r'if you understand',r'you know what i mean'],
        'ar': [r'أريد أن أطلب',r'هل يمكنك أن ترسل',r'لا أستطيع التحدث',r'شخص معي'],
    }
    for pat in coded_pats.get(language, coded_pats['en']):
        if re.search(pat, text_lower):
            signals.append(f"indirect/coded phrasing pattern detected")
            score += 0.50
            break

    # Signal 6 — Sentence fragmentation
    avg_len = sum(len(s.split()) for s in sentences) / max(len(sentences), 1)
    if avg_len < 4 and len(sentences) >= 4:
        signals.append("very short fragmented sentences — possible fear or inability to speak")
        emo_markers.append("fragmented_speech")
        result['narrative_coherence'] = 'fragmented'
        score += 0.20
    elif avg_len < 6 and len(sentences) >= 4:
        result['narrative_coherence'] = 'inconsistent'

    # Signal 7 — Fear / urgency lexicon density
    fear_kws = {
        'fr': ['peur','terrifié','paniqué','tremble','effrayé','aide-moi','pitié','au secours'],
        'en': ['scared','terrified','panicking','trembling','frightened','help me','please hurry','afraid'],
        'ar': ['خائف','مرعوب','أرتجف','ساعدني','خوف'],
    }
    urgency_kws = {
        'fr': ['vite','urgent','immédiatement','maintenant','dépêchez','vite vite'],
        'en': ['quickly','urgent','immediately','now','hurry','fast','asap'],
        'ar': ['سريعاً','عاجل','فوراً','الآن'],
    }
    fear_count    = sum(1 for w in fear_kws.get(language, fear_kws['en']) if w in text_lower)
    urgency_count = sum(1 for w in urgency_kws.get(language, urgency_kws['en']) if w in text_lower)
    if fear_count >= 2:
        emo_markers.append("fear")
        score += 0.15
    if fear_count >= 3:
        emo_markers.append("high_distress")
        score += 0.10
    if urgency_count >= 1:
        emo_markers.append("urgency")

    # ── Assemble hidden_distress ───────────────────────────────
    detected = score >= 0.35
    if detected:
        result['caller_speaking_freely'] = False

        if yn_ratio > 0.22:
            msg = "Caller appears to be using yes/no responses to covertly signal an emergency while unable to speak freely"
        elif any('contradiction' in s for s in signals):
            msg = "Caller's words contradict their tone — possible coercion, duress, or dissociative shock state"
        elif any('coded' in s or 'indirect' in s for s in signals):
            msg = "Indirect phrasing pattern suggests caller may be using coded language to request help"
        else:
            msg = "Multiple anomalies suggest caller's stated situation may not reflect their actual emergency"

        wc = {
            'fr': "L'appelant pourrait être sous contrainte ou retenu, utilisant un prétexte anodin pour demander de l'aide discrètement",
            'en': "Caller may be under duress or held, using a mundane pretext to covertly signal for help",
            'ar': "قد يكون المتصل تحت الإكراه، ويستخدم ذريعة عادية لطلب المساعدة سراً",
        }

        result['hidden_distress'] = {
            'detected'          : True,
            'confidence'        : min(round(score, 2), 0.95),
            'signals'           : signals,
            'covert_message'    : msg,
            'recommended_action': 'escalate' if score >= 0.6 else 'monitor',
        }
        result['worst_case_scenario']  = wc.get(language, wc['en'])
        result['worst_case_likelihood']= 'high' if score >= 0.6 else 'medium'

        # Upgrade severity when distress is strong
        if score >= 0.5 and result['severity'] in ('low', 'medium'):
            result['severity'] = 'high'
    else:
        result['hidden_distress']['confidence'] = round(score, 2)
        result['hidden_distress']['signals']    = signals

    result['anomalies']       = anomalies
    result['emotional_markers'] = list(set(emo_markers))
    result['confidence']      = 0.70 if result['incident_type'] else 0.45

    return result


# ── Language detection ─────────────────────────────────────────
def detect_language(text):
    ar = len(re.findall(r'[\u0600-\u06FF]', text))
    if len(text) > 0 and ar / len(text.replace(' ','')) > 0.15:
        return 'ar'
    fr = sum(1 for w in [' le ',' la ',' les ',' est ',' et ',' je ',' vous ',' nous ',' une '] if w in text.lower())
    en = sum(1 for w in [' the ',' and ',' is ',' are ',' you ',' we ',' a ',' an '] if w in text.lower())
    return 'fr' if fr >= en else 'en'


def _fail(msg):
    print(json.dumps({"error": msg}, ensure_ascii=False))
    sys.exit(1)


if __name__ == "__main__":
    main()

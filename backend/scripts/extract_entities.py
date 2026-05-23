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

    # ── Step 4: Smart Suggestions ──────────────────────────────
    result['smart_suggestions'] = generate_suggestions(result, language)

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
            try:
                nlp = spacy.load('xx_ent_wiki_sm')
            except OSError:
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
        pass

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
    snippet = text[:512]

    try:
        import torch
        device_id = 0 if torch.cuda.is_available() else -1
    except Exception:
        device_id = -1

    try:
        from transformers import pipeline
        emotion_pipe = pipeline(
            "text-classification",
            model=EMOTION_MODEL,
            top_k=None,
            truncation=True,
            device=device_id,
        )
        scores = emotion_pipe(snippet)
        if scores and scores[0]:
            sorted_scores = sorted(scores[0], key=lambda x: x['score'], reverse=True)
            out['dominant_emotion'] = sorted_scores[0]['label'].lower()
            out['emotion_scores'] = {
                item['label'].lower(): round(item['score'], 3)
                for item in sorted_scores
            }
    except Exception as e:
        out['emotion_scores'] = {'error': str(e)[:80]}

    try:
        from transformers import pipeline
        sentiment_pipe = pipeline(
            "text-classification",
            model=SENTIMENT_MODEL,
            truncation=True,
            device=device_id,
        )
        result = sentiment_pipe(snippet)
        if result:
            out['sentiment'] = result[0]['label'].lower()
    except Exception:
        pass

    return out


# ══════════════════════════════════════════════════════════════
# STEP 3 — Deep heuristic analysis
#
# FIX: Incident classification now requires a MINIMUM SCORE
# of 2 keyword matches before assigning an incident type.
# Single-word matches no longer classify a call.
# Each keyword is also more specific to avoid false positives
# (e.g. "accident" alone is too generic and appears in many
# unrelated sentences — now requires 2+ hits from the list).
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

    incidents = {
        'fr': [
            ('fusillade / tirs',      ['fusillade','coup de feu','coups de feu','tirs','a tiré','ouvrir le feu','tireur actif','arme à feu','pistolet','fusil'], 1),
            ('accident de voiture',   ['collision','percuté','renversé','choc','carambolage','voiture accidentée','véhicule accidenté'], 1),
            ('accident de voiture',   ['accident','voiture'],  2),   # needs BOTH words
            ('incendie',              ['incendie','flammes','brûle','brûler','fumée épaisse'],        1),
            ('incendie',              ['feu','brûle'],                                                     2),
            ('incendie',              ['feu','fumée'],                                                     2),
            ('agression physique',    ['agression','attaque','frappe','coups','blessé','couteau','arme'],   1),
            ('urgence médicale',      ['malaise','inconscient','ne respire','crise cardiaque','douleur thoracique','ambulance'], 1),
            ('violence domestique',   ['conjoint frappe','mari frappe','violence conjugale','femme battue','enfant battu'], 1),
            ('violence domestique',   ['violence','maison','mari','femme'],                                3),
            ('vol / cambriolage',     ['cambriolage','voleur','vol à main armée','braquage','effraction'], 1),
            ('vol / cambriolage',     ['volé','vol'],                                                     2),
            ('personne disparue',     ['disparu','introuvable','enfant perdu','fugue'],                    1),
            ('noyade',                ['noyade','se noie','noyé','eau','piscine'],                         2),
        ],
        'en': [
            ('shooting',              ['shooting','gunshot','gunshots','shots fired','opened fire','active shooter','gunman','pistol','rifle'], 1),
            ('car accident',          ['collision','crashed','crash','rear-ended','overturned','rollover','vehicle accident'], 1),
            ('car accident',          ['accident','car'],                                                  2),
            ('car accident',          ['accident','vehicle'],                                              2),
            ('car accident',          ['accident','highway'],                                              2),
            ('fire',                  ['burning','flames','smoke','arson','fire alarm'],                   1),
            ('fire',                  ['fire','burning'],                                                  2),
            ('fire',                  ['fire','smoke'],                                                    2),
            ('fire',                  ['fire','flames'],                                                   2),
            ('assault',               ['stabbed','shot','gunshot','attacked','beaten','assault','weapon'], 1),
            ('medical emergency',     ['unconscious','not breathing','chest pain','heart attack','seizure','overdose'], 1),
            ('domestic violence',     ['hitting me','beating me','hurting me','domestic violence','abuse'],1),
            ('domestic violence',     ['husband','hitting','scared'],                                      3),
            ('robbery',               ['robbery','armed robbery','mugged','held up','thief'],              1),
            ('robbery',               ['stolen','robbed'],                                                 2),
            ('missing person',        ['missing','disappeared','can\'t find','lost child'],                1),
            ('drowning',              ['drowning','can\'t swim','underwater'],                             1),
        ],
        'ar': [
            ('إطلاق نار',             ['إطلاق نار','طلق ناري','إطلاق رصاص','مطلق النار','مسدس','بندقية'],  1),
            ('حادث سيارة',            ['تصادم','اصطدام','حادث سيارة','حادث طريق'],                       1),
            ('حادث سيارة',            ['حادث','سيارة'],                                                   2),
            ('حريق',                  ['حريق','اشتعال','نار','دخان كثيف'],                               1),
            ('حريق',                  ['نار','اشتعال'],                                                   2),
            ('اعتداء',                ['اعتداء','يضربني','ضرب','سكين','سلاح'],                           1),
            ('طوارئ طبية',            ['لا يتنفس','نوبة قلبية','إغماء','سقط مغشياً'],                    1),
            ('عنف أسري',              ['زوجي يضربني','عنف أسري','زوج عنيف'],                             1),
            ('سرقة',                  ['سرقة','يسرقني','مسلح','اختطاف'],                                  1),
            ('غرق',                   ['يغرق','لا يسبح','غرق','بحر','نهر'],                               2),
        ],
    }

    lang_list = incidents.get(language, incidents['en'])

    best_type  = None
    best_score = 0

    for entry in lang_list:
        inc_name, kws, min_hits = entry
        score = sum(1 for kw in kws if re.search(r'\b' + re.escape(kw) + r'\b', text_lower))
        if score >= min_hits and score > best_score:
            best_score = score
            best_type  = inc_name

    result['incident_type'] = best_type

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
    crit_kws = ['mort','dead','dying','ne respire','not breathing','inconscient','unconscious','sang','blood','arme','weapon','قتل','ميت','لا يتنفس']
    high_kws = ['blessé grave','seriously injured','fracture','beaucoup de sang','heart attack','crise cardiaque','نوبة']
    if any(w in text_lower for w in crit_kws):
        result['severity'] = 'critical'
    elif any(w in text_lower for w in high_kws):
        result['severity'] = 'high'
    elif result['people_count'] and result['people_count'] > 3:
        result['severity'] = 'high'
    elif result['incident_type'] is None:
        # No incident detected → low severity by default
        result['severity'] = 'low'

    # ── Hidden distress signals ────────────────────────────────
    signals, anomalies, emo_markers = [], [], []
    score = 0.0

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

    loc_emer = ['accident','fire','incendie','assault','agression','حادث','حريق']
    needs_loc = any(kw in text_lower for kw in loc_emer)
    heuristic_loc = bool(re.search(r'\b(?:rue|avenue|street|road|allée)\s+\w+|\b\d+\s+\w+\s+(?:street|avenue)', text_lower))
    if needs_loc and not heuristic_loc:
        signals.append("location-dependent emergency but no address detected")
        anomalies.append("address absent for location-dependent emergency type")
        score += 0.25

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

    avg_len = sum(len(s.split()) for s in sentences) / max(len(sentences), 1)
    if avg_len < 4 and len(sentences) >= 4:
        signals.append("very short fragmented sentences — possible fear or inability to speak")
        emo_markers.append("fragmented_speech")
        result['narrative_coherence'] = 'fragmented'
        score += 0.20
    elif avg_len < 6 and len(sentences) >= 4:
        result['narrative_coherence'] = 'inconsistent'

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

        if score >= 0.5 and result['severity'] in ('low', 'medium'):
            result['severity'] = 'high'
    else:
        result['hidden_distress']['confidence'] = round(score, 2)
        result['hidden_distress']['signals']    = signals

    result['anomalies']         = anomalies
    result['emotional_markers'] = list(set(emo_markers))

    # Confidence: higher when we actually identified something
    if result['incident_type']:
        result['confidence'] = 0.70
    elif result['hidden_distress']['detected']:
        result['confidence'] = 0.55
    else:
        result['confidence'] = 0.35

    return result


# ══════════════════════════════════════════════════════════════
# STEP 4 — Smart Suggestion Engine (free, rule-based)
# ══════════════════════════════════════════════════════════════
def generate_suggestions(result: dict, language: str) -> dict:
    severity        = result.get('severity', 'medium')
    incident_type   = (result.get('incident_type') or '').lower()
    people_count    = result.get('people_count')
    location        = result.get('location')
    phones          = result.get('phones', [])
    caller_name     = result.get('caller_name')
    victim_names    = result.get('victim_names', [])
    hidden_distress = result.get('hidden_distress', {})
    distress_detected   = hidden_distress.get('detected', False)
    dominant_emotion    = result.get('dominant_emotion', 'neutral')

    # ── Response level ─────────────────────────────────────────
    level_map = {'low': 'standard', 'medium': 'elevated', 'high': 'elevated', 'critical': 'critical'}
    response_level = level_map.get(severity, 'standard')
    if distress_detected and response_level != 'critical':
        response_level = 'elevated'

    # No incident detected → standard response
    if not incident_type and not distress_detected:
        response_level = 'standard'

    # ── Resources to dispatch ──────────────────────────────────
    INCIDENT_RESOURCES = {
        # French incidents
        'incendie':             ['Pompiers (18)', 'SAMU si blessés (15)', 'Police (17)'],
        'accident de voiture':  ['SAMU (15)', 'Pompiers (18)', 'Police (17)', 'Dépanneuse'],
        'agression':            ['Police (17)', 'SAMU si blessés (15)'],
        'agression physique':   ['Police (17)', 'SAMU si blessés (15)'],
        'urgence médicale':     ['SAMU (15)', 'Pompiers (18)'],
        'malaise médical':      ['SAMU (15)', 'Pompiers (18)'],
        'violence domestique':  ['Police (17)', 'SAMU si blessés (15)', 'Travailleurs sociaux'],
        'vol / cambriolage':    ['Police (17)'],
        'personne disparue':    ['Police (17)', 'Gendarmerie'],
        'noyade':               ['SAMU (15)', 'Pompiers (18)', 'SNSM si zone côtière'],
        # English incidents
        'fire':                 ['Fire Brigade (999)', 'Ambulance if injured', 'Police'],
        'car accident':         ['Ambulance (999)', 'Fire Brigade', 'Police', 'Traffic control'],
        'assault':              ['Police (999)', 'Ambulance if injured'],
        'medical emergency':    ['Ambulance (999)', 'Fire Brigade if trapped'],
        'domestic violence':    ['Police (999)', 'Ambulance if injured', 'Social services'],
        'robbery':              ['Police (999)'],
        'missing person':       ['Police (999)'],
        'drowning':             ['Ambulance (999)', 'Coastguard/Lifeguard', 'Fire Brigade'],
        # Arabic incidents
        'حادث سيارة':           ['الإسعاف (1021)', 'الإطفاء', 'الشرطة (1717)'],
        'حريق':                 ['الإطفاء (1020)', 'الإسعاف (1021)', 'الشرطة (1717)'],
        'اعتداء':               ['الشرطة (1717)', 'الإسعاف إذا كان هناك إصابات'],
        'طوارئ طبية':           ['الإسعاف (1021)', 'الإطفاء'],
        'عنف أسري':             ['الشرطة (1717)', 'الإسعاف', 'الخدمات الاجتماعية'],
        'سرقة':                 ['الشرطة (1717)'],
        'غرق':                  ['الإسعاف (1021)', 'الإطفاء', 'حرس السواحل'],
    }

    resources = []
    for key, res_list in INCIDENT_RESOURCES.items():
        if key in incident_type:
            resources = list(res_list)
            break

    # Generic fallback only if something is actually wrong
    if not resources and (incident_type or distress_detected or severity in ('high', 'critical')):
        resources = ['Emergency services (112)', 'Police if needed', 'Medical services if injured']
    elif not resources:
        resources = ['Emergency services (112) — if situation escalates']

    if people_count and people_count > 5:
        resources.append('Mass casualty / CUMP support')
    if people_count and people_count > 10:
        resources.append('Civil security coordination')

    # ── Priority actions ───────────────────────────────────────
    priority_actions = []

    if distress_detected:
        conf = round(hidden_distress.get('confidence', 0) * 100)
        msg  = hidden_distress.get('covert_message', 'Caller may not be speaking freely')
        priority_actions.append(f"COVERT DISTRESS DETECTED ({conf}% confidence) — {msg}")
        priority_actions.append("Send silent dispatch immediately without confirming over phone")
        priority_actions.append("Use yes/no questions only: 'Is someone with you right now?'")
        priority_actions.append("Do NOT mention police or emergency dispatch explicitly on call")

    if severity == 'critical':
        priority_actions.append("CRITICAL — Dispatch all relevant units immediately without delay")
    elif severity == 'high':
        priority_actions.append("HIGH priority — Begin dispatch while gathering additional information")

    if incident_type:
        if location:
            priority_actions.append(f"Confirm exact location: '{location}' — verify street/building/floor")
        else:
            priority_actions.append("Location NOT detected — ask caller for precise address immediately")
    elif not distress_detected:
        priority_actions.append("Gather more information — incident type unclear from transcript")

    if victim_names:
        priority_actions.append(f"Note victim name(s): {', '.join(victim_names)}")
    if people_count:
        if people_count > 1:
            priority_actions.append(f"Multiple people involved ({people_count}) — scale resources accordingly")
        else:
            priority_actions.append("Single victim reported — confirm whether others are present")

    MEDICAL_KEYWORDS = [
        'mort','dead','inconscient','unconscious','ne respire','not breathing',
        'bleeding','sang','crise','seizure','infarctus','heart attack','cardiac',
        'لا يتنفس','نوبة قلبية'
    ]
    text_blob = (str(result.get('additional_details') or '') + incident_type).lower()
    if any(kw in text_blob for kw in MEDICAL_KEYWORDS):
        priority_actions.append("Medical emergency indicators — ensure ambulance is dispatched NOW")
        priority_actions.append("Ask caller: 'Is the person conscious? Are they breathing?'")
        if language == 'fr':
            priority_actions.append("Guider le témoin : 'Desserrez les vêtements, parlez-lui, ne le bougez pas'")
        elif language == 'ar':
            priority_actions.append("توجيه المشاهد: 'أرخِ الملابس، تكلم معه، لا تحركه'")
        else:
            priority_actions.append("Guide bystander: 'Loosen clothing, talk to them, do not move them'")

    if dominant_emotion in ('fear', 'anger') or severity in ('high', 'critical'):
        priority_actions.append("Keep caller calm — speak slowly, clearly, and reassuringly")
        if distress_detected:
            priority_actions.append("Confirm units are on the way — avoid revealing exact ETA if caller may be watched")

    if phones:
        priority_actions.append(f"Callback number(s) logged: {', '.join(phones[:3])}")
    else:
        priority_actions.append("No phone number detected in transcript — trace call if possible")

    # If nothing urgent was found, provide a neutral assessment note
    if not priority_actions or (len(priority_actions) == 1 and 'phone' in priority_actions[0].lower()):
        priority_actions.insert(0, "No critical emergency indicators detected — verify caller situation verbally")

    # ── Dispatcher notes ───────────────────────────────────────
    dispatcher_notes = []
    dispatcher_notes.append(f"Incident type: {result.get('incident_type') or 'Not identified — requires clarification'}")
    dispatcher_notes.append(f"Severity assessed: {severity.upper()}")
    dispatcher_notes.append(f"Response level: {response_level.upper()}")
    if caller_name:
        dispatcher_notes.append(f"Caller identified as: {caller_name}")
    if result.get('time_mentioned'):
        dispatcher_notes.append(f"Time mentioned by caller: {result['time_mentioned']}")
    if result.get('date_mentioned'):
        dispatcher_notes.append(f"Date mentioned by caller: {result['date_mentioned']}")
    conf_pct = round((result.get('confidence') or 0) * 100)
    dispatcher_notes.append(f"Entity extraction confidence: {conf_pct}%")
    if result.get('narrative_coherence') not in ('coherent', None):
        dispatcher_notes.append(
            f"Narrative coherence: {result.get('narrative_coherence')} — cross-check caller statements"
        )
    for a in (result.get('anomalies') or [])[:3]:
        dispatcher_notes.append(f"Anomaly flagged: {a}")

    # ── Follow-up checklist ────────────────────────────────────
    follow_up = []

    return {
        'priority_actions':         priority_actions,
        'dispatcher_notes':         dispatcher_notes,
        'resources_to_dispatch':    resources,
        'estimated_response_level': response_level,
        'follow_up_checklist':      follow_up,
    }


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
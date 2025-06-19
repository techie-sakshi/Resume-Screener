import pdfplumber
import re
import spacy
import pandas as pd
from spacy.matcher import PhraseMatcher

# Load spaCy model and instantiate PhraseMatcher
nlp = spacy.load("en_core_web_sm")
matcher = PhraseMatcher(nlp.vocab, attr="LOWER")
from spacy.pipeline import EntityRuler

ruler = nlp.add_pipe("entity_ruler", before="ner")
patterns = [
    # two or three all‑caps tokens, e.g. “JANE DOE” or “JANE A DOE”
    {"label": "PERSON", "pattern": [{"IS_UPPER": True}, {"IS_UPPER": True}, {"IS_UPPER": True, "OP": "?"}]},
    # Capitalized‑Word + Capitalized‑Word, e.g. “John Smith”
    {"label": "PERSON", "pattern": [{"TEXT": {"REGEX": "^[A-Z][a-z]+"}}, {"TEXT": {"REGEX": "^[A-Z][a-z]+"}}]}
]
ruler.add_patterns(patterns)

# Load skills list from Excel file
df_skills = pd.read_excel("skills_dataset.xlsx")
cols = [c for c in df_skills.columns if 'skill' in c.lower()]
skill_col = cols[0] if cols else df_skills.columns[0]
skill_list = df_skills[skill_col].dropna().astype(str).tolist()
print(f"Loaded {len(skill_list)} skills from column '{skill_col}'", flush=True)

patterns = [nlp.make_doc(skill) for skill in skill_list]
matcher.add("SKILLS", patterns)

def extract_text_from_pdf(file_path):
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text


def extract_email(text):
    match = re.search(r"[\w\.-]+@[\w\.-]+", text)
    return match.group(0) if match else None


def extract_phone(text):
    match = re.search(r"\b(\+?\d{1,4}[\s\-]?)?(\(?\d{3}\)?[\s\-]?)?[\d\s\-]{7,15}\b", text)
    return match.group(0) if match else None


# def extract_name(text):
#     doc = nlp(text)
#     for ent in doc.ents:
#         if ent.label_ == "PERSON": return ent.text
#     return None

# def extract_name(text):
#     # 1) Try SpaCy NER (with our new rules in place)
#     doc = nlp(text[:1000])  # only the first 1 000 chars – names almost always in header
#     for ent in doc.ents:
#         if ent.label_ == "PERSON":
#             name = ent.text.strip()
#             # Skip boilerplate
#             if name.lower() not in ["resume", "curriculum vitae"]:
#                 # Only reasonable length
#                 if 1 < len(name.split()) <= 3:
#                     return name

#     # 2) Fallback: look at the first few lines for a Capitalized “First Last” style
#     for line in text.splitlines()[:3]:
#         m = re.match(r"^([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})$", line.strip())
#         if m:
#             return m.group(1)

#     # 3) If nothing found
#     return None

def extract_name(text):
    header = text[:1000]
    doc = nlp(header)

    # 1) NER + EntityRuler
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            name = ent.text.strip()
            if name.lower() not in ["resume", "curriculum vitae"] and 1 < len(name.split()) <= 3:
                return name

    # 2) Line‑based Capitalized‑Word fallback
    for line in header.splitlines()[:5]:
        m = re.match(r"^([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})$", line.strip())
        if m:
            return m.group(1)

    # 3) Line‑based All‑caps fallback
    for line in header.splitlines()[:5]:
        m = re.match(r"^([A-Z]{2,}(?:\s[A-Z]{2,}){1,2})$", line.strip())
        if m:
            return m.group(1).title()

    # 4) **Global Capitalized‑Words fallback**  ← new!
    names = re.findall(r'([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})', header)
    for nm in names:
        if nm.lower() not in ["resume", "curriculum vitae"]:
            return nm

    # 5) Email‑preceding‑line fallback
    email_match = re.search(r"[\w\.-]+@[\w\.-]+", header)
    if email_match:
        lines = header[:email_match.start()].splitlines()
        if lines:
            cand = lines[-1].strip()
            if 1 < len(cand.split()) <= 3:
                return cand

    # 6) Phone‑preceding‑line fallback
    phone_match = re.search(r"\b(\+?\d{1,4}[\s\-]?)?(\(?\d{3}\)?[\s\-]?)?[\d\s\-]{7,15}\b", header)
    if phone_match:
        lines = header[:phone_match.start()].splitlines()
        if lines:
            cand = lines[-1].strip()
            if 1 < len(cand.split()) <= 3:
                return cand

    print(" Failed to extract name. Header was:", header.splitlines()[:10], flush=True)
    return None


def extract_skills(text):
    doc = nlp(text)
    matches = matcher(doc)
    unique_skills = {}
    for _, start, end in matches:
        st = doc[start:end].text.strip(); key = st.lower()
        if key not in unique_skills: unique_skills[key] = st
    return sorted(unique_skills.values(), key=lambda s: s.lower())


def extract_education(text):
    keywords = ['bachelor','master','b.sc','m.sc','phd','university','college','high school']
    lines = [ln.strip() for ln in text.split('\n') if any(kw in ln.lower() for kw in keywords)]
    return " | ".join(lines) if lines else None


def extract_experience(text):
    keywords = ['experience','worked','internship','employed','project']
    lines = [ln.strip() for ln in text.split('\n') if any(kw in ln.lower() for kw in keywords)]
    return " | ".join(lines) if lines else None


def extract_experience_years(text):
    m = re.search(r"(\d+)(?:\+)?\s+years?", text, flags=re.IGNORECASE)
    return int(m.group(1)) if m else 0


def parse_resume(fp):
    text = extract_text_from_pdf(fp)
    exp_txt = extract_experience(text) or ""
    yrs = extract_experience_years(text)
    parsed = {
        'name': extract_name(text),
        'email': extract_email(text),
        'phone': extract_phone(text),
        'skills': extract_skills(text),
        'education': extract_education(text),
        'experience': exp_txt,
        'experience_years': yrs,
        'certifications': [],
        'raw_text': text[:300] + "..."
    }
    print("Parsed resume data:", flush=True)
    for k, v in parsed.items(): print(f"{k}: {v}", flush=True)
    return parsed
__all__ = ['parse_resume', 'extract_skills', 'skill_list']

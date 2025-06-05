# resume_parser.py

import pdfplumber
import re
import spacy

nlp = spacy.load("en_core_web_sm")

def extract_text_from_pdf(file_path):
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() + "\n"
    return text

def extract_email(text):
    match = re.search(r'[\w\.-]+@[\w\.-]+', text)
    return match.group(0) if match else None

def extract_phone(text):
    match = re.search(r'\b(\+?\d{1,4}[\s\-]?)?(\(?\d{3}\)?[\s\-]?)?[\d\s\-]{7,15}\b', text)
    return match.group(0) if match else None

def extract_name(text):
    doc = nlp(text)
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            return ent.text
    return None

def extract_skills(text):
    # Simple list of common skills to check for
    skills_db = ['python', 'java', 'c++', 'javascript', 'react', 'node', 'sql', 'excel', 'machine learning']
    text_lower = text.lower()
    skills_found = [skill for skill in skills_db if skill in text_lower]
    return skills_found

def extract_education(text):
    # Naive extraction - look for keywords
    education_keywords = ['bachelor', 'master', 'b.sc', 'm.sc', 'phd', 'university', 'college', 'high school']
    edu_lines = []
    for line in text.split('\n'):
        if any(kw in line.lower() for kw in education_keywords):
            edu_lines.append(line.strip())
    return " | ".join(edu_lines) if edu_lines else None

def extract_experience(text):
    # Naive extraction - look for years or words like 'experience', 'worked', 'internship'
    exp_lines = []
    experience_keywords = ['experience', 'worked', 'internship', 'employed', 'project']
    for line in text.split('\n'):
        if any(kw in line.lower() for kw in experience_keywords):
            exp_lines.append(line.strip())
    return " | ".join(exp_lines) if exp_lines else None

def parse_resume(file_path):
    text = extract_text_from_pdf(file_path)
    return {
        "name": extract_name(text),
        "email": extract_email(text),
        "phone": extract_phone(text),
        "skills": extract_skills(text),
        "education": extract_education(text),
        "experience": extract_experience(text),
        "raw_text": text[:300] + "..."
    }


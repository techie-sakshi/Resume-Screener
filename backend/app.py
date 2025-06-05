from flask import Flask, request, jsonify
import os
from resume_parser import parse_resume
from flask_cors import CORS
from scoring import score_candidate
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
load_dotenv()   
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

app = Flask(__name__)
CORS(app)  # ✅ This line is required


@app.route('/')
def home():
    return "Flask backend is running!"

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    question = data.get('question', '').lower()
    resume = data.get('resume', {})

    answer = "Sorry, I couldn't find the information you requested."

    if 'skill' in question:
        skills = resume.get('skills', [])
        if skills:
            answer = "The candidate has skills in " + ", ".join(skills) + "."
        else:
            answer = "No specific skills found in the resume."

    elif 'email' in question:
        answer = "Email: " + resume.get('email', 'Not available.')

    elif 'phone' in question:
        answer = "Phone: " + resume.get('phone', 'Not available.')

    elif 'name' in question:
        answer = "Name: " + resume.get('name', 'Not available.')

    elif 'education' in question:
        education = resume.get('education')
        if education:
            answer = "Education details: " + education
        else:
            answer = "No education details found."

    elif 'experience' in question:
        experience = resume.get('experience')
        if experience:
            answer = "Experience details: " + experience
        else:
            answer = "No experience details found."

    elif 'javascript' in question:
        skills = resume.get('skills', [])
        if any('javascript' in skill.lower() for skill in skills):
            answer = "Yes, the candidate knows JavaScript."
        else:
            answer = "No, JavaScript was not found among the candidate's skills."

    return jsonify({"answer": answer})

@app.route("/score", methods=["POST"])
def score_endpoint():
    data = request.get_json()
    raw_candidates = data.get("candidates", [])
    job_description = data.get("job_description", {})
    weights = data.get("weights")

    scored = []
    for item in raw_candidates:
        # Unwrap parsed_data before scoring:
        candidate_parsed = item.get("parsed_data", {})
        sc = score_candidate(candidate_parsed, job_description, weights)
        scored.append({
            "filename": item.get("filename"),
            "score": sc
        })

    return jsonify({"scored_candidates": scored})

@app.route('/parse_jd', methods=['POST'])
def parse_jd():
    jd_text = request.json.get('jd_text', '').lower()

    # Very basic keyword extraction (replace with better NLP later)
    required_skills = []
    skills_keywords = ['python', 'java', 'aws', 'ml', 'data science', 'react', 'node']

    for skill in skills_keywords:
        if skill in jd_text:
            required_skills.append(skill)

    min_education = 'b.tech' if 'b.tech' in jd_text or 'bachelor' in jd_text else None
    min_experience_years = 0
    import re
    match = re.search(r'(\d+)\+?\s*years?', jd_text)
    if match:
        min_experience_years = int(match.group(1))

    parsed = {
        "required_skills": required_skills,
        "min_education": min_education,
        "min_experience_years": min_experience_years
    }

    return jsonify({"parsed_jd": parsed})



@app.route("/upload-multiple", methods=["POST"])
def upload_multiple():
    """
    Accepts multiple files under the form‐key "resumes" (FormData).
    Returns JSON with a list of parsed resume objects:
      { "parsed_resumes": [ { "filename": "...", "parsed_data": {…} }, … ] }
    """
    # 1️⃣ Ensure files were sent
    if "resumes" not in request.files:
        return jsonify({"message": "No resumes provided"}), 400

    files = request.files.getlist("resumes")
    if len(files) < 1:
        return jsonify({"message": "Please upload at least one resume"}), 400

    os.makedirs("uploads", exist_ok=True)
    parsed_list = []

    for f in files:
        filename = secure_filename(f.filename)
        save_path = os.path.join("uploads", filename)
        f.save(save_path)

        try:
            # 2️⃣ Reuse your existing parse_resume logic on each saved file
            parsed_data = parse_resume(save_path)
            parsed_list.append({
                "filename": filename,
                "parsed_data": parsed_data
            })
        except Exception as e:
            # If one file fails to parse, include an error message but keep going
            parsed_list.append({
                "filename": filename,
                "error": str(e)
            })

    return jsonify({"parsed_resumes": parsed_list})

@app.route('/upload', methods=['POST'])
def upload_resume():
    if 'resume' not in request.files:
        return jsonify({'message': 'No file part in the request'}), 400
    
    file = request.files['resume']
    
    if file.filename == '':
        return jsonify({'message': 'No file selected'}), 400
    
    os.makedirs('uploads', exist_ok=True)
    filepath = os.path.join('uploads', file.filename)
    file.save(filepath)

    try:
        parsed_data = parse_resume(filepath)
    except Exception as e:
        return jsonify({'message': 'Error parsing resume', 'error': str(e)}), 500

    return jsonify({
        'message': 'Resume uploaded and parsed successfully',
        'parsed_data': parsed_data  # use this key so frontend can read data.parsed_data
    })
@app.route("/analytics", methods=["POST"])
def analytics():
    data = request.get_json()
    scored = data.get("scored_candidates", [])
    cutoff = float(data.get("cutoff", 0))

    if not scored:
        return jsonify({"message": "No data provided"}), 400

    scores = [item["score"] for item in scored]
    total = len(scores)
    avg_score = sum(scores) / total if total else 0
    highest = max(scores)
    lowest = min(scores)
    passed = len([s for s in scores if s >= cutoff])
    pass_percentage = (passed / total) * 100 if total else 0

    return jsonify({
        "total_resumes": total,
        "avg_score": round(avg_score, 2),
        "highest_score": highest,
        "lowest_score": lowest,
        "pass_percentage": round(pass_percentage, 2)
    })


if __name__ == '__main__':
    app.run(debug=True)

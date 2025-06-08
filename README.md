🧠 AI Resume Screener

An AI-powered tool to help HR teams upload, screen, and shortlist candidate resumes automatically — complete with analytics, chatbot interface, and email integration.


---

🚀 Demo

Demo video link
https://www.loom.com/share/476e8adfa5e7484fafdac7f6a683f1ea?sid=99c6bdad-b895-4e0e-961d-274729a6d4f6



---

📌 Problem Statement

Build a chatbot to screen resumes, shortlist top candidates, and manage initial interactions.
---

🛠 Tech Stack

🖥 Frontend

React.js – Interactive UI and chatbot interface

Tailwind CSS – Styling and layout

EmailJS – Send email invites directly from the frontend

Chart.js + react-chartjs-2 – Data visualization for resume analytics


🧠 Backend

Python – Resume parsing & matching logic

Flask – RESTful backend for handling resume & JD processing

spaCy – Custom-trained NLP model for extracting key sections (NER)

scikit-learn – Resume scoring based on similarity

PyPDF2 / python-docx – Reading resumes in PDF and DOCX formats

pandas – For data handling and scoring logic



---

📄 Features

✅ 1. Multi-Resume Upload

Upload multiple resumes (PDF/DOCX)

Automatically parses and stores resume details


🧠 2. NLP-Based Resume Parsing

Custom-trained spaCy model

Extracts: Name, Education, Experience, Skills


📝 3. Job Description Parsing

Paste or type JD dynamically

Extracts required skills, education, and experience


⚖ 4. Resume Scoring System

Weighted scoring based on skill/edu/exp match

Custom weightage input by HR (out of 100)


💬 5. AI Chatbot Interface

Interact with the tool via chatbot

View top candidates, shortlist, and invite via email


📧 6. Email Integration

Select and send personalized invites to candidates


📊 7. Resume Analytics Dashboard

Total resumes processed

Score distribution, skill frequency, cutoff %



---

📂 Folder Structure

resume-screener/
├── frontend/        # React + Tailwind
│   ├── components/
│   ├── pages/
│   └── ...
├── backend/         # Flask + Python
│   ├── app.py
│   ├── model.py
│   └── ...
├── README.md


---

🚀 Getting Started

🔧 Prerequisites

Node.js (for frontend)

Python 3.8+

spaCy + scikit-learn + pandas


⚙ Frontend Setup

cd frontend
npm install
npm run dev

🔧 Backend Setup

cd backend
python app.py


---

🧪 Future Scope

Voicebot version of the chatbot

PDF export of shortlist reports

Integration with ATS systems

Candidate feedback scoring



---

🤝 Authors

Sakshi Kumari

Shakshi Yadav




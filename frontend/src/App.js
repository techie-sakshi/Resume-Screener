// App.js
import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

import ChatBot from './components/Chatbot';
import './App.css';

// ───────────────────────────────────────────────────────────────────────────────
// Register Chart.js scales/elements
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);
// ───────────────────────────────────────────────────────────────────────────────

function App() {
  // ── Card 1: Upload Resumes ──
  const [files, setFiles] = useState([]);
  const [parsedResumes, setParsedResumes] = useState([]);
  const [message, setMessage] = useState('');

  // ── Card 2: Job Description (just text) ──
  const [jobDesc, setJobDesc] = useState('');
  const [jdParsed, setJdParsed] = useState(null);

  // ── Card 4: Section Weightage ──
  const [weights, setWeights] = useState({
    skills: 50,
    education: 20,
    experience: 20,
    certifications: 10,
  });

  // ── Card 5: Analytics Data ──
  const [analyticsData, setAnalyticsData] = useState(null);

  // ===== 1) Handle File Upload (Card 1) =====
  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (files.length < 1) return;
    const formData = new FormData();
    files.forEach((file) => formData.append('resumes', file));

    try {
      const res = await fetch('http://localhost:5000/upload-multiple', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setParsedResumes(data.parsed_resumes);
        setMessage('All resumes parsed successfully!');
      } else {
        setMessage(data.message || 'Failed to parse resumes.');
      }
    } catch {
      setMessage('Server error. Please try again.');
    }
  };

  // ===== 2) Parse JD (Card 4’s “Parse JD” button) =====
  const handleJDSubmit = async () => {
    if (!jobDesc.trim()) return;
    try {
      const res = await fetch('http://localhost:5000/parse_jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd_text: jobDesc }),
      });
      const data = await res.json();
      setJdParsed(data.parsed_jd);
    } catch {
      console.error('JD parse error');
    }
  };

  return (
    <div className="app-container">
      {/* ───────────────────── Main Heading ───────────────────── */}
      <h1 className="app-header">AI Resume Screener</h1>

      {/* ───────────────────── First Row ───────────────────── */}
      <div className="cards-row">
        {/* ── Card 1: Upload Resumes ── */}
        <div className="card">
          <h3>Upload Resumes</h3>

          <div
            className="upload-box"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const filesDropped = Array.from(e.dataTransfer.files);
              handleFileChange({ target: { files: filesDropped } });
            }}
          >
            {/* Hidden <input> that opens file dialog when label is clicked */}
            <input
              type="file"
              id="fileInput"
              accept=".pdf,.docx"
              multiple
              onChange={handleFileChange}
              className="file-input-hidden"
            />

            {/* Label wraps icon + text */}
            <label htmlFor="fileInput" className="upload-label">
              <svg
                className="upload-icon"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 3v12m0 0l-3-3m3 3l3-3M5 18h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="upload-text">
                Drag &amp; drop files here
                <br />
                or click to select
              </p>
              <small className="upload-subtext">PDF, DOCX</small>
            </label>
            {files.length > 0 && (
              <p className="file-count">
                {files.length} file{files.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          <button onClick={handleUpload} className="upload-btn">
            Upload
          </button>
          {message && <p className="message">{message}</p>}
        </div>

        {/* ── Card 2: Job Description ── */}
        <div className="card">
          <h3>Job Description</h3>
          <textarea
            className="jobdesc-textarea"
            placeholder="Paste Job Description here..."
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
          />
        </div>
      </div>

      {/* ───────────────────── Second Row ───────────────────── */}
      <div className="cards-row">
        {/* ── Card 3: AI ChatBot ── */}
        <div className="card card-chatbot">
          <h3>AI ChatBot</h3>
          <ChatBot
            parsedResumes={parsedResumes}
            jdParsed={jdParsed}
            weights={weights}
            setAnalyticsData={setAnalyticsData}
          />
        </div>

        {/* ── Right Column (Cards 4 + 5 stacked) ── */}
        <div className="right-column">
          {/* ── Card 4: Section Weightage ── */}
          <div className="card">
            <h3>Section Weightage</h3>
            <div className="weight-inputs">
              {['skills', 'education', 'experience', 'certifications'].map(
                (key) => (
                  <div className="weight-input" key={key}>
                    <label>
                      {key.charAt(0).toUpperCase() + key.slice(1)}:
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={weights[key]}
                      onChange={(e) =>
                        setWeights({
                          ...weights,
                          [key]: Number(e.target.value),
                        })
                      }
                      className="weight-number"
                    />
                  </div>
                )
              )}
            </div>
            <button onClick={handleJDSubmit} className="parse-jd-btn">
              Parse JD
            </button>
          </div>

          {/* ── Card 5: Analytics (only if analyticsData exists) ── */}
          {analyticsData && (
            <div className="card">
              <h3>Analytics</h3>
              <div className="analytics-text">
                <p>
                  🧮 <b>Total Resumes:</b> {analyticsData.total_resumes}
                </p>
                <p>
                  📈 <b>Average Score:</b> {analyticsData.avg_score}
                </p>
                <p>
                  🏆 <b>Highest Score:</b> {analyticsData.highest_score}
                </p>
                <p>
                  🏅 <b>Lowest Score:</b> {analyticsData.lowest_score}
                </p>
                <p>
                  ✅ <b>% Above Cutoff:</b> {analyticsData.pass_percentage}%
                </p>
              </div>

              <Bar
                key={JSON.stringify(analyticsData)}
                data={{
                  labels: ['Passed', 'Failed'],
                  datasets: [
                    {
                      label: 'Candidate Count',
                      data: [
                        Math.round(
                          analyticsData.total_resumes *
                          (analyticsData.pass_percentage / 100)
                        ),
                        Math.round(
                          analyticsData.total_resumes *
                          (1 - analyticsData.pass_percentage / 100)
                        ),
                      ],
                      backgroundColor: ['#4caf50', '#f44336'],
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  animation: false,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* If no resumes parsed, show placeholder below everything */}
      {parsedResumes.length === 0 && (
        <p className="no-resume-msg">No parsed resumes yet</p>
      )}
    </div>
  );
}

export default App;

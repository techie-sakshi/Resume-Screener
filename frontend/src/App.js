import React, { useState } from 'react';
import ChatBot from './components/Chatbot';

function App() {
  const [files, setFiles] = useState([]);
  const [parsedResumes, setParsedResumes] = useState([]);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (files.length < 1) return;

    const formData = new FormData();
    files.forEach(file => formData.append('resumes', file));

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
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Upload Resumes</h2>
      <input type="file" onChange={handleFileChange} multiple />
      <button onClick={handleUpload}>Upload</button>
      <p>{message}</p>

      {parsedResumes.length > 0 ? (
        <ChatBot parsedResumes={parsedResumes} />
      ) : (
        <p>No parsed resumes yet</p>
      )}
    </div>
  );
}

export default App;


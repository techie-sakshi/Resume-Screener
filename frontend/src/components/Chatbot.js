// ChatBot.js
import React, { useState, useEffect } from 'react';
import emailjs from '@emailjs/browser';

export default function ChatBot({
  parsedResumes,
  jdParsed,
  weights,
  setAnalyticsData, // ← receive the setter as a prop
}) {
  const [question, setQuestion] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [lastScores, setLastScores] = useState([]); // [{ name, email, score }]
  const [awaitingCutoff, setAwaitingCutoff] = useState(false);
  const [passedCandidates, setPassedCandidates] = useState([]); // candidates above cutoff

  // Invitation form state
  const [showInvitationForm, setShowInvitationForm] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState([]); // indexes of passedCandidates
  const [inviteMessage, setInviteMessage] = useState('');

  // When jdParsed changes (i.e. Parse JD was clicked in App.js),
  // push a confirmation into chatLog.
  useEffect(() => {
    if (jdParsed) {
      setChatLog((prev) => [
        ...prev,
        {
          sender: 'bot',
          text:
            '✅ Job Description parsed. Now type “score” to get candidate scores (assuming resumes have been uploaded).',
        },
      ]);
    }
  }, [jdParsed]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const lower = question.toLowerCase().trim();
    setChatLog((prev) => [...prev, { sender: 'user', text: question }]);
    setQuestion('');

    // 1) If waiting for cutoff value
    if (awaitingCutoff) {
      const cutoff = parseFloat(lower);
      if (isNaN(cutoff)) {
        setChatLog((prev) => [
          ...prev,
          { sender: 'bot', text: '⚠️ Please enter a valid numeric cutoff.' },
        ]);
        return;
      }

      // Filter out who passed
      const passed = lastScores.filter((item) => item.score >= cutoff);
      if (passed.length === 0) {
        setChatLog((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: `No candidate has a score ≥ ${cutoff}.`,
          },
        ]);
        setAwaitingCutoff(false);
        return;
      }

      // Call /analytics endpoint:
      try {
        const response = await fetch('http://localhost:5000/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scored_candidates: lastScores,
            cutoff: cutoff,
          }),
        });
        const analytics = await response.json();

        // **NEW**: pass analytics data back up to App.js
        setAnalyticsData(analytics);
      } catch (err) {
        console.error('Analytics fetch error:', err);
        setChatLog((prev) => [
          ...prev,
          { sender: 'bot', text: '⚠️ Could not fetch analytics.' },
        ]);
      }

      // Give a “Passed:” line for each candidate, and show invitation form
      passed.forEach((item) => {
        setChatLog((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: `✓ Passed: ${item.name} (${item.email}) — Score: ${item.score}`,
          },
        ]);
      });

      setPassedCandidates(passed);
      setShowInvitationForm(true);
      setAwaitingCutoff(false);
      setChatLog((prev) => [
        ...prev,
        {
          sender: 'bot',
          text:
            '📝 Please select whom you want to invite (checkbox below) and type your invitation message.',
        },
      ]);
      return;
    }

    // 2) If user typed "score"
    if (lower.includes('score')) {
      if (!jdParsed) {
        setChatLog((prev) => [
          ...prev,
          {
            sender: 'bot',
            text:
              '⚠️ Please parse the Job Description first (use the JD card).',
          },
        ]);
        return;
      }
      if (parsedResumes.length === 0) {
        setChatLog((prev) => [
          ...prev,
          {
            sender: 'bot',
            text:
              '⚠️ No resumes have been uploaded yet. Upload resumes before scoring.',
          },
        ]);
        return;
      }

      // Ensure weights sum to 100
      const totalWeight = Object.values(weights).reduce(
        (a, b) => a + Number(b),
        0
      );
      if (totalWeight !== 100) {
        setChatLog((prev) => [
          ...prev,
          {
            sender: 'bot',
            text:
              '⚠️ Please ensure the weights sum to 100 (check the JD card).',
          },
        ]);
        return;
      }

      // Call /score
      try {
        const res = await fetch('http://localhost:5000/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidates: parsedResumes,
            job_description: jdParsed,
            weights: weights,
          }),
        });
        const data = await res.json();
        const scoresArray = data.scored_candidates || [];

        // Build lastScores array from parsedResumes[i].parsed_data
        const combined = scoresArray.map((c, i) => {
          const pd = parsedResumes[i].parsed_data || {};
          return {
            name: pd.name || `Candidate ${i + 1}`,
            email: pd.email || 'no-email@example.com',
            score: c.score,
          };
        });
        setLastScores(combined);

        // Display each score
        combined.forEach((item) => {
          setChatLog((prev) => [
            ...prev,
            { sender: 'bot', text: `${item.name}: ${item.score}` },
          ]);
        });

        // Ask for cutoff
        setChatLog((prev) => [
          ...prev,
          { sender: 'bot', text: 'Please enter a cutoff score (e.g. “75”).' },
        ]);
        setAwaitingCutoff(true);
      } catch (err) {
        console.error('Score fetch error:', err);
        setChatLog((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: '⚠️ Something went wrong while scoring candidates.',
          },
        ]);
      }
      return;
    }

    // 3) Otherwise: fallback to general Q&A (first resume)
    if (parsedResumes.length === 0) {
      setChatLog((prev) => [
        ...prev,
        {
          sender: 'bot',
          text:
            '⚠️ No resumes uploaded yet. Upload a resume or type “score” once resumes are in.',
        },
      ]);
      return;
    }

    if (!jdParsed) {
      setChatLog((prev) => [
        ...prev,
        {
          sender: 'bot',
          text:
            '⚠️ You can ask general questions about the first resume here (e.g. “What skills does this candidate have?”).',
        },
      ]);
      return;
    }

    // If JD is parsed and resumes exist, call /chat for Q&A
    try {
      const res2 = await fetch('http://localhost:5000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question,
          resume: parsedResumes[0].parsed_data,
        }),
      });
      const data2 = await res2.json();
      setChatLog((prev) => [
        ...prev,
        { sender: 'bot', text: data2.answer || 'No answer.' },
      ]);
    } catch (err) {
      console.error('Chat Q&A error:', err);
      setChatLog((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: '⚠️ Could not get an answer right now.',
        },
      ]);
    }
  };

  // Toggle a candidate’s checkbox in the invitation form
  const toggleRecipient = (index) => {
    setSelectedRecipients((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  // Send Invitations via EmailJS
  const handleSendInvitations = async () => {
    if (selectedRecipients.length === 0) {
      setChatLog((prev) => [
        ...prev,
        { sender: 'bot', text: '⚠️ Please select at least one candidate.' },
      ]);
      return;
    }
    if (!inviteMessage.trim()) {
      setChatLog((prev) => [
        ...prev,
        { sender: 'bot', text: '⚠️ Please enter an invitation message.' },
      ]);
      return;
    }

    const serviceID = process.env.REACT_APP_EMAILJS_SERVICE_ID;
    const templateID = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

    let sentList = [];
    let failedList = [];

    for (const idx of selectedRecipients) {
      const candidate = passedCandidates[idx];
      const templateParams = {
        to_name: candidate.name,
        to_email: candidate.email,
        message: inviteMessage,
      };
      try {
        await emailjs.send(serviceID, templateID, templateParams, publicKey);
        sentList.push(candidate.email);
      } catch (err) {
        console.error(err);
        failedList.push(candidate.email);
      }
    }

    if (sentList.length) {
      setChatLog((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `✅ Invitations sent to: ${sentList.join(', ')}`,
        },
      ]);
    }
    if (failedList.length) {
      setChatLog((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `❌ Failed to send to: ${failedList.join(', ')}`,
        },
      ]);
    }

    setShowInvitationForm(false);
    setSelectedRecipients([]);
    setInviteMessage('');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 1) Chat log window */}
      <div className="chat-window">
        {chatLog.map((chat, idx) => (
          <div
            key={idx}
            className="chat-message"
            style={{
              alignSelf: chat.sender === 'user' ? 'flex-end' : 'flex-start',
              backgroundColor:
                chat.sender === 'user' ? '	#2c47b3' : '#3a3a5a',
            }}
          >
            <b>{chat.sender === 'user' ? 'You:' : 'Bot:'} </b>
            {chat.text}
          </div>
        ))}
      </div>

      {/* 2) Invitation form (only if showInvitationForm is true) */}
      {showInvitationForm && (
        <div
          style={{
            border: '1px solid #aaa',
            borderRadius: 'var(--radius)',
            padding: '1rem',
            margin: 'var(--gap) 0',
            backgroundColor: '#2a2a42',
          }}
        >
          <h4 style={{ color: 'var(--text-light)' }}>
            Select Candidates to Invite:
          </h4>

          {passedCandidates.map((item, idx) => (
            <div
              key={idx}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <input
                type="checkbox"
                checked={selectedRecipients.includes(idx)}
                onChange={() => toggleRecipient(idx)}
              />
              <label style={{ color: 'var(--text-light)' }}>
                {item.name} ({item.email}) — Score: {item.score}
              </label>
            </div>
          ))}

          <h4
            style={{
              marginTop: 'var(--gap)',
              color: 'var(--text-light)',
            }}
          >
            Enter Invitation Message:
          </h4>
          <textarea
            rows={4}
            value={inviteMessage}
            onChange={(e) => setInviteMessage(e.target.value)}
            style={{
              width: '100%',
              marginBottom: '0.5rem',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius)',
              backgroundColor: '#1a1a2e',
              color: 'var(--text-light)',
              padding: '0.5rem',
            }}
            placeholder="Dear [Name], we’d like to invite you to …"
          />
          <button
            onClick={handleSendInvitations}
            style={{
              background: 'var(--accent-gradient)',
              border: 'none',
              borderRadius: 'var(--radius)',
              color: 'white',
              padding: '0.6rem 1.2rem',
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            Send Invitations
          </button>
        </div>
      )}

      {/* 3) Text input row for “score” / general Q&A / cutoff */}
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}
      >
        <input
          type="text"
          className="chat-input"
          placeholder={
            awaitingCutoff
              ? 'Enter numeric cutoff (e.g. 75)'
              : 'Ask a question or type “score”'
          }
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button
          type="submit"
          className="chat-send-btn"
          style={{ alignSelf: 'center' }}
        >
          <svg viewBox="0 0 24 24">
            <path d="M2 20l21-8L2 4l7 8-7 8z" />
          </svg>
        </button>
      </form>
    </div>
  );
}

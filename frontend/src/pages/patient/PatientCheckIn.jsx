import { useState } from 'react';
import './PatientCheckIn.css';

const QUICK_SYMPTOMS = ['Headache', 'Nausea', 'Dizziness', 'Fatigue'];

const DEMO_MESSAGES = [
  { id: 1, from: 'ai', text: 'Hello Maria! 👋 How are you feeling today?', time: '10:20 AM' },
  { id: 2, from: 'user', text: "I'm feeling good, but I had a slight headache earlier.", time: '10:21 AM' },
  { id: 3, from: 'ai', text: "I'm sorry to hear about your headache. Can you tell me more about it? When did it start and how would you rate the pain on a scale of 1-10?", time: '10:21 AM' },
];

export default function PatientCheckIn() {
  const [messages, setMessages] = useState(DEMO_MESSAGES);
  const [input, setInput] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages((m) => [
      ...m,
      { id: m.length + 1, from: 'user', text: input.trim(), time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) },
    ]);
    setInput('');
  };

  const addQuickSymptom = (symptom) => {
    setInput((prev) => (prev ? `${prev} ${symptom}` : symptom));
  };

  return (
    <div className="patient-page patient-checkin page-enter">
      <div className="checkin-header">
        <span className="checkin-header-icon">🤖</span>
        <div>
          <h1 className="checkin-title">AI Health Assistant</h1>
          <span className="checkin-status">Online and ready to help</span>
        </div>
      </div>
      <div className="checkin-chat">
        {messages.map((msg) => (
          <div key={msg.id} className={`checkin-message checkin-message-${msg.from}`}>
            <span className="checkin-message-avatar" aria-hidden>
              {msg.from === 'ai' ? '🤖' : '👤'}
            </span>
            <div className="checkin-message-bubble">
              <p>{msg.text}</p>
              <span className="checkin-message-time">{msg.time}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="checkin-quick">
        <span className="checkin-quick-label">QUICK SYMPTOMS:</span>
        <div className="checkin-quick-btns">
          {QUICK_SYMPTOMS.map((s) => (
            <button
              key={s}
              type="button"
              className="checkin-quick-btn"
              onClick={() => addQuickSymptom(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <form className="checkin-input-wrap" onSubmit={handleSend}>
        <button type="button" className="checkin-mic" aria-label="Voice input">🎤</button>
        <input
          type="text"
          className="checkin-input"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Message"
        />
        <button type="submit" className="checkin-send" aria-label="Send">✈</button>
      </form>
    </div>
  );
}

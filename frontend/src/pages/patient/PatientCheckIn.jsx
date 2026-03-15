import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './PatientCheckIn.css';

const QUICK_SYMPTOMS = ['Headache', 'Nausea', 'Dizziness', 'Fatigue'];

const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

const now = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

const getInitialMessages = (name) => [
  { id: 1, from: 'ai', text: `Hello ${name}! 👋 How are you feeling today?`, time: now() },
];

const readSSE = async (response, onEvent) => {
  if (!response.ok || !response.body) {
    throw new Error(`Request failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const chunk of events) {
      const dataLines = chunk
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.replace(/^data:\s?/, ''));

      if (!dataLines.length) continue;

      const payload = dataLines.join('\n').trim();
      if (payload === '[DONE]') return;

      try {
        onEvent(JSON.parse(payload));
      } catch {
        // ignore malformed chunks
      }
    }
  }
};

export default function PatientCheckIn() {
  const navigate = useNavigate();
  const sessionName = sessionStorage.getItem('mediguard_displayName') || 'there';
  const [messages, setMessages] = useState(() => getInitialMessages(sessionName.split(' ')[0]));
  const [input, setInput] = useState('');
  const [patientId, setPatientId] = useState('');
  const [status, setStatus] = useState('Connecting to backend...');
  const [loading, setLoading] = useState(false);
  const pendingAiMessageId = useRef(null);
  const messageId = useRef(2);
  const hasInitialized = useRef(false);

  const sessionUserId = sessionStorage.getItem('mediguard_user_id') || `PT-${Math.random().toString(36).slice(2, 8)}`;
  const assignedDoctorId = sessionStorage.getItem('mediguard_assigned_doctor_id') || 'DR-1001';

  const storedConditions = JSON.parse(localStorage.getItem('mediguard_conditions') || 'null') || ['Type 2 Diabetes'];
  const storedMeds = JSON.parse(localStorage.getItem('mediguard_medications') || 'null') || ['Metformin', 'Lisinopril', 'Atorvastatin'];

  const patientProfile = {
    user_id: sessionUserId,
    assigned_doctor_id: assignedDoctorId,
    name: sessionName,
    age: 41,
    conditions: storedConditions,
    medications: storedMeds,
  };

  const isConnected = useMemo(() => Boolean(patientId), [patientId]);

  const appendMessage = (from, text) => {
    const id = messageId.current++;
    setMessages((m) => [...m, { id, from, text, time: now() }]);
    return id;
  };

  const setupPatient = async () => {
    const res = await fetch(`${API}/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientProfile),
    });
    const data = await res.json();
    if (!res.ok || !data.patient_id) throw new Error('Setup failed');
    setPatientId(data.patient_id);
    localStorage.setItem('mediguard_patient_id', data.patient_id);
    setStatus('Connected to backend');
    return data.patient_id;
  };

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const setup = async () => {
      try {
        await setupPatient();
      } catch {
        setStatus('Backend offline: running in UI-only mode');
      }
    };

    setup();
  }, []);

  // Load chat history once patientId is available
  useEffect(() => {
    if (!patientId) return;

    const loadHistory = async () => {
      try {
        const res = await fetch(`${API}/chat/history/${patientId}`);
        if (!res.ok) return;
        const data = await res.json();
        const msgs = data.messages || [];
        if (msgs.length === 0) return; // keep greeting
        const historyMsgs = msgs.map((m) => ({
          id: messageId.current++,
          from: m.role === 'user' ? 'user' : 'ai',
          text: m.message,
          time: new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        }));
        setMessages(historyMsgs);
      } catch {
        // keep current messages
      }
    };

    loadHistory();
  }, [patientId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    appendMessage('user', userText);
    setInput('');

    if (!patientId) {
      appendMessage('ai', 'I cannot reach the backend right now. Please check if server is running on port 8000.');
      return;
    }

    setLoading(true);
    const aiId = appendMessage('ai', '');
    pendingAiMessageId.current = aiId;

    try {
      const response = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, message: userText }),
      });

      await readSSE(response, (event) => {
        if (event.type === 'token' && pendingAiMessageId.current) {
          setMessages((prev) => prev.map((msg) => (
            msg.id === pendingAiMessageId.current
              ? { ...msg, text: `${msg.text}${event.content || ''}` }
              : msg
          )));
        }

        if (event.type === 'report_ready') {
          if (typeof event.content === 'string') {
            const rKey = sessionStorage.getItem('mediguard_user_id');
            localStorage.setItem(rKey ? `mediguard_latest_report_${rKey}` : 'mediguard_latest_report', event.content);
          }
          appendMessage('ai', 'Doctor report generated. Open the report tab to view it.');
        }

        if (event.type === 'tool_call') {
          appendMessage('ai', `Tool used: ${event.content}`);
        }

        if (event.type === 'error') {
          if (event.content === 'Patient not found') {
            setupPatient()
              .then(() => appendMessage('ai', 'Session refreshed. Please send your message again.'))
              .catch(() => appendMessage('ai', 'Error: Patient session expired and refresh failed.'));
            return;
          }
          appendMessage('ai', `Error: ${event.content}`);
        }
      });
    } catch {
      appendMessage('ai', 'Failed to stream response from backend.');
    } finally {
      pendingAiMessageId.current = null;
      setLoading(false);
    }
  };

  const runProactiveCheckin = async () => {
    if (!patientId || loading) return;
    setLoading(true);
    const aiId = appendMessage('ai', '');
    pendingAiMessageId.current = aiId;

    try {
      const response = await fetch(`${API}/proactive-checkin/${patientId}`, { method: 'POST' });

      await readSSE(response, (event) => {
        if (event.type === 'token' && pendingAiMessageId.current) {
          setMessages((prev) => prev.map((msg) => (
            msg.id === pendingAiMessageId.current
              ? { ...msg, text: `${msg.text}${event.content || ''}` }
              : msg
          )));
        }
      });
    } catch {
      appendMessage('ai', 'Failed to run proactive check-in.');
    } finally {
      pendingAiMessageId.current = null;
      setLoading(false);
    }
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
          <span className="checkin-status">{status}</span>
        </div>
        <button type="button" className="checkin-proactive-btn" onClick={runProactiveCheckin} disabled={!isConnected || loading}>
          Simulate Agent Check-in
        </button>
        <button type="button" className="checkin-proactive-btn" onClick={() => navigate('/dashboard/report')}>
          View Doctor Report
        </button>
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
          disabled={loading}
        />
        <button type="submit" className="checkin-send" aria-label="Send" disabled={loading || !isConnected}>✈</button>
      </form>
    </div>
  );
}

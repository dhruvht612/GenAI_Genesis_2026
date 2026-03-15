import { useState, useCallback } from 'react';
import './MedicationTagInput.css';

export default function MedicationTagInput({ value = [], onChange, placeholder = 'Type medication and press Enter' }) {
  const [input, setInput] = useState('');

  const addTag = useCallback(() => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInput('');
    }
  }, [input, value, onChange]);

  const removeTag = useCallback((index) => {
    onChange(value.filter((_, i) => i !== index));
  }, [value, onChange]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="medication-tag-input">
      <div className="tag-list">
        {value.map((med, i) => (
          <span key={i} className="tag">
            {med}
            <button type="button" className="tag-remove" onClick={() => removeTag(i)} aria-label="Remove">×</button>
          </span>
        ))}
        <input
          type="text"
          className="tag-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={value.length === 0 ? placeholder : ''}
        />
      </div>
    </div>
  );
}

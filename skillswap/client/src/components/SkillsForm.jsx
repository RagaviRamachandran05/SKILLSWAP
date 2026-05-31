import { useState } from 'react';
import axios from 'axios';

const SkillsForm = ({ setSkills, token }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: 'Beginner'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      level: formData.level
    };

    if (!payload.title || !payload.description) {
      setMessage('Please fill all fields properly');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const res = await axios.post(
        'http://localhost:5000/api/skills',
        payload,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSkills((prev) => [res.data, ...prev]);
      setFormData({
        title: '',
        description: '',
        level: 'Beginner'
      });
      setMessage('✅ Skill added successfully!');
    } catch (err) {
      setMessage(
        '❌ Add failed: ' +
          (err.response?.data?.message || err.response?.data?.error || 'Backend needed')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: 'rgba(255,255,255,0.12)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '32px',
        border: '1px solid rgba(0,212,255,0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}
    >
      {message && (
        <div
          role="alert"
          style={{
            background: message.includes('❌')
              ? 'rgba(239,68,68,0.18)'
              : 'rgba(34,197,94,0.18)',
            border: message.includes('❌')
              ? '1px solid rgba(239,68,68,0.35)'
              : '1px solid rgba(34,197,94,0.35)',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '14px',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          {message}
        </div>
      )}

      <div>
        <label
          htmlFor="title"
          style={{
            display: 'block',
            color: 'white',
            marginBottom: '8px',
            fontWeight: '600'
          }}
        >
          Skill Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          placeholder="React, Python..."
          value={formData.title}
          onChange={handleChange}
          required
          style={{
            width: '80%',
            padding: '18px 24px',
            background: 'rgba(255,255,255,0.15)',
            border: '2px solid rgba(0,212,255,0.4)',
            borderRadius: '20px',
            color: 'white',
            fontSize: '16px',
            outline: 'none'
          }}
        />
      </div>

      <div>
        <label
          htmlFor="description"
          style={{
            display: 'block',
            color: 'white',
            marginBottom: '8px',
            fontWeight: '600'
          }}
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          placeholder="What can you teach?"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          required
          style={{
            width: '80%',
            padding: '18px 24px',
            background: 'rgba(255,255,255,0.15)',
            border: '2px solid rgba(0,212,255,0.4)',
            borderRadius: '20px',
            color: 'white',
            fontSize: '16px',
            resize: 'vertical',
            outline: 'none'
          }}
        />
      </div>

      <div>
        <label
          htmlFor="level"
          style={{
            display: 'block',
            color: 'white',
            marginBottom: '8px',
            fontWeight: '600'
          }}
        >
          Skill Level
        </label>
        <select
          id="level"
          name="level"
          value={formData.level}
          onChange={handleChange}
          style={{
            width: '100%',
            padding: '18px 24px',
            background: '#5199dd',
            border: '2px solid rgba(0,212,255,0.4)',
            borderRadius: '20px',
            color: 'white',
            fontSize: '16px',
            outline: 'none',
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none'
          }}
        >
          <option value="Beginner" style={{ backgroundColor: '#102a43', color: 'white' }}>
            Beginner
          </option>
          <option value="Intermediate" style={{ backgroundColor: '#102a43', color: 'white' }}>
            Intermediate
          </option>
          <option value="Advanced" style={{ backgroundColor: '#102a43', color: 'white' }}>
            Advanced
          </option>
          <option value="Expert" style={{ backgroundColor: '#102a43', color: 'white' }}>
            Expert
          </option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '20px',
          background: loading
            ? 'rgba(0,212,255,0.4)'
            : 'linear-gradient(135deg, #00d4ff, #0099cc)',
          color: 'white',
          border: 'none',
          borderRadius: '24px',
          fontSize: '18px',
          fontWeight: '700',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? '⏳ Adding...' : '➕ Add Skill'}
      </button>
    </form>
  );
};

export default SkillsForm;
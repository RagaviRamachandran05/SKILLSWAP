import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SkillMatching = ({ token }) => {
  const [skills, setSkills] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const searchInputRef = useRef(null);

  // ✅ FIXED: Proper debounce with 300ms delay
  useEffect(() => {
    const timeoutId = setTimeout(async () => { // ✅ 300ms DELAY ADDED
      setLoading(true);
      try {
        const params = search ? `?search=${search}` : '';
        const res = await axios.get(`http://localhost:5000/api/skills/public${params}`);
        setSkills(res.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }, 300); // ✅ THIS WAS MISSING!

    return () => clearTimeout(timeoutId);
  }, [search]);

  // Keep input focused
  useEffect(() => {
    searchInputRef.current?.focus();
  });

const requestSwap = async (skill) => {
  if (!window.confirm(`Request swap "${skill.title}" with ${skill.userId.name}?`)) return;
  
  try {
    const mySkillsRes = await axios.get('http://localhost:5000/api/skills', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!mySkillsRes.data.length) {
      alert('⚠️ Add skills first → Dashboard → ➕');
      return;
    }
    
    const response = await axios.post('http://localhost:5000/api/requests', {
      fromUserId: mySkillsRes.data[0].userId,
      toUserId: skill.userId,
      fromSkillId: mySkillsRes.data[0]._id,
      toSkillId: skill._id
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    alert(`✅ SWAP REQUEST SENT to ${skill.userId.name}!`);
  } catch (err) {
    alert(err.response?.data?.message || 'Failed');
  }
};

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0a192f 0%, #1e3a8a 100%)',
      color: 'white', 
      padding: '40px' 
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <button 
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '25px',
            marginBottom: '32px',
            cursor: 'pointer'
          }}
          tabIndex={-1}
        >
          ← Back to Dashboard
        </button>

        <h1 style={{
          fontSize: '36px',
          background: 'linear-gradient(135deg, #00d4ff, #60f0ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '32px'
        }}>
          🔍 Find Skills to Swap
        </h1>

        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search React, Python, Java..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          style={{
            width: '100%',
            maxWidth: '500px',
            padding: '16px 24px',
            border: '2px solid rgba(0,212,255,0.4)',
            borderRadius: '25px',
            background: 'rgba(255,255,255,0.15)',
            color: 'white',
            fontSize: '16px',
            marginBottom: '40px',
            outline: 'none'
          }}
        />

        {/* Rest of your JSX stays EXACTLY same */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
          gap: '24px' 
        }}>
          {skills.map((skill) => (
            <div key={skill._id} style={{
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              padding: '32px',
              border: '1px solid rgba(0,212,255,0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 25px 50px rgba(0,212,255,0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <img 
                  src={skill.userId?.avatar || 'https://ui-avatars.com/api/?name=User&background=0d8abc&color=fff'} 
                  alt="User"
                  style={{ width: '50px', height: '50px', borderRadius: '50%', border: '3px solid #00d4ff' }}
                />
                <div>
                  <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', margin: 0 }}>
                    {skill.title}
                  </h3>
                  <p style={{ color: '#00d4ff', fontWeight: '600', margin: '4px 0 0 0' }}>
                    by {skill.userId?.name || 'Someone'}
                  </p>
                </div>
              </div>
              
              <p style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '20px', lineHeight: '1.6' }}>
                {skill.description}
              </p>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{
                  background: 'rgba(0,212,255,0.3)',
                  color: '#00d4ff',
                  padding: '10px 20px',
                  borderRadius: '25px',
                  fontWeight: '700'
                }}>
                  {skill.level}
                </span>
                <button
                  onClick={() => requestSwap(skill)}
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '25px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    marginLeft: 'auto'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 12px 24px rgba(16,185,129,0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  🚀 Request Swap
                </button>
              </div>
            </div>
          ))}
        </div>

        {skills.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '64px', color: 'rgba(255,255,255,0.6)' }}>
            <h3>No skills found 😔</h3>
            <p>Try searching for "React", "Python", or add some skills first!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillMatching;

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import SkillsForm from './SkillsForm';

const Dashboard = ({ token }) => {
  const [, setActiveChats] = useState([]);
  const [skills, setSkills] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newMessages, setNewMessages] = useState(0);
  const navigate = useNavigate();

  const authHeaders = useCallback(() => {
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  const fetchActiveChats = useCallback(async () => {
    const headers = authHeaders();
    if (!headers) return;

    try {
      const res = await axios.get('https://skillswap-cd9o.onrender.com/api/requests/active-chats', {
        headers
      });
      console.log('✅ Active chats loaded:', res.data.activeChats?.length || 0);
      setActiveChats(res.data.activeChats || []);
    } catch (err) {
      console.error('Chats fetch failed:', err.response?.status, err.response?.data);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      navigate('/');
      return;
    }

    const fetchData = async () => {
      const headers = authHeaders();
      if (!headers) return;

      try {
        const [skillsRes, userRes] = await Promise.all([
          axios.get('https://skillswap-cd9o.onrender.com/api/skills', { headers }),
          axios.get('https://skillswap-cd9o.onrender.com/api/auth/me', { headers })
        ]);

        setSkills(Array.isArray(skillsRes.data) ? skillsRes.data : []);
        setUser(userRes.data);
      } catch (err) {
        console.error('Dashboard fetch failed:', err.response?.status, err.response?.data);

        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, navigate, authHeaders]);

  useEffect(() => {
    if (!token) return;

    fetchActiveChats();
    const interval = setInterval(fetchActiveChats, 10000);
    return () => clearInterval(interval);
  }, [token, fetchActiveChats]);

  useEffect(() => {
    if (!token || !user?._id) return;

    const checkNewMessages = async () => {
      try {
        const res = await axios.get('https://skillswap-cd9o.onrender.com/api/requests/active-chats', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const chats = res.data.activeChats || [];

        const unreadCount = chats.reduce((total, chat) => {
          const unread = chat.messages?.filter(
            (msg) => msg.sender?._id !== user._id && !msg.read
          ).length || 0;
          return total + unread;
        }, 0);

        setNewMessages(unreadCount);
      } catch (err) {
        console.error('New messages check failed:', err.response?.status, err.response?.data);
      }
    };

    checkNewMessages();
    const interval = setInterval(checkNewMessages, 10000);
    return () => clearInterval(interval);
  }, [token, user?._id]);

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleEdit = async (skill) => {
    const newTitle = prompt('Edit skill title:', skill.title);
    const newDesc = prompt('Edit description:', skill.description);
    const newLevel = prompt('Edit level (Beginner/Intermediate/Advanced/Expert):', skill.level);

    if (!newTitle || !newDesc || !newLevel) return;

    try {
      const res = await axios.put(
        `https://skillswap-cd9o.onrender.com/api/skills/${skill._id}`,
        {
          title: newTitle,
          description: newDesc,
          level: newLevel
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSkills((prev) =>
        prev.map((s) => (s._id === skill._id ? res.data : s))
      );
    } catch (err) {
      console.error('Edit failed:', err.response?.status, err.response?.data);
      alert('Edit failed');
    }
  };

  const handleDelete = async (skillId) => {
    if (!window.confirm('Delete this skill?')) return;

    try {
      await axios.delete(`https://skillswap-cd9o.onrender.com/api/skills/${skillId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSkills((prev) => prev.filter((skill) => skill._id !== skillId));
    } catch (err) {
      console.error('Delete failed:', err.response?.status, err.response?.data);
      alert('Delete failed');
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #00d4ff, #0099cc)'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '6px solid rgba(255,255,255,0.3)',
          borderTop: '6px solid #00d4ff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a192f 0%, #1e3a8a 100%)',
      color: 'white',
      overflowX: 'hidden'
    }}>
      <header style={{
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)',
        padding: '24px 0',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{
                fontSize: '32px',
                fontWeight: '800',
                background: 'linear-gradient(135deg, #00d4ff, #60f0ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: 0
              }}>
                SkillSwap Pro
              </h1>
              <p style={{ opacity: 0.8, marginTop: '4px', marginBottom: 0 }}>Manage your skills & grow</p>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Link to="/skill-matching" style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '50px',
                fontWeight: '600',
                textDecoration: 'none'
              }}>
                Find Skills
              </Link>

              <Link to="/requests" style={{
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '50px',
                fontWeight: '600',
                textDecoration: 'none'
              }}>
                Requests
              </Link>

              <button
                onClick={() => navigate('/chatrooms')}
                style={{
                  padding: '12px 20px',
                  background: 'rgba(59,130,246,0.3)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                ChatRooms {newMessages > 0 ? `(${newMessages} new)` : ''}
              </button>

              <button
                onClick={() => navigate(`/profile/${user?._id}`)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                  padding: '12px 20px',
                  borderRadius: '20px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Profile
              </button>

              <div style={{
                background: 'rgba(0,212,255,0.2)',
                padding: '12px 20px',
                borderRadius: '50px',
                fontWeight: '600'
              }}>
                Hi, {user?.name || 'User'}
              </div>

              <button
                onClick={logout}
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: 'white',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '50px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          marginBottom: '48px'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid rgba(0,212,255,0.3)'
          }}>
            <div style={{ fontSize: '48px', fontWeight: '800', color: '#00d4ff' }}>
              {skills.length}
            </div>
            <div style={{ fontSize: '18px', opacity: 0.9, marginTop: '8px' }}>Total Skills</div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid rgba(0,212,255,0.3)'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '700', wordBreak: 'break-word' }}>
              {user?.email || 'No email'}
            </div>
            <div style={{ fontSize: '16px', opacity: 0.9, marginTop: '8px' }}>Email</div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid rgba(0,212,255,0.3)'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#00d4ff' }}>Pro</div>
            <div style={{ fontSize: '16px', opacity: 0.9, marginTop: '8px' }}>Plan</div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '48px',
          alignItems: 'start'
        }}>
          <div>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '700',
              marginBottom: '24px',
              background: 'linear-gradient(135deg, #00d4ff, #60f0ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Add New Skill
            </h2>
            <SkillsForm setSkills={setSkills} token={token} />
          </div>

          <div>
            <div style={{
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              padding: '32px',
              border: '1px solid rgba(0,212,255,0.3)',
              minHeight: '400px'
            }}>
              <h2 style={{
                fontSize: '28px',
                fontWeight: '700',
                marginBottom: '32px',
                background: 'linear-gradient(135deg, #00d4ff, #60f0ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Your Skills ({skills.length})
              </h2>

              {skills.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '64px 32px',
                  color: 'rgba(255,255,255,0.6)'
                }}>
                  <div style={{ fontSize: '64px', marginBottom: '24px' }}>✨</div>
                  <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px' }}>
                    No skills yet
                  </h3>
                  <p>Add your first skill above!</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '20px' }}>
                  {skills.map((skill) => (
                    <div
                      key={skill._id}
                      style={{
                        background: 'rgba(0,212,255,0.15)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '20px',
                        padding: '24px',
                        border: '1px solid rgba(0,212,255,0.3)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '12px',
                        gap: '12px'
                      }}>
                        <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#fff', margin: 0 }}>
                          {skill.title}
                        </h3>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleEdit(skill)}
                            style={{
                              padding: '8px 16px',
                              background: 'rgba(34,197,94,0.8)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '10px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDelete(skill._id)}
                            style={{
                              padding: '8px 16px',
                              background: 'rgba(239,68,68,0.8)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '10px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <p style={{
                        color: 'rgba(255,255,255,0.9)',
                        marginBottom: '16px',
                        lineHeight: '1.5'
                      }}>
                        {skill.description}
                      </p>

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{
                          background: 'rgba(0,212,255,0.3)',
                          color: '#00d4ff',
                          padding: '8px 20px',
                          borderRadius: '25px',
                          fontSize: '15px',
                          fontWeight: '700'
                        }}>
                          Level {skill.level}
                        </span>

                        <span style={{
                          color: 'rgba(255,255,255,0.7)',
                          fontSize: '14px'
                        }}>
                          {skill.createdAt ? new Date(skill.createdAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        button:hover {
          opacity: 0.95;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
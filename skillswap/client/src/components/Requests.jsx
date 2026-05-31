import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Requests = ({ token }) => {
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [totalRequests, setTotalRequests] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('requests');

  useEffect(() => {
    fetchRequests();
  }, [refreshKey, token]);

  const fetchRequests = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/requests/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSentRequests(res.data.sentRequests || []);
      setReceivedRequests(res.data.receivedRequests || []);

       // setTotalRequests((res.data.sentRequests?.length || 0) + (res.data.receivedRequests?.length || 0));

    } catch (err) {
      console.error('Requests fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

     useEffect(() => {
  // ✅ CALCULATE after BOTH states update!
  setTotalRequests(sentRequests.length + receivedRequests.length);
}, [sentRequests, receivedRequests]);

  // ✅ PERFECT Accept with Popup
  const handleAccept = async (requestId, fromUserName) => {
    try {
      const res = await axios.put(`http://localhost:5000/api/requests/${requestId}/status`, {
        status: 'accepted'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Accepted! Chat created:', res.data.chatRoomId);
      
      // 🎉 CHAT CREATED POPUP
      alert(`🎉 Chat created with ${fromUserName}!\n\n💬 Go to ChatRooms tab to start messaging 👈`);
      
      setRefreshKey(prev => prev + 1); // Refresh list
    } catch (err) {
      console.error('Accept error:', err);
      alert('Failed to accept request');
    }
  };

  const handleReject = async (requestId) => {
    try {
      await axios.put(`http://localhost:5000/api/requests/${requestId}/status`, 
        { status: 'rejected' }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRefreshKey(prev => prev + 1);
      alert('❌ Request rejected');
    } catch (err) {
      alert('Failed to reject');
    }
  };

  // ✅ STATUS BADGES
  const renderStatusBadge = (status) => {
    switch(status) {
      case 'accepted':
        return (
          <span style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '25px',
            fontSize: '13px',
            fontWeight: '700',
            boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
          }}>
            ✅ ACCEPTED
          </span>
        );
      case 'rejected':
        return (
          <span style={{
            background: 'rgba(239,68,68,0.2)',
            color: '#f87171',
            padding: '8px 16px',
            borderRadius: '25px',
            fontSize: '13px',
            fontWeight: '700',
            border: '1px solid rgba(239,68,68,0.5)'
          }}>
            ❌ REJECTED
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #0a192f 0%, #1e3a8a 100%)',
        color: 'white', 
        padding: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
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
      padding: '48px 24px' 
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* HEADER */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '48px' 
        }}>
          <h1 style={{ 
            fontSize: '36px', 
            fontWeight: '800', 
            background: 'linear-gradient(135deg, #00d4ff, #60f0ff)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}>
            📋 Requests & Status
          </h1>
          <Link to="/dashboard" style={{ 
            background: 'rgba(255,255,255,0.2)', 
            color: 'white', 
            padding: '14px 28px', 
            borderRadius: '30px', 
            textDecoration: 'none',
            fontWeight: '600',
            backdropFilter: 'blur(10px)'
          }}>
            ← Dashboard
          </Link>
        </div>

        {/* TABS */}
        <div style={{ 
          background: 'rgba(255,255,255,0.1)', 
          borderRadius: '30px', 
          padding: '32px', 
          marginBottom: '40px',
          border: '1px solid rgba(255,255,255,0.2)',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
            <button onClick={() => setActiveTab('requests')} style={{
              padding: '16px 40px',
              background: activeTab === 'requests' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.15)',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              fontWeight: '700',
              fontSize: '16px',
              cursor: 'pointer',
              boxShadow: activeTab === 'requests' ? '0 8px 25px rgba(16,185,129,0.4)' : 'none'
            }}>
              📋 Requests ({receivedRequests.filter(r => r.status === 'pending').length})
            </button>
            <button onClick={() => setActiveTab('sent')} style={{
              padding: '16px 40px',
              background: activeTab === 'sent' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.15)',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              fontWeight: '700',
              fontSize: '16px',
              cursor: 'pointer',
              boxShadow: activeTab === 'sent' ? '0 8px 25px rgba(16,185,129,0.4)' : 'none'
            }}>
              📤 Sent ({sentRequests.length})
            </button>
          </div>

          {/* REQUESTS TAB */}
          {activeTab === 'requests' && (
            <div>
              <h3 style={{ 
                fontSize: '28px', 
                marginBottom: '32px', 
                color: '#00d4ff',
                background: 'linear-gradient(135deg, #00d4ff, #60f0ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                📥 Incoming Requests ({receivedRequests.filter(r => r.status === 'pending').length})
              </h3>
              {receivedRequests.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '80px 40px', 
                  color: 'rgba(255,255,255,0.6)' 
                }}>
                  <div style={{ fontSize: '64px', marginBottom: '24px' }}>📨</div>
                  <h3 style={{ fontSize: '24px', marginBottom: '12px' }}>No incoming requests</h3>
                  <p style={{ fontSize: '16px' }}>Share your skills to get swap requests!</p>
                </div>
              ) : (
                receivedRequests.map(request => (
                  <div key={request._id} style={{
                    background: 'rgba(255,255,255,0.12)',
                    padding: '32px',
                    borderRadius: '25px',
                    marginBottom: '24px',
                    border: `3px solid ${
                      request.status === 'accepted' ? '#10b981' : 
                      request.status === 'rejected' ? '#ef4444' : 
                      'rgba(255,255,255,0.3)'
                    }`,
                    backdropFilter: 'blur(15px)',
                    transition: 'all 0.3s ease',
                    cursor: request.status !== 'pending' ? 'default' : 'pointer'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '20px'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ 
                          margin: '0 0 12px 0', 
                          fontSize: '24px', 
                          color: '#fff',
                          fontWeight: '700'
                        }}>
                          {request.fromUser?.name} wants to swap
                        </h4>
                        <p style={{ 
                          color: 'rgba(255,255,255,0.9)', 
                          margin: '0 0 16px 0',
                          fontSize: '18px'
                        }}>
                          {request.fromSkill?.title} ↔ {request.toSkill?.title}
                        </p>
                        {renderStatusBadge(request.status)}
                      </div>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        {request.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => handleAccept(request._id, request.fromUser?.name)}
                              style={{
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: 'white',
                                padding: '16px 32px',
                                border: 'none',
                                borderRadius: '30px',
                                fontWeight: '700',
                                fontSize: '16px',
                                cursor: 'pointer',
                                boxShadow: '0 8px 25px rgba(16,185,129,0.4)',
                                transition: 'all 0.3s ease'
                              }}
                              onMouseOver={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 12px 35px rgba(16,185,129,0.5)';
                              }}
                              onMouseOut={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 8px 25px rgba(16,185,129,0.4)';
                              }}
                            >
                              ✅ Accept
                            </button>
                            <button 
                              onClick={() => handleReject(request._id)}
                              style={{
                                background: 'rgba(239,68,68,0.2)',
                                color: '#f87171',
                                padding: '16px 32px',
                                border: '2px solid rgba(239,68,68,0.5)',
                                borderRadius: '30px',
                                fontWeight: '700',
                                fontSize: '16px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                              }}
                              onMouseOver={(e) => {
                                e.target.style.background = 'rgba(239,68,68,0.4)';
                              }}
                              onMouseOut={(e) => {
                                e.target.style.background = 'rgba(239,68,68,0.2)';
                              }}
                            >
                              ❌ Reject
                            </button>
                          </>
                        )}
                        {request.status === 'accepted' && (
                          <button 
                            onClick={() => navigate('/chatrooms')}
                            style={{
                              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                              color: 'white',
                              padding: '16px 32px',
                              border: 'none',
                              borderRadius: '30px',
                              fontWeight: '700',
                              fontSize: '16px',
                              cursor: 'pointer',
                              boxShadow: '0 8px 25px rgba(59,130,246,0.4)'
                            }}
                          >
                            💬 Open Chat
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SENT TAB */}
          {activeTab === 'sent' && (
            <div>
              <h3 style={{ 
                fontSize: '28px', 
                marginBottom: '32px', 
                color: '#00d4ff'
              }}>
                📤 Your Sent Requests ({sentRequests.length})
              </h3>
              {sentRequests.map(request => (
                <div key={request._id} style={{
                  background: 'rgba(255,255,255,0.12)',
                  padding: '24px',
                  borderRadius: '20px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <h4>{request.toUser?.name}</h4>
                      <p>{request.fromSkill?.title} ↔ {request.toSkill?.title}</p>
                      {renderStatusBadge(request.status)}
                    </div>
                    <span style={{ opacity: 0.7 }}>
                      {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Requests;

// client/src/components/Profile.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Profile = ({ token }) => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

 // 👈 REPLACE useEffect in Profile.jsx (lines 15-20)
useEffect(() => {
  fetchProfile();
  checkOwnProfile();
}, [userId, token]);  // 👈 FIXED dependencies


  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:5000/api/auth/profile/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(res.data);
      setError(null);
    } catch (err) {
      console.error('Profile fetch error:', err);
      setError('Profile not found');
    } finally {
      setLoading(false);
    }
  };

  const checkOwnProfile = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsOwnProfile(res.data._id === userId);
    } catch (err) {
      console.error('Own profile check error:', err);
    }
  };

  // 👈 LOADING SCREEN
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%)'
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

  // 👈 ERROR SCREEN
  if (error || !profile) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '20px'
      }}>
        <div>
          <h2 style={{ fontSize: '28px', marginBottom: '16px' }}>👤 Profile Not Found</h2>
          <p style={{ opacity: 0.8, marginBottom: '32px' }}>{error || 'User does not exist'}</p>
          <button 
            onClick={() => navigate(-1)}
            style={{
              background: 'linear-gradient(135deg, #00d4ff, #0099cc)',
              color: 'white',
              padding: '16px 32px',
              border: 'none',
              borderRadius: '20px',
              fontSize: '18px',
              cursor: 'pointer'
            }}
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%)',
      padding: '48px 24px',
      color: 'white'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '20px',
            cursor: 'pointer',
            marginBottom: '48px',
            fontWeight: '600'
          }}
        >
          ← Back to Dashboard
        </button>

        {/* Profile Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '48px',
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '48px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontSize: '96px', marginBottom: '24px' }}>👤</div>
          {/* 👈 SAFE RENDERING - profile.name exists */}
          <h1 style={{ fontSize: '40px', margin: '0 0 16px 0' }}>
            {profile.name || 'Unknown User'}
          </h1>
          <p style={{ color: '#00d4ff', fontSize: '20px', margin: '0 0 24px 0' }}>
            {profile.email || 'No email'}
          </p>
          
          {profile.bio && (
            <p style={{ 
              color: 'rgba(255,255,255,0.9)', 
              fontSize: '18px', 
              marginBottom: '32px',
              lineHeight: '1.6',
              fontStyle: 'italic'
            }}>
              "{profile.bio}"
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: '24px', 
          marginBottom: '48px' 
        }}>
          <div style={{
            background: 'rgba(16,185,129,0.2)',
            backdropFilter: 'blur(20px)',
            border: '2px solid #10b981',
            borderRadius: '20px',
            padding: '32px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', color: '#10b981' }}>🏆</div>
            <h3 style={{ color: '#fff', margin: '16px 0 12px 0', fontSize: '18px' }}>Total Swaps</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
              {profile.totalSwaps || 0}
            </div>
          </div>

          <div style={{
            background: 'rgba(139,92,246,0.2)',
            backdropFilter: 'blur(20px)',
            border: '2px solid #8b5cf6',
            borderRadius: '20px',
            padding: '32px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', color: '#8b5cf6' }}>📚</div>
            <h3 style={{ color: '#fff', margin: '16px 0 12px 0', fontSize: '18px' }}>Skills Taught</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6' }}>
              {profile.skillsTaught || 0}
            </div>
          </div>

          <div style={{
            background: 'rgba(59,130,246,0.2)',
            backdropFilter: 'blur(20px)',
            border: '2px solid #3b82f6',
            borderRadius: '20px',
            padding: '32px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', color: '#3b82f6' }}>🎯</div>
            <h3 style={{ color: '#fff', margin: '16px 0 12px 0', fontSize: '18px' }}>Skills Learned</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>
              {profile.skillsLearned || 0}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          {isOwnProfile && (
            <button style={{
              background: 'linear-gradient(135deg, #00d4ff, #0099cc)',
              color: 'white',
              padding: '18px 36px',
              border: 'none',
              borderRadius: '25px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer',
              marginRight: '20px',
              boxShadow: '0 10px 30px rgba(0,212,255,0.4)'
            }}>
              ✏️ Edit Profile
            </button>
          )}
          <button style={{
            background: 'rgba(255,255,255,0.15)',
            color: 'white',
            padding: '18px 36px',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '25px',
            fontSize: '18px',
            cursor: 'pointer',
            boxShadow: '0 5px 20px rgba(0,0,0,0.2)'
          }}>
            💬 Send Message
          </button>
        </div>

        {/* Member Since */}
        <div style={{
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '24px',
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <p style={{ 
            color: 'rgba(255,255,255,0.7)', 
            fontSize: '16px', 
            margin: 0,
            fontWeight: '500'
          }}>
            Member since {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}
          </p>
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

export default Profile;

import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Login = ({ setToken }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isSubmitting = useRef(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading || isSubmitting.current) return;

    const email = formData.email.trim();
    const password = formData.password;

    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    isSubmitting.current = true;
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });

      if (!res.data?.token) {
        throw new Error('No token received');
      }

      console.log('✅ LOGIN SUCCESS: Token received!');

      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      navigate('/dashboard');
    } catch (err) {
      console.error('❌ LOGIN ERROR:', err.response?.data || err.message);
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Login failed'
      );
    } finally {
      setLoading(false);
      setTimeout(() => {
        isSubmitting.current = false;
      }, 500);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a192f 0%, #1e3a8a 100%)',
      padding: '24px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '24px',
        padding: '32px',
        color: 'white',
        boxShadow: '0 20px 40px rgba(0,0,0,0.25)'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '800',
          marginBottom: '8px',
          textAlign: 'center'
        }}>
          Login
        </h1>

        <p style={{
          textAlign: 'center',
          opacity: 0.8,
          marginBottom: '28px'
        }}>
          Welcome back
        </p>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.18)',
            border: '1px solid rgba(239,68,68,0.35)',
            color: '#ffd5d5',
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600'
            }}>
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              autoComplete="email"
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.08)',
                color: 'white',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600'
            }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.08)',
                color: 'white',
                outline: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 18px',
              border: 'none',
              borderRadius: '14px',
              background: loading
                ? 'rgba(0,212,255,0.4)'
                : 'linear-gradient(135deg, #00d4ff, #0099cc)',
              color: 'white',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p style={{
          marginTop: '20px',
          textAlign: 'center',
          opacity: 0.85
        }}>
          Don&apos;t have an account?{' '}
          <Link to="/register" style={{ color: '#60f0ff', fontWeight: '700' }}>
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
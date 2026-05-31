import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import SkillMatching from './components/SkillMatching';
import Requests from './components/Requests';
import Profile from './components/Profile';
import ChatRooms from './components/ChatRooms';
import LiveChat from './components/LiveChat';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  useEffect(() => {
    const handleStorage = () => {
      setToken(localStorage.getItem('token'));
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const ProtectedRoute = ({ children }) => {
    if (!token) return <Login setToken={setToken} />;
    return children;
  };

  return (
    <Router>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a192f 0%, #1e3a8a 50%, #00d4ff 100%)'
      }}>
        <Routes>
          <Route path="/" element={<Login setToken={setToken} />} />
          <Route path="/register" element={<Register setToken={setToken} />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard token={token} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile/:userId"
            element={
              <ProtectedRoute>
                <Profile token={token} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/skill-matching"
            element={
              <ProtectedRoute>
                <SkillMatching token={token} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/requests"
            element={
              <ProtectedRoute>
                <Requests token={token} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/chatrooms"
            element={
              <ProtectedRoute>
                <ChatRooms token={token} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/chat/:chatId"
            element={
              <ProtectedRoute>
                <LiveChat token={token} />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
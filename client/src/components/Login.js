import React, { useState } from 'react';
import axios from 'axios';
import '../styles/Auth.css';

function Login({ onLoginSuccess, onSwitchToRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Demo accounts
  const demoAccounts = [
    { username: 'admin_user', password: 'password123', role: 'Admin' },
    { username: 'john_doe', password: 'password123', role: 'User' }
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/login', {
        username,
        password
      });

      if (response.data.success) {
        // Store token in localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        onLoginSuccess(response.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoUsername) => {
    setUsername(demoUsername);
    setPassword('password123');
    
    // Simulate form submission
    setTimeout(() => {
      const form = new FormData();
      form.append('username', demoUsername);
      form.append('password', 'password123');
    }, 100);

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/login', {
        username: demoUsername,
        password: 'password123'
      });

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        onLoginSuccess(response.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>🎬 BookMySeat</h1>
        <h2>Login</h2>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="auth-divider">Demo Accounts</div>

        <div className="demo-accounts">
          {demoAccounts.map((account) => (
            <button
              key={account.username}
              className="demo-btn"
              onClick={() => handleDemoLogin(account.username)}
              disabled={loading}
            >
              <span className="demo-label">{account.role}</span>
              <span className="demo-username">{account.username}</span>
            </button>
          ))}
        </div>

        <div className="auth-footer">
          <p>Don't have an account? 
            <button
              type="button"
              className="link-btn"
              onClick={onSwitchToRegister}
            >
              Register here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;

import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.msg || err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-badge">A</div>
        <h2 className="auth-title">Create Account</h2>
        <p className="auth-subtitle">Start tracking your A/L studies today</p>

        {error && (
          <div style={{
            background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 'var(--radius-sm)', padding: '0.65rem 1rem',
            color: '#f87171', fontSize: '0.82rem', marginBottom: '1.25rem', textAlign: 'center'
          }}>{error}</div>
        )}

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} minLength="6" required />
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <button type="submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </div>
        </form>

        <p className="link-text">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

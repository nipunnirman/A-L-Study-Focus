import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import WeeklyReport from './pages/WeeklyReport';

const PrivateRoute = ({ children }) => {
  const { user, loading } = React.useContext(AuthContext);
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.85rem', letterSpacing: '0.1em' }}>LOADING…</div>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" />;
};

const Navbar = () => {
  const { user, logout } = React.useContext(AuthContext);
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Morning';
    if (hour < 18) return 'Afternoon';
    return 'Evening';
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="navbar-logo">A</div>
        <h3>A/L Study Focus</h3>
      </div>
      {user && (
        <div className="nav-links">
          <div className="nav-clock">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <span className="nav-greeting">Good {getGreeting()}, {user.name.split(' ')[0]}</span>
          <NavLink to="/" end>
            {({ isActive }) => (
              <button className={`nav-btn ${isActive ? 'active' : ''}`} onClick={() => window.location.href='/'}>
                Timer
              </button>
            )}
          </NavLink>
          <NavLink to="/report">
            {({ isActive }) => (
              <button className={`nav-btn ${isActive ? 'active' : ''}`} onClick={() => window.location.href='/report'}>
                Report
              </button>
            )}
          </NavLink>
          <button className="nav-btn nav-btn-logout" onClick={logout}>Logout</button>
        </div>
      )}
    </nav>
  );
};

function AppRoutes() {
  return (
    <>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/report" element={<PrivateRoute><WeeklyReport /></PrivateRoute>} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;

import { useState } from 'react';
import Login from './Login.jsx';
import Register from './Register.jsx';
import './AuthModal.css';

export default function AuthModal({ onClose, onAuthenticated }) {
  const [screen, setScreen] = useState('login');

  return (
    <div className="auth-modal-backdrop" >
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="auth-modal-close" onClick={onClose}>
          ×
        </button>

        {screen === 'login' ? (
          <Login
            onClose={onClose}
            onAuthenticated={onAuthenticated}
            onRegister={() => setScreen('register')}
          />
        ) : (
          <Register
            onClose={onClose}
            onAuthenticated={onAuthenticated}
            onLogin={() => setScreen('login')}
          />
        )}
      </div>
    </div>
  );
}

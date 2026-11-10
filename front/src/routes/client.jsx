import { Link, Navigate, Route, Routes } from 'react-router-dom';
import Home from '../pages/client/Home.jsx';
import ChatWindow from '../components/client/ChatWindow.jsx';
import Login from '../components/client/Login.jsx';
import Register from '../components/client/Register.jsx';

function AuthPage({ children }) {
  return <div className="auth-page">{children}</div>;
}

function ForgotPasswordPage() {
  return (
    <AuthPage>
      <div className="auth-placeholder">
        <Link to="/login" className="auth-placeholder-back">
          Quay lại đăng nhập
        </Link>
        <h1>Quên mật khẩu?</h1>
        <p>Tính năng khôi phục mật khẩu đang được hoàn thiện.</p>
      </div>
    </AuthPage>
  );
}

export default function ClientRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/chat" element={<ChatWindow />} />
      <Route
        path="/login"
        element={
          <AuthPage>
            <Login />
          </AuthPage>
        }
      />
      <Route
        path="/register"
        element={
          <AuthPage>
            <Register />
          </AuthPage>
        }
      />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css"; 
import { login } from "../../services/api/auth";

function Login({ onClose, onAuthenticated, onRegister }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login(formData.email, formData.password);

      const storage = formData.rememberMe ? localStorage : sessionStorage;
      storage.setItem("accessToken", data.token);
      storage.setItem("userEmail", data.email);
      if (data.user_id) {
        storage.setItem("userId", data.user_id);
      }
      if (data.role) {
        storage.setItem("userRole", data.role);
      }

      if (typeof onAuthenticated === "function") {
        onAuthenticated({ id: data.user_id, email: data.email, name: data.email.split('@')[0], initials: 'TS' });
      }

      const isAdmin = Boolean(data.role) && data.role.toLowerCase() !== "user";

      if (typeof onClose === "function") {
        onClose();
      }

      if (isAdmin) {
        navigate("/admin");
      } else if (typeof onClose !== "function") {
        navigate("/");
      }
    } catch (err) {
      setError(err.message || "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <Link to="/overview" className="login-brand">
            <div className="login-logo-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
          </Link>
          <h1 className="login-subtitle">Chào mừng bạn quay trở lại TS</h1>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-wrapper">
              <input
                id="email"
                type="text"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Nhập email của bạn"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <div className="input-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Nhập mật khẩu"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
          </div>

          <div className="form-options">
            <label className="remember-checkbox">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
              />
              Ghi nhớ đăng nhập
            </label>
            <Link to="/forgot-password" className="auth-link">
              Quên mật khẩu?
            </Link>
          </div>

          {error && (
            <div
              style={{
                color: "#f6465d",
                fontSize: "13px",
                backgroundColor: "rgba(246, 70, 93, 0.1)",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid rgba(246, 70, 93, 0.2)",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-btn-primary"
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>

        <div className="login-footer">
          Chưa có tài khoản?
          <button type="button" className="auth-link auth-link-button" onClick={() => {
            if (typeof onRegister === "function") onRegister();
            else navigate("/register");
          }}>
            Đăng ký ngay
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;

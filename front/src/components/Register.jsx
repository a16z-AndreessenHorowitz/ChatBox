import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Register.css";
import { sendOtp, verifyOtp, completeRegister } from "../services/api/auth";

function Register({ onLogin }) {

  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [account, setAccount] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tempToken, setTempToken] = useState("");

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!agreeTerms) return;

    setError("");
    setLoading(true);
    try {
      const normalizedAccount = account.trim();
      setAccount(normalizedAccount);
      await sendOtp(normalizedAccount);
      setStep(2);
    } catch (err) {
      setError(err.message || "Gửi OTP thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    const normalizedCode = verificationCode.trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      setError("Vui lòng nhập đúng mã OTP gồm 6 chữ số.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const data = await verifyOtp(account, normalizedCode);
      setTempToken(data.token);
      setStep(3);
    } catch (err) {
      setError(err.message || "Mã OTP không hợp lệ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setLoading(true);
    try {
      await sendOtp(account.trim());
      setVerificationCode("");
    } catch (err) {
      setError(err.message || "Gửi lại OTP thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự!");
      return;
    }
    if (!/[A-Z]/.test(password) || !/\d/.test(password)) {
      setError("Mật khẩu phải có ít nhất 1 chữ hoa và 1 chữ số!");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp!");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await completeRegister(tempToken, password, confirmPassword);
      if (typeof onLogin === "function") {
        onLogin();
      } else {
        navigate("/login");
      }
    } catch (err) {
      setError(err.message || "Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        {step === 1 ? (
          <>
            <div className="register-header">
              <Link to="/overview" className="register-brand">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
              </Link>
              <h1>
                Chào mừng đến với TS
              </h1>
            </div>

            <form className="register-form" onSubmit={handleRegisterSubmit}>
              <div className="form-group">
                <label htmlFor="accountInput">Email</label>
                <div className="input-wrapper">
                  <input
                    id="accountInput"
                    type="text"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    placeholder="Nhập email của bạn"
                    required
                  />
                </div>
              </div>

              <label className="register-terms">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  required
                />
                <span>
                  Khi tạo tài khoản, tức là tôi đồng ý với{" "}
                  <span className="register-terms-link">
                    Thông báo về quyền riêng tư của Binance.
                  </span>
                </span>
              </label>

              {error && (
                <div style={{ color: "#f6465d", fontSize: "13px", backgroundColor: "rgba(246, 70, 93, 0.1)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(246, 70, 93, 0.2)" }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="register-btn-submit"
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : "Đăng ký"}
              </button>
            </form>

            <div className="register-divider">
              <span>hoặc</span>
            </div>

            <div className="social-auth-list">
              <button type="button" className="social-auth-btn">
                <span className="social-icon">
                  <svg viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                  </svg>
                </span>
                Tiếp tục với Google
              </button>

              <button type="button" className="social-auth-btn">
                <span className="social-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.92-2.88-.9.04-1.98.6-2.61 1.34-.56.64-.99 1.7-0.87 2.73.99.08 1.95-.49 2.56-1.19z" />
                  </svg>
                </span>
                Tiếp tục với Apple
              </button>

              <button type="button" className="social-auth-btn">
                <span className="social-icon">
                  <svg viewBox="0 0 24 24" fill="#0088cc">
                    <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.16l-1.97 9.28c-.15.65-.53.81-1.08.51l-3-2.21-1.45 1.4c-.16.16-.3.3-.61.3l.22-3.05 5.56-5.02c.24-.22-.05-.34-.38-.13l-6.87 4.33-2.96-.92c-.64-.2-.66-.64.14-.95l11.55-4.45c.54-.19 1.01.13.85.91z" />
                  </svg>
                </span>
                Tiếp tục với Telegram
              </button>
            </div>

            <div className="register-footer">
              Đã có tài khoản?
              <button type="button" className="register-footer-link auth-link-button" onClick={() => {
                if (typeof onLogin === "function") onLogin();
                else navigate("/login");
              }}>
                Đăng nhập
              </button>
            </div>
          </>
        ) : step === 2 ? (
          <>
            <div className="register-header">
              <Link to="/" className="register-brand">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
              </Link>
              <h1>Xác minh email của bạn</h1>
              <p className="register-verify-desc">
                Đã gửi mã gồm 6 chữ số tới{" "}
                <strong>{account || "uocmocand@gmail.com"}</strong> (email không phân
                biệt chữ hoa hay chữ thường). Vui lòng nhập mã...
              </p>
            </div>

            <form className="register-form" onSubmit={handleVerifySubmit}>
              <div className="form-group">
                <label htmlFor="verificationCode">Mã xác thực</label>
                <div className="verify-input-wrapper">
                  <input
                    id="verificationCode"
                    type="text"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder=""
                    autoFocus
                    required
                  />
                  <div className="verify-badge-action">
                    <span>Đã gửi mã</span>
                    <i className="fa-regular fa-circle-question"></i>
                  </div>
                </div>
              </div>

              {error && (
                <div style={{ color: "#f6465d", fontSize: "13px", backgroundColor: "rgba(246, 70, 93, 0.1)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(246, 70, 93, 0.2)" }}>
                  {error}
                </div>
              )}

              <button type="submit" className="register-btn-submit" disabled={loading}>
                {loading ? "Đang xác thực..." : "Tiếp tục"}
              </button>

              <button type="button" className="verify-resend-link" onClick={handleResendOtp} disabled={loading}>
                Bạn chưa nhận được mã?
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="register-header">
              <Link to="/" className="register-brand">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
              </Link>
              <h1>Đặt mật khẩu</h1>
              <p className="register-verify-desc">
                Nhập ít nhất 8 ký tự, bao gồm ít nhất 1 chữ số và 1 chữ cái in hoa.
              </p>
            </div>

            <form className="register-form" onSubmit={handlePasswordSubmit}>
              {error && (
                <div style={{ color: "#f6465d", fontSize: "13px", backgroundColor: "rgba(246, 70, 93, 0.1)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(246, 70, 93, 0.2)" }}>
                  {error}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="password">Mật khẩu</label>
                <div className="input-wrapper">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Nhập mật khẩu của bạn"
                    minLength={8}
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

              <div className="form-group">
                <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
                <div className="input-wrapper">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Nhập lại mật khẩu"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? "Ẩn" : "Hiện"}
                  </button>
                </div>
              </div>

              <button type="submit" className="register-btn-submit" disabled={loading}>
                {loading ? "Đang hoàn tất..." : "Hoàn tất đăng ký"}
              </button>
            </form>
          </>
        )}
      </div>

      <div className="auth-bottom-footer">
        <a href="#"><i className="fa-solid fa-globe"></i> Tiếng Việt</a>
        <a href="#">Cookie</a>
        <a href="#">Riêng tư</a>
      </div>
    </div>
  );
}

export default Register;

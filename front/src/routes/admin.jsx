import { Navigate, Route, Routes } from "react-router-dom";
import DashBoard from "../pages/admin/dashBoard";
import DocumentKnowledge from "../pages/admin/documentKnowledge";

export function ProtectedAdminRoutes({ children }) {
  const token =
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken");
  const role =
    localStorage.getItem("userRole") || sessionStorage.getItem("userRole");
  // 1. Chưa đăng nhập -> Chuyển về trang Login
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  // 2. Đã đăng nhập nhưng là 'user' thường -> Chuyển về trang chủ Chat
  if (role?.toLowerCase() === "user") {
    return <Navigate to="/" replace />;
  }
  // 3. Là Admin / Role khác 'user' -> Cho phép xem trang Dashboard
  return children;
}

export default function AdminRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedAdminRoutes>
            <DashBoard />
          </ProtectedAdminRoutes>
        }
      />
      <Route
        path="/document_knowledge"
        element={
          <ProtectedAdminRoutes>
            <DocumentKnowledge />
          </ProtectedAdminRoutes>
        }
      />
    </Routes>
  );
}

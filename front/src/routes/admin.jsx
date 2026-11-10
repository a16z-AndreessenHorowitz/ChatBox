import { Navigate, Route, Routes } from "react-router-dom";
import DashBoard from "../pages/admin/dashBoard";
import DocumentKnowledge from "../pages/admin/documentKnowledge";
import RagEvaluation from "../pages/admin/ragEvaluation";
import { useAuth } from "../auth/AuthProvider.jsx";

export function ProtectedAdminRoutes({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  // 1. Chưa đăng nhập -> Chuyển về trang Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  // 2. Đã đăng nhập nhưng là 'user' thường -> Chuyển về trang chủ Chat
  if (user.role?.toLowerCase() === "user") {
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
      <Route
        path="/rag_evaluation"
        element={
          <ProtectedAdminRoutes>
            <RagEvaluation />
          </ProtectedAdminRoutes>
        }
      />
    </Routes>
  );
}

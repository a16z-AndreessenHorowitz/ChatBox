import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ClientRoutes from './routes/client.jsx';
import AdminRoutes from './routes/admin.jsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './index.css';
import AuthProvider from './auth/AuthProvider.jsx';

export default function App() {
  return (
      <AuthProvider><BrowserRouter>
        <Routes>
          <Route path="/admin/*" element={<AdminRoutes />} />
          <Route path="/*" element={<ClientRoutes />} />
        </Routes>
      </BrowserRouter></AuthProvider>
  );
}

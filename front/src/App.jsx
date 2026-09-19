import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import ClientRoutes from './routes/client.jsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <ClientRoutes />
    </BrowserRouter>
  );
}

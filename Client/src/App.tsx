import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/AuthContext';
import Layout from './components/common/Layout';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import AvailableFeedbacks from './components/employee/AvailableFeedbacks';
import FeedbackForm from './components/employee/FeedbackForm';
import AdminDashboard from './components/admin/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

// Wrapper component to handle admin-specific routing
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  
  if (currentUser?.isAdmin) {
    return <Navigate to="/admin" replace />;
  }
  
  return <>{children}</>;
};

// Wrapper component to handle employee-specific routing
const EmployeeRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  
  if (!currentUser?.isAdmin) {
    return <>{children}</>;
  }
  
  return <Navigate to="/admin" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route 
            path="/login" 
            element={<Login />} 
          />
          <Route 
            path="/signup" 
            element={<Signup />} 
          />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <EmployeeRoute>
                  <Layout>
                    <AvailableFeedbacks />
                  </Layout>
                </EmployeeRoute>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/feedback/:periodId" 
            element={
              <ProtectedRoute>
                <EmployeeRoute>
                  <Layout>
                    <FeedbackForm />
                  </Layout>
                </EmployeeRoute>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requireAdmin>
                <Layout>
                  <AdminDashboard />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <ToastContainer position="top-right" autoClose={3000} />
    </AuthProvider>
  );
}

export default App;
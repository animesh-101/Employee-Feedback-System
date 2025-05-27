import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ClipboardList, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Header: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <header className="bg-primary-500 text-white shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <ClipboardList size={24} />
            <h1 className="text-xl font-semibold">Feedback System</h1>
          </div>
          
          {currentUser && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User size={18} />
                <div>
                  <span className="text-sm font-medium">{currentUser.name}</span>
                  <span className="text-xs block opacity-80">{currentUser.department}</span>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-primary-600 transition-colors duration-200"
                aria-label="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-neutral-800 text-neutral-300 py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm">© {new Date().getFullYear()} Employee Feedback System. All rights reserved.</p>
          </div>
          <div className="flex space-x-4">
            <a href="#" className="text-sm hover:text-white transition-colors duration-200">Privacy Policy</a>
            <a href="#" className="text-sm hover:text-white transition-colors duration-200">Terms of Service</a>
            <a href="#" className="text-sm hover:text-white transition-colors duration-200">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
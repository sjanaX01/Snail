import { useState, useEffect } from 'react';
import { Home, Wallet, Settings, Sun, Moon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const NavButton = ({ icon: Icon, label, isActive = false, onClick }) => {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`
        w-12 h-12 rounded-full flex items-center justify-center
        transition-all duration-200 ease-in-out
        group relative
        ${isActive
          ? 'bg-black dark:bg-white text-white dark:text-black'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
        }
      `}
    >
      <Icon size={20} />
      {/* Label only on mobile bottom nav */}
      <span className="md:hidden absolute -bottom-4 text-[10px] font-medium" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>
        {label}
      </span>
    </button>
  );
};

const SideNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const path = location.pathname.replace('/', '') || 'home';
    setActiveSection(path);
  }, [location]);

  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'wallets', icon: Wallet, label: 'Wallet' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const handleNavigation = (sectionId) => {
    setActiveSection(sectionId);
    navigate(`/${sectionId}`);
  };

  return (
    <>
      {/* Desktop: Side navigation */}
      <div
        className="fixed left-4 top-1/2 -translate-y-1/2 rounded-full py-4 px-2 shadow-lg z-50 border-2 hidden md:block"
        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex flex-col items-center space-y-4">
          {navItems.map((item) => (
            <NavButton
              key={item.id}
              icon={item.icon}
              label={item.label}
              isActive={activeSection === item.id}
              onClick={() => handleNavigation(item.id)}
            />
          ))}

          {/* Divider */}
          <div className="w-6 h-px" style={{ background: 'var(--border-color)' }} />

          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light' : 'Switch to Dark'}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile: Bottom tab navigation */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t-2 md:hidden"
        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center justify-around py-2 pb-3 px-4">
          {navItems.map((item) => (
            <NavButton
              key={item.id}
              icon={item.icon}
              label={item.label}
              isActive={activeSection === item.id}
              onClick={() => handleNavigation(item.id)}
            />
          ))}

          {/* Dark mode toggle for mobile */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Light Mode' : 'Dark Mode'}
            className="w-12 h-12 rounded-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 relative"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
            <span className="absolute -bottom-4 text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
              Theme
            </span>
          </button>
        </div>
      </div>
    </>
  );
};

export default SideNavigation;
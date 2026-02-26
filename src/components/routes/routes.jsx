import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import SideNavigation from '../ui/Navbar';
import Home from '../../pages/Home';
import WalletPage from '../../pages/WalletsPage';
import Setup from '../../pages/Setup';
import Login from '../../pages/Login';
import Settings from '../../pages/Settings';

export default function AppRouter() {
  const { isInitialized, isUnlocked } = useWallet();

  return (
    <Router
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
    >
      {/* Show navbar only when wallet is unlocked */}
      {isUnlocked && <SideNavigation />}

      <Routes>
        {!isInitialized ? (
          <>
            {/* First time — no wallet exists yet */}
            <Route path="/setup" element={<Setup />} />
            <Route path="*" element={<Navigate to="/setup" replace />} />
          </>
        ) : !isUnlocked ? (
          <>
            {/* Wallet exists but locked — need password */}
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            {/* Wallet unlocked — full access */}
            <Route path="/home" element={<Home />} />
            <Route path="/wallets" element={<WalletPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

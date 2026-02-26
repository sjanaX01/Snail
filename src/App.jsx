import { WalletProvider } from './components/context/WalletContext';
import { ThemeProvider } from './components/context/ThemeContext';
import AppRouter from './components/routes/routes';

export default function App() {
  return (
    <ThemeProvider>
      <WalletProvider>
        <AppRouter />
      </WalletProvider>
    </ThemeProvider>
  );
}

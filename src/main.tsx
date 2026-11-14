import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { PreferencesProvider } from './context/PreferencesContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <PreferencesProvider>
    <App />
  </PreferencesProvider>
);

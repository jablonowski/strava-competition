import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import CurrentPage from './components/CurrentPage.jsx';

const isEmbed = window.location.pathname === '/current';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isEmbed ? <CurrentPage /> : <App />}
  </StrictMode>,
);

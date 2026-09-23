import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Disable browser's built-in scroll restoration so React Router navigations
// don't automatically jump to the top, allowing manual scroll restoration.
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

// Scroll di atas input angka jangan menambah/mengurangi nilainya.
document.addEventListener('wheel', () => {
  const el = document.activeElement;
  if (el?.type === 'number') el.blur();
}, { passive: true });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker } from './lib/serviceWorker'
import { installInputModality } from './lib/inputModality'

installInputModality();
createRoot(document.getElementById("root")!).render(<App />);
registerServiceWorker();

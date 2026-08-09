import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { PatientProfileProvider } from './context/PatientProfileContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PatientProfileProvider>
      <App />
    </PatientProfileProvider>
  </StrictMode>,
)

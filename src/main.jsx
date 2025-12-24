import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { UserProvider, ReadingQueueProvider } from './contexts'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UserProvider>
      <ReadingQueueProvider>
        <App />
      </ReadingQueueProvider>
    </UserProvider>
  </StrictMode>,
)

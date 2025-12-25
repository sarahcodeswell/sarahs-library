import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { UserProvider, ReadingQueueProvider, UserBooksProvider, RecommendationProvider } from './contexts'
import ErrorBoundary from './components/ErrorBoundary'
import { initSentry } from './lib/sentry'

// Initialize error tracking
initSentry()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <UserProvider>
        <ReadingQueueProvider>
          <UserBooksProvider>
            <RecommendationProvider>
              <App />
            </RecommendationProvider>
          </UserBooksProvider>
        </ReadingQueueProvider>
      </UserProvider>
    </ErrorBoundary>
  </StrictMode>,
)

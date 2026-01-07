import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { UserProvider, ReadingQueueProvider, UserBooksProvider, RecommendationProvider } from './contexts'
import { ReceivedRecommendationsProvider } from './contexts/ReceivedRecommendationsContext'
import ErrorBoundary from './components/ErrorBoundary'
import { initSentry } from './lib/sentry'

// Initialize error tracking
initSentry()

// Global error handler to prevent raw technical errors from showing to users
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent the default browser error handling
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Don't prevent default for actual errors - let ErrorBoundary handle them
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <UserProvider>
        <ReadingQueueProvider>
          <UserBooksProvider>
            <RecommendationProvider>
              <ReceivedRecommendationsProvider>
                <App />
              </ReceivedRecommendationsProvider>
            </RecommendationProvider>
          </UserBooksProvider>
        </ReadingQueueProvider>
      </UserProvider>
    </ErrorBoundary>
  </StrictMode>,
)

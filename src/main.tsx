import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Fix iPad Magic Keyboard viewport jumping issue
// Prevents iOS from auto-scrolling when typing in input fields
if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
  let lastScrollY = 0
  let isInputFocused = false

  document.addEventListener('focusin', (e) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      isInputFocused = true
      lastScrollY = window.scrollY
    }
  })

  document.addEventListener('focusout', () => {
    isInputFocused = false
  })

  // Prevent viewport resize from causing scroll jumps while typing
  window.visualViewport?.addEventListener('resize', () => {
    if (isInputFocused) {
      window.scrollTo(0, lastScrollY)
    }
  })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)

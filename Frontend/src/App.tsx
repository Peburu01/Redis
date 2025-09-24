import { useState, useEffect } from 'react'
import StatusToast from './components/StatusToast'
import Sidebar from './components/Sidebar'
import OverviewPage from './pages/OverviewPage'
import ConnectionPage from './pages/ConnectionPage'
import DatabasesPage from './pages/DatabasesPage'
import MonitoringPage from './pages/MonitoringPage'

// Global interfaces
interface StatusMessage {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message: string
  timestamp: number
}

function App() {
  const [activeSection, setActiveSection] = useState('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [currentDb, setCurrentDb] = useState(0)
  const [connectionInfo, setConnectionInfo] = useState<any>(null)
  const [statusMessages, setStatusMessages] = useState<StatusMessage[]>([])
  const [isDark, setIsDark] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) setSidebarCollapsed(true) // Auto-collapse on mobile
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      setIsDark(savedTheme === 'dark')
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDark(prefersDark)
    }
  }, [])

  // Apply theme changes to document
  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggleTheme = () => {
    setIsDark(prev => !prev)
  }

  // Global status system
  const showStatus = (type: StatusMessage['type'], title: string, message: string) => {
    const newMessage: StatusMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type,
      title,
      message,
      timestamp: Date.now()
    }
    setStatusMessages(prev => [...prev, newMessage])
    
    // Auto-remove messages after timeout
    const timeout = type === 'error' ? 8000 : 5000
    setTimeout(() => {
      setStatusMessages(prev => prev.filter(msg => msg.id !== newMessage.id))
    }, timeout)
  }

  const closeStatus = (id: string) => {
    setStatusMessages(prev => prev.filter(msg => msg.id !== id))
  }

  // Global props to pass to pages
  const globalProps = {
    isConnected,
    setIsConnected,
    currentDb,
    setCurrentDb,
    connectionInfo,
    setConnectionInfo,
    showStatus,
    activeSection,
    setActiveSection
  }

  const renderActivePage = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewPage {...globalProps} />
      case 'connection':
        return <ConnectionPage {...globalProps} />
      case 'databases':
        return <DatabasesPage {...globalProps} />
      case 'monitoring':
        return <MonitoringPage isConnected={isConnected} showStatus={showStatus} />
      default:
        return <OverviewPage {...globalProps} />
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Status Messages - FIXED FOR MOBILE */}
      <div className={`fixed top-4 z-50 w-96 max-w-sm space-y-2 ${
        isMobile ? 'left-4 right-4' : 'right-4'
      }`}>
        {statusMessages.map((message) => (
          <StatusToast 
            key={message.id} 
            message={message} 
            onClose={closeStatus} 
          />
        ))}
      </div>
      
      {/* Sidebar */}
      <Sidebar 
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        isConnected={isConnected}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />
      
      {/* Main Content - FIXED MOBILE RESPONSIVE */}
      <main className={`transition-all duration-200 p-4 min-h-screen ${
        isMobile 
          ? 'ml-0 pt-16' // No margin on mobile, top padding for menu button
          : sidebarCollapsed 
            ? 'ml-16 p-6' 
            : 'ml-64 p-6'
      }`}>
        {renderActivePage()}
      </main>
    </div>
  )
}

export default App

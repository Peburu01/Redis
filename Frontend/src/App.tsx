import { useState } from 'react'
import StatusToast from './components/StatusToast'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import OverviewPage from './pages/OverviewPage'
import ConnectionPage from './pages/ConnectionPage'
import DatabasesPage from './pages/DatabasesPage'
import MonitoringPage from './pages/MonitoringPage'

// Global interfaces
interface StatusMessage {
  id: string; type: 'success' | 'error' | 'info' | 'warning'
  title: string; message: string; timestamp: number
}

function App() {
  const [isDark, setIsDark] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [currentDb, setCurrentDb] = useState(0)
  const [connectionInfo, setConnectionInfo] = useState<any>(null)
  const [statusMessages, setStatusMessages] = useState<StatusMessage[]>([])

  // Global status system
  const showStatus = (type: StatusMessage['type'], title: string, message: string) => {
    const newMessage: StatusMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type, title, message, timestamp: Date.now()
    }
    setStatusMessages(prev => [...prev, newMessage])
    setTimeout(() => setStatusMessages(prev => prev.filter(msg => msg.id !== newMessage.id)), type === 'error' ? 8000 : 5000)
  }

  const closeStatus = (id: string) => setStatusMessages(prev => prev.filter(msg => msg.id !== id))

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
  }

  // Global props to pass to pages
  const globalProps = {
    isConnected, setIsConnected,
    currentDb, setCurrentDb,
    connectionInfo, setConnectionInfo,
    showStatus, activeSection, setActiveSection
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
        // MonitoringPage only needs isConnected and showStatus
        return <MonitoringPage isConnected={isConnected} showStatus={showStatus} />
      default:
        return <OverviewPage {...globalProps} />
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Status Messages */}
      <div className="fixed top-4 right-4 z-50 w-96 max-w-sm space-y-2">
        {statusMessages.map((message) => (
          <StatusToast key={message.id} message={message} onClose={closeStatus} />
        ))}
      </div>
      
      {/* Sidebar */}
      <Sidebar 
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        isConnected={isConnected}
        connectionInfo={connectionInfo}
      />

      {/* Header */}
      <Header isDark={isDark} onToggleTheme={toggleTheme} isCollapsed={sidebarCollapsed} currentDb={currentDb} />

      {/* Main Content */}
      <main className={`${sidebarCollapsed ? 'ml-16' : 'ml-64'} transition-all duration-200 p-6 min-h-screen`}>
        {renderActivePage()}
      </main>
    </div>
  )
}

export default App

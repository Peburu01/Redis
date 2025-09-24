import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Database, Home, Link, Activity, ChevronLeft, ChevronRight, Sun, Moon, Wifi, AlertCircle, Menu, X } from 'lucide-react'

interface SidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  isConnected: boolean
  isDark: boolean
  onToggleTheme: () => void
}

const Sidebar = ({ activeSection, onSectionChange, isCollapsed, onToggleCollapse, isConnected, isDark, onToggleTheme }: SidebarProps) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: Home },
    { id: 'connection', label: 'Connection', icon: Link },
    { id: 'databases', label: 'Data Explorer', icon: Database, disabled: !isConnected },
    { id: 'monitoring', label: 'Performance', icon: Activity, disabled: !isConnected }
  ]

  // Mobile-specific logic
  const showSidebar = isMobile ? mobileMenuOpen : true
  const isExpanded = isMobile ? true : !isCollapsed

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="fixed top-4 left-4 z-50 h-10 w-10 p-0 bg-background/95 backdrop-blur-sm border shadow-lg"
        >
          {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      )}

      {/* Mobile Backdrop */}
      {isMobile && mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30" 
          onClick={() => setMobileMenuOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <div className={`bg-sidebar border-r border-sidebar-border h-screen fixed left-0 top-0 z-40 flex flex-col transition-all duration-300 ${
        !showSidebar ? '-translate-x-full' : ''
      } ${
        isMobile ? 'w-72' : isExpanded ? 'w-64' : 'w-16'
      } shadow-lg`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          {isExpanded && (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
                <Database className="h-4 w-4 text-sidebar-primary-foreground" />
              </div>
              <div>
                <h1 className="font-semibold text-sm text-sidebar-foreground">Redis Manager</h1>
                <p className="text-xs text-muted-foreground">Professional Edition</p>
              </div>
            </div>
          )}
          {!isMobile && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onToggleCollapse} 
              className="h-8 w-8 p-0 hover:bg-sidebar-accent rounded-lg"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id
              return (
                <div key={item.id} className="relative">
                  <button 
                    onClick={() => {
                      if (!item.disabled) {
                        onSectionChange(item.id)
                        if (isMobile) setMobileMenuOpen(false)
                      }
                    }}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    disabled={item.disabled}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' 
                      : item.disabled ? 'text-muted-foreground cursor-not-allowed opacity-50'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/60'
                    } ${!isExpanded ? 'justify-center' : ''}`}
                  >
                    <Icon className="h-4 w-4" />
                    {isExpanded && <span className="truncate">{item.label}</span>}
                    {isExpanded && item.disabled && <Badge variant="outline" className="ml-auto text-xs">Offline</Badge>}
                  </button>
                  
                  {/* Desktop Tooltip */}
                  {!isMobile && !isExpanded && hoveredItem === item.id && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-lg shadow-xl border whitespace-nowrap z-50">
                      {item.label} {item.disabled && '(Offline)'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </nav>

        {/* Bottom Controls */}
        <div className="p-3 space-y-3 border-t border-sidebar-border">
          
          {/* Theme Toggle */}
          {isExpanded ? (
            <div className="bg-sidebar-accent rounded-lg p-3 border border-sidebar-border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-sidebar-foreground">Theme Mode</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${isDark ? 'bg-indigo-500' : 'bg-amber-500'}`} />
                    <span>{isDark ? 'Dark' : 'Light'} interface</span>
                  </div>
                </div>
                <button
                  onClick={onToggleTheme}
                  className={`relative h-6 w-11 rounded-full transition-colors duration-200 outline-none ${
                    isDark ? 'bg-sidebar-primary' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200 flex items-center justify-center ${
                    isDark ? 'translate-x-5' : 'translate-x-0'
                  }`}>
                    {isDark ? <Moon className="h-3 w-3 text-indigo-600" /> : <Sun className="h-3 w-3 text-amber-500" />}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={onToggleTheme}
                className="h-10 w-10 rounded-lg bg-sidebar-accent hover:bg-sidebar-accent/80 flex items-center justify-center transition-colors"
                title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
              >
                {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
            </div>
          )}

          {/* Connection Status */}
          {isExpanded ? (
            <div className={`rounded-lg p-3 border ${
              isConnected 
                ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/50' 
                : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50'
            }`}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  {isConnected && <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-400 animate-ping opacity-30" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-sidebar-foreground truncate">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {isConnected ? 'All systems online' : 'Check connection'}
                  </div>
                </div>
                <div>
                  {isConnected ? <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" /> : <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                isConnected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
              }`} title={isConnected ? 'Connected' : 'Disconnected'}>
                <div className="relative">
                  <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  {isConnected && <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-400 animate-ping opacity-30" />}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Sidebar

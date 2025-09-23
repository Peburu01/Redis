import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Database, Home, Link, Activity, Cloud, Wifi, ChevronLeft, 
  ChevronRight, Shield, Zap, AlertCircle, Settings 
} from 'lucide-react'

interface SidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  isConnected: boolean
  connectionInfo: { 
    host?: string
    port?: number
    connectionType?: string
    ssl?: boolean 
  } | null
}

const Sidebar = ({ 
  activeSection, onSectionChange, isCollapsed, onToggleCollapse, 
  isConnected, connectionInfo 
}: SidebarProps) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const menuItems = [
    { 
      id: 'overview', 
      label: 'Dashboard', 
      icon: Home, 
      description: 'System overview and metrics' 
    },
    { 
      id: 'connection', 
      label: 'Connection', 
      icon: Link, 
      description: 'Manage Redis connections' 
    },
    { 
      id: 'databases', 
      label: 'Data Explorer', 
      icon: Database, 
      description: 'Browse and manage data',
      requiresConnection: true 
    },
    { 
      id: 'monitoring', 
      label: 'Performance', 
      icon: Activity, 
      description: 'Real-time monitoring',
      requiresConnection: true 
    }
  ]

  const getConnectionIcon = () => {
    if (!isConnected) return AlertCircle
    if (connectionInfo?.ssl) return Shield
    if (connectionInfo?.connectionType === 'railway') return Cloud
    return Wifi
  }

  const getConnectionStatus = () => {
    if (!isConnected) {
      return {
        primary: 'Not Connected',
        secondary: 'Click Connection to setup',
        variant: 'secondary' as const,
        iconColor: 'text-muted-foreground'
      }
    }
    
    const type = connectionInfo?.connectionType
    if (type === 'railway') {
      return {
        primary: 'Railway Redis',
        secondary: 'Cloud connection active',
        variant: 'default' as const,
        iconColor: 'text-purple-500'
      }
    }
    
    return {
      primary: 'Local Redis',
      secondary: `${connectionInfo?.host}:${connectionInfo?.port}`,
      variant: 'default' as const,
      iconColor: connectionInfo?.ssl ? 'text-green-500' : 'text-blue-500'
    }
  }

  const status = getConnectionStatus()
  const ConnectionIcon = getConnectionIcon()

  return (
    <div className={`bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out ${
      isCollapsed ? 'w-16' : 'w-72'
    } flex flex-col h-screen fixed left-0 top-0 z-40 shadow-lg`}>
      
      {/* Header Section */}
      <div className="p-6 border-b border-sidebar-border bg-gradient-to-r from-sidebar to-sidebar/95">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
                <Database className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-bold text-base text-sidebar-foreground truncate">
                  Redis Manager
                </h1>
                <p className="text-xs text-muted-foreground truncate">
                  Professional Edition
                </p>
              </div>
            </div>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onToggleCollapse} 
            className="h-8 w-8 p-0 text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="p-4 border-b border-sidebar-border">
        <div className={`flex items-center gap-3 px-3 py-3 rounded-lg border transition-all duration-200 ${
          isConnected 
            ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
            : 'bg-muted/30 border-border'
        }`}>
          <div className="shrink-0">
            <ConnectionIcon className={`h-4 w-4 ${status.iconColor}`} />
          </div>
          
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {status.primary}
                </p>
                <Badge variant={status.variant} className="text-xs">
                  {isConnected ? 'Online' : 'Offline'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {status.secondary}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            const isDisabled = item.requiresConnection && !isConnected
            const isHovered = hoveredItem === item.id
            
            return (
              <div key={item.id} className="relative">
                <button 
                  onClick={() => !isDisabled && onSectionChange(item.id)}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  disabled={isDisabled}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 text-sm font-medium group relative ${
                    isActive 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : isDisabled
                        ? 'text-muted-foreground/50 cursor-not-allowed'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-sm'
                  }`}
                >
                  <Icon className={`h-5 w-5 shrink-0 transition-transform duration-200 ${
                    isActive ? 'scale-110' : isHovered ? 'scale-105' : ''
                  }`} />
                  
                  {!isCollapsed && (
                    <div className="min-w-0 flex-1 text-left">
                      <span className="block truncate">{item.label}</span>
                      {!isActive && (
                        <span className="text-xs text-muted-foreground truncate block">
                          {item.description}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {item.requiresConnection && !isConnected && !isCollapsed && (
                    <div className="shrink-0">
                      <Badge variant="outline" className="text-xs">
                        Offline
                      </Badge>
                    </div>
                  )}
                </button>
                
                {/* Tooltip for collapsed state */}
                {isCollapsed && isHovered && (
                  <div className="absolute left-full top-0 ml-2 px-3 py-2 bg-popover border border-border rounded-md shadow-lg z-50 min-w-max">
                    <p className="text-sm font-medium text-popover-foreground">
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.description}
                    </p>
                    {item.requiresConnection && !isConnected && (
                      <Badge variant="outline" className="text-xs mt-1">
                        Requires Connection
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </nav>

      <Separator />

      {/* Quick Actions */}
      {isConnected && !isCollapsed && (
        <div className="p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Quick Actions
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs"
              onClick={() => onSectionChange('databases')}
            >
              <Database className="h-3 w-3 mr-1" />
              Browse
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs"
              onClick={() => onSectionChange('monitoring')}
            >
              <Zap className="h-3 w-3 mr-1" />
              Monitor
            </Button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border bg-sidebar/50">
        {!isCollapsed ? (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div>
              <p className="font-medium">Redis Manager v3.1.0</p>
              <p className="text-muted-foreground/70">Professional Edition</p>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-medium">v3.1</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Sidebar

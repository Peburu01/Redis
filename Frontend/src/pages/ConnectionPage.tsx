import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Wifi, Cloud, Server, Link, TestTube, Square, Copy, Loader2, 
  CheckCircle2, AlertCircle, Shield, Database, Zap, Info
} from 'lucide-react'

// Types
interface ConnectionPreset {
  name: string; description: string; type: string
  config: any; example?: string; icon?: any
}

interface ConnectionPageProps {
  isConnected: boolean; setIsConnected: (value: boolean) => void
  currentDb: number; setCurrentDb: (value: number) => void
  connectionInfo: any; setConnectionInfo: (value: any) => void
  showStatus: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void
  setActiveSection: (section: string) => void
}

const ConnectionPage = ({ 
  isConnected, setIsConnected, currentDb, setCurrentDb, 
  connectionInfo, setConnectionInfo, showStatus, setActiveSection 
}: ConnectionPageProps) => {
  const [connectionForm, setConnectionForm] = useState({ 
    host: 'localhost', port: 6379, password: '', database: 0,
    connectionString: '', connectionType: 'local'
  })
  const [connectionPresets, setConnectionPresets] = useState<{[key: string]: ConnectionPreset}>({})
  const [loadingStates, setLoadingStates] = useState({ connecting: false, testing: false })
  const [selectedPreset, setSelectedPreset] = useState<string>('')

  // API helper
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(`/api${endpoint}`, { 
        headers: { 'Content-Type': 'application/json' }, 
        ...options 
      })
      return await response.json()
    } catch (error) {
      throw new Error(`API call failed: ${error}`)
    }
  }

  // Load connection presets
  const loadConnectionPresets = async () => {
    try {
      const result = await apiCall('/connection-presets')
      if (result.success) {
        // Add icons to presets
        const presetsWithIcons = {
          ...result.presets,
          local: { ...result.presets.local, icon: Wifi },
          railway: { ...result.presets.railway, icon: Cloud },
          cloud: { ...result.presets.cloud, icon: Server }
        }
        setConnectionPresets(presetsWithIcons)
      }
    } catch (error) {
      console.error('Failed to load connection presets:', error)
    }
  }

  // Test connection
  const testConnection = async () => {
    setLoadingStates(prev => ({ ...prev, testing: true }))
    showStatus('info', 'Testing Connection', 'Verifying Redis connection...')
    
    try {
      let connectionData = connectionForm.connectionString 
        ? {
            connectionString: connectionForm.connectionString,
            connectionType: connectionForm.connectionType,
            database: connectionForm.database,
            testOnly: true
          }
        : {
            host: connectionForm.host,
            port: connectionForm.port,
            password: connectionForm.password,
            database: connectionForm.database,
            connectionType: 'local',
            testOnly: true
          }

      const result = await apiCall('/test-connection', { 
        method: 'POST', 
        body: JSON.stringify(connectionData) 
      })
      
      if (result.success) {
        showStatus('success', 'Connection Test Passed', 
          `Successfully connected to ${result.host}:${result.port} | Latency: ${result.latency}ms`)
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      showStatus('error', 'Connection Test Failed', error.message)
    } finally {
      setLoadingStates(prev => ({ ...prev, testing: false }))
    }
  }

  // Connect
  const connect = async () => {
    setLoadingStates(prev => ({ ...prev, connecting: true }))
    try {
      let connectionData = connectionForm.connectionString 
        ? {
            connectionString: connectionForm.connectionString,
            connectionType: connectionForm.connectionType,
            database: connectionForm.database
          }
        : {
            host: connectionForm.host,
            port: connectionForm.port,
            password: connectionForm.password,
            database: connectionForm.database,
            connectionType: 'local'
          }

      const result = await apiCall('/connect', { 
        method: 'POST', 
        body: JSON.stringify(connectionData) 
      })
      
      if (result.success) {
        setIsConnected(true)
        setCurrentDb(result.database || connectionForm.database)
        setConnectionInfo({
          host: result.host,
          port: result.port,
          connectionType: result.connectionType,
          ssl: result.ssl
        })
        
        showStatus('success', 'Connected Successfully', result.message)
        setActiveSection('overview')
      } else {
        throw new Error(result.error + (result.suggestion ? `. ${result.suggestion}` : ''))
      }
    } catch (error: any) {
      showStatus('error', 'Connection Failed', error.message)
    } finally {
      setLoadingStates(prev => ({ ...prev, connecting: false }))
    }
  }

  // Disconnect
  const disconnect = async () => {
    try {
      await apiCall('/disconnect', { method: 'POST' })
      setIsConnected(false)
      setConnectionInfo(null)
      setSelectedPreset('')
      showStatus('info', 'Disconnected', 'Successfully disconnected from Redis server')
    } catch (error: any) {
      showStatus('error', 'Disconnect Error', error.message)
    }
  }

  // Apply preset
  const applyPreset = (presetType: string) => {
    const preset = connectionPresets[presetType]
    if (!preset) return

    setSelectedPreset(presetType)
    
    if (preset.type === 'local') {
      setConnectionForm({
        ...connectionForm,
        ...preset.config,
        connectionString: ''
      })
    } else {
      setConnectionForm({
        ...connectionForm,
        connectionString: preset.config.connectionString || '',
        connectionType: preset.type,
        database: preset.config.database || 0
      })
    }
  }

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    showStatus('success', 'Copied', 'Connection string copied to clipboard')
  }

  useEffect(() => {
    loadConnectionPresets()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8 max-w-4xl">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Connection Manager</h1>
              <p className="text-lg text-muted-foreground mt-1">
                Connect to Local, Railway, or Cloud Redis instances
              </p>
            </div>
            <Badge 
              variant={isConnected ? "default" : "secondary"} 
              className="gap-2"
            >
              {isConnected ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </div>

        {/* Current Connection Status */}
        {isConnected && connectionInfo && (
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="space-y-1">
                <div><strong>Status:</strong> Connected to {connectionInfo.host}:{connectionInfo.port}</div>
                <div><strong>Type:</strong> {connectionInfo.connectionType} {connectionInfo.ssl && <Shield className="inline h-3 w-3" />}</div>
                <div><strong>Active Database:</strong> Database {currentDb}</div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Connect Presets */}
        {Object.keys(connectionPresets).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Connect
              </CardTitle>
              <CardDescription>Choose from predefined connection configurations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(connectionPresets).map(([key, preset]) => {
                  const IconComponent = preset.icon || Server
                  const isSelected = selectedPreset === key
                  
                  return (
                    <Card 
                      key={key} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => applyPreset(key)}
                    >
                      <CardContent className="p-6 text-center space-y-3">
                        <div className="flex justify-center">
                          <div className={`p-3 rounded-full ${
                            key === 'local' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' :
                            key === 'railway' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400' :
                            'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                          }`}>
                            <IconComponent className="h-6 w-6" />
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <h3 className="font-semibold">{preset.name}</h3>
                          <p className="text-sm text-muted-foreground">{preset.description}</p>
                        </div>
                        
                        {preset.example && (
                          <div className="flex items-center gap-2 mt-3 p-2 bg-muted rounded-md">
                            <code className="text-xs font-mono flex-1 truncate">
                              {preset.example}
                            </code>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 w-6 p-0 shrink-0" 
                              onClick={(e) => { 
                                e.stopPropagation() 
                                copyToClipboard(preset.example!) 
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        
                        {isSelected && (
                          <Badge variant="secondary" className="mt-2">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Selected
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Connection Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Connection Configuration
            </CardTitle>
            <CardDescription>Configure your Redis connection parameters</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="individual" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="individual" className="gap-2">
                  <Wifi className="h-4 w-4" />
                  Individual Parameters
                </TabsTrigger>
                <TabsTrigger value="string" className="gap-2">
                  <Link className="h-4 w-4" />
                  Connection String
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="individual" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="host" className="text-sm font-medium">Server Host</Label>
                    <Input 
                      id="host" 
                      value={connectionForm.host} 
                      onChange={(e) => setConnectionForm({...connectionForm, host: e.target.value})} 
                      placeholder="localhost"
                      className="font-mono"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="port" className="text-sm font-medium">Port Number</Label>
                    <Input 
                      id="port" 
                      type="number" 
                      value={connectionForm.port} 
                      onChange={(e) => setConnectionForm({...connectionForm, port: Number(e.target.value)})} 
                      placeholder="6379"
                      className="font-mono"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      value={connectionForm.password} 
                      onChange={(e) => setConnectionForm({...connectionForm, password: e.target.value})} 
                      placeholder="Optional authentication"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="database" className="text-sm font-medium">Default Database</Label>
                    <Select 
                      value={connectionForm.database.toString()} 
                      onValueChange={(value) => setConnectionForm({...connectionForm, database: Number(value)})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({length: 16}, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>Database {i}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="string" className="space-y-6 mt-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="connectionString" className="text-sm font-medium">
                      Redis Connection String
                    </Label>
                    <Textarea
                      id="connectionString"
                      value={connectionForm.connectionString}
                      onChange={(e) => setConnectionForm({...connectionForm, connectionString: e.target.value})}
                      placeholder="redis://default:password@host:port/database&#10;&#10;Examples:&#10;redis://localhost:6379&#10;redis://default:QcwgNhXhWOWPwZAfuUDJixoQLVfYZTda@crossover.proxy.rlwy.net:23278"
                      className="font-mono text-sm min-h-24 resize-none"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="connectionType" className="text-sm font-medium">Connection Type</Label>
                      <Select 
                        value={connectionForm.connectionType} 
                        onValueChange={(value) => setConnectionForm({...connectionForm, connectionType: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="local">Local Redis</SelectItem>
                          <SelectItem value="railway">Railway Redis</SelectItem>
                          <SelectItem value="cloud">Cloud Redis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="stringDatabase" className="text-sm font-medium">Default Database</Label>
                      <Select 
                        value={connectionForm.database.toString()} 
                        onValueChange={(value) => setConnectionForm({...connectionForm, database: Number(value)})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({length: 16}, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>Database {i}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <Separator className="my-6" />

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={connect} 
                disabled={loadingStates.connecting || loadingStates.testing}
                size="lg"
                className="min-w-32"
              >
                {loadingStates.connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Link className="h-4 w-4 mr-2" />
                    Connect
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={testConnection} 
                disabled={loadingStates.connecting || loadingStates.testing}
                size="lg"
              >
                {loadingStates.testing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={disconnect} 
                disabled={!isConnected}
                size="lg"
              >
                <Square className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Connection Help */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>Need help?</strong></p>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li><strong>Local Redis:</strong> Make sure Redis is running on your machine</li>
                <li><strong>Railway:</strong> Use the connection string from your Railway Redis service</li>
                <li><strong>Cloud:</strong> Ensure your Redis instance accepts external connections</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}

export default ConnectionPage

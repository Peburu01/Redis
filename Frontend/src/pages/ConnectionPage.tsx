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

interface ConnectionPreset {
  name: string; description: string; type: string; config: any; example?: string; icon?: any
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
  const [form, setForm] = useState({ 
    host: 'localhost', port: 6379, password: '', database: 0,
    connectionString: '', connectionType: 'local'
  })
  const [presets, setPresets] = useState<{[key: string]: ConnectionPreset}>({})
  const [loading, setLoading] = useState({ connecting: false, testing: false })
  const [selectedPreset, setSelectedPreset] = useState('')

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`/api${endpoint}`, { 
      headers: { 'Content-Type': 'application/json' }, ...options 
    })
    return await response.json()
  }

  const updateLoading = (key: keyof typeof loading, value: boolean) => 
    setLoading(prev => ({ ...prev, [key]: value }))

  const updateForm = (updates: Partial<typeof form>) => setForm(prev => ({ ...prev, ...updates }))

  const loadPresets = async () => {
    try {
      const result = await apiCall('/connection-presets')
      if (result.success) {
        setPresets({
          ...result.presets,
          local: { ...result.presets.local, icon: Wifi },
          railway: { ...result.presets.railway, icon: Cloud },
          cloud: { ...result.presets.cloud, icon: Server }
        })
      }
    } catch (error) {
      console.error('Failed to load presets:', error)
    }
  }

  const testConnection = async () => {
    updateLoading('testing', true)
    showStatus('info', 'Testing Connection', 'Verifying Redis connection...')
    
    try {
      const connectionData = form.connectionString ? {
        connectionString: form.connectionString, connectionType: form.connectionType, 
        database: form.database, testOnly: true
      } : {
        ...form, connectionType: 'local', testOnly: true
      }

      const result = await apiCall('/test-connection', { method: 'POST', body: JSON.stringify(connectionData) })
      
      if (result.success) {
        showStatus('success', 'Connection Test Passed', 
          `Connected to ${result.host}:${result.port} | Latency: ${result.latency}ms`)
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      showStatus('error', 'Connection Test Failed', error.message)
    } finally {
      updateLoading('testing', false)
    }
  }

  const connect = async () => {
    updateLoading('connecting', true)
    try {
      const connectionData = form.connectionString ? {
        connectionString: form.connectionString, connectionType: form.connectionType, database: form.database
      } : { ...form, connectionType: 'local' }

      const result = await apiCall('/connect', { method: 'POST', body: JSON.stringify(connectionData) })
      
      if (result.success) {
        setIsConnected(true)
        setCurrentDb(result.database || form.database)
        setConnectionInfo({
          host: result.host, port: result.port, connectionType: result.connectionType, ssl: result.ssl
        })
        showStatus('success', 'Connected Successfully', result.message)
        setActiveSection('overview')
      } else {
        throw new Error(result.error + (result.suggestion ? `. ${result.suggestion}` : ''))
      }
    } catch (error: any) {
      showStatus('error', 'Connection Failed', error.message)
    } finally {
      updateLoading('connecting', false)
    }
  }

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

  const applyPreset = (presetType: string) => {
    const preset = presets[presetType]
    if (!preset) return

    setSelectedPreset(presetType)
    updateForm(preset.type === 'local' 
      ? { ...preset.config, connectionString: '' }
      : { connectionString: preset.config.connectionString || '', connectionType: preset.type, database: preset.config.database || 0 }
    )
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    showStatus('success', 'Copied', 'Connection string copied to clipboard')
  }

  useEffect(() => { loadPresets() }, [])

  const presetColors = { local: 'blue', railway: 'purple', cloud: 'green' }
  const formFields = [
    { label: 'Server Host', id: 'host', value: form.host, placeholder: 'localhost', type: 'text' },
    { label: 'Port Number', id: 'port', value: form.port, placeholder: '6379', type: 'number' },
    { label: 'Password', id: 'password', value: form.password, placeholder: 'Optional authentication', type: 'password' },
  ]

  const connectionTypes = [
    { value: 'local', label: 'Local Redis' },
    { value: 'railway', label: 'Railway Redis' },
    { value: 'cloud', label: 'Cloud Redis' }
  ]

  const actionButtons = [
    { 
      label: loading.connecting ? 'Connecting...' : 'Connect', 
      onClick: connect, 
      disabled: loading.connecting || loading.testing,
      variant: 'default' as const,
      icon: loading.connecting ? Loader2 : Link,
      spin: loading.connecting
    },
    { 
      label: loading.testing ? 'Testing...' : 'Test Connection', 
      onClick: testConnection, 
      disabled: loading.connecting || loading.testing,
      variant: 'outline' as const,
      icon: loading.testing ? Loader2 : TestTube,
      spin: loading.testing
    },
    { 
      label: 'Disconnect', 
      onClick: disconnect, 
      disabled: !isConnected,
      variant: 'destructive' as const,
      icon: Square,
      spin: false
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto p-6 space-y-6 max-w-7xl">
        
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-background border p-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Redis Connection Hub</h1>
              <p className="text-lg text-muted-foreground">Connect to Local, Railway, or Cloud Redis instances</p>
            </div>
            <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
              {isConnected ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </div>

        {/* Connection Status */}
        {isConnected && connectionInfo && (
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="flex flex-wrap gap-4 text-sm">
                <span><strong>Host:</strong> {connectionInfo.host}:{connectionInfo.port}</span>
                <span><strong>Type:</strong> {connectionInfo.connectionType} {connectionInfo.ssl && <Shield className="inline h-3 w-3" />}</span>
                <span><strong>Database:</strong> DB {currentDb}</span>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Connect Presets */}
        {Object.keys(presets).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Connect Presets
              </CardTitle>
              <CardDescription>Choose from predefined connection configurations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(presets).map(([key, preset]) => {
                  const IconComponent = preset.icon || Server
                  const isSelected = selectedPreset === key
                  const colorClass = presetColors[key as keyof typeof presetColors] || 'blue'
                  
                  return (
                    <Card 
                      key={key}
                      className={`cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 ${
                        isSelected ? 'ring-2 ring-primary bg-primary/5 border-primary/20' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => applyPreset(key)}
                    >
                      <CardContent className="p-6 text-center space-y-4">
                        <div className="flex justify-center">
                          <div className={`p-3 rounded-full bg-${colorClass}-100 text-${colorClass}-600 dark:bg-${colorClass}-900 dark:text-${colorClass}-400`}>
                            <IconComponent className="h-6 w-6" />
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <h3 className="font-semibold">{preset.name}</h3>
                          <p className="text-sm text-muted-foreground">{preset.description}</p>
                        </div>
                        
                        {preset.example && (
                          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                            <code className="text-xs font-mono flex-1 truncate">{preset.example}</code>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0" 
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(preset.example!) }}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        
                        {isSelected && (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
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
                  {formFields.map(({ label, id, value, placeholder, type }) => (
                    <div key={id} className="space-y-2">
                      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
                      <Input 
                        id={id} 
                        type={type}
                        value={value} 
                        onChange={(e) => updateForm({ [id]: type === 'number' ? Number(e.target.value) : e.target.value })} 
                        placeholder={placeholder}
                        className="font-mono"
                      />
                    </div>
                  ))}
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Default Database</Label>
                    <Select value={form.database.toString()} onValueChange={(value) => updateForm({ database: Number(value) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <Label htmlFor="connectionString" className="text-sm font-medium">Redis Connection String</Label>
                    <Textarea
                      id="connectionString"
                      value={form.connectionString}
                      onChange={(e) => updateForm({ connectionString: e.target.value })}
                      placeholder="redis://default:password@host:port/database&#10;&#10;Examples:&#10;redis://localhost:6379&#10;redis://default:QcwgNhXhWOWPwZAfuUDJixoQLVfYZTda@crossover.proxy.rlwy.net:23278"
                      className="font-mono text-sm min-h-24 resize-none"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Connection Type</Label>
                      <Select value={form.connectionType} onValueChange={(value) => updateForm({ connectionType: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {connectionTypes.map(({ value, label }) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Default Database</Label>
                      <Select value={form.database.toString()} onValueChange={(value) => updateForm({ database: Number(value) })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
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
              {actionButtons.map(({ label, onClick, disabled, variant, icon: Icon, spin }) => (
                <Button 
                  key={label}
                  onClick={onClick} 
                  disabled={disabled}
                  variant={variant}
                  size="lg"
                  className="min-w-32"
                >
                  <Icon className={`h-4 w-4 mr-2 ${spin ? 'animate-spin' : ''}`} />
                  {label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Connection Help */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Connection Help</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div><strong>Local Redis:</strong> Ensure Redis is running locally</div>
                <div><strong>Railway:</strong> Use connection string from Railway dashboard</div>
                <div><strong>Cloud:</strong> Check firewall and external access settings</div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}

export default ConnectionPage

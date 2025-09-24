import { useState, useEffect, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { 
  Database, Key, Search, Plus, Trash2, Edit, RefreshCw, Loader2, 
  Copy, MoreVertical, FileText, CheckCircle2, AlertTriangle
} from 'lucide-react'

interface DatabaseInfo {
  id: number; keys: number; expires: number; avgTtl: number
}

interface RedisKey {
  key: string; value: string; type: string; ttl?: number; size?: number
}

interface DatabasesPageProps {
  isConnected: boolean; currentDb: number; setCurrentDb: (value: number) => void
  showStatus: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void
}

const DatabaseBrowser = ({ isConnected, currentDb, setCurrentDb, showStatus }: DatabasesPageProps) => {
  const [databases, setDatabases] = useState<DatabaseInfo[]>([])
  const [keys, setKeys] = useState<RedisKey[]>([])
  const [selectedKey, setSelectedKey] = useState<RedisKey | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [keyTypeFilter, setKeyTypeFilter] = useState('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [loading, setLoading] = useState({
    databases: false, keys: false, switching: false, operations: false
  })
  
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newTtl, setNewTtl] = useState('')
  const [keyType, setKeyType] = useState('string')

  const updateLoading = (key: keyof typeof loading, value: boolean) => 
    setLoading(prev => ({ ...prev, [key]: value }))

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`/api${endpoint}`, { 
      headers: { 'Content-Type': 'application/json' }, ...options 
    })
    return response.json()
  }

  const loadDatabases = async () => {
    updateLoading('databases', true)
    try {
      const result = await apiCall('/databases-info')
      if (result.success) {
        setDatabases(result.databases || [])
      }
    } catch (error) {
      showStatus('error', 'Failed to load databases', 'Could not fetch database information')
    } finally {
      updateLoading('databases', false)
    }
  }

  const switchDatabase = async (dbNum: number) => {
    updateLoading('switching', true)
    try {
      const result = await apiCall('/switch-database', { 
        method: 'POST', 
        body: JSON.stringify({ database: dbNum }) 
      })
      if (result.success) {
        setCurrentDb(dbNum)
        setKeys([])
        setSelectedKey(null)
        showStatus('success', 'Database Switched', `Connected to DB${dbNum}`)
        loadKeys()
      }
    } catch (error) {
      showStatus('error', 'Switch Failed', 'Could not switch database')
    } finally {
      updateLoading('switching', false)
    }
  }

  const loadKeys = async () => {
    updateLoading('keys', true)
    try {
      const result = await apiCall('/all')
      if (result.success && Array.isArray(result.data)) {
        const enrichedKeys = result.data.map((item: any) => ({
          ...item,
          type: item.type || 'string',
          size: item.size || item.value?.length || 0
        }))
        setKeys(enrichedKeys)
      } else {
        setKeys([])
      }
    } catch (error) {
      showStatus('error', 'Failed to load keys', 'Could not retrieve database keys')
      setKeys([])
    } finally {
      updateLoading('keys', false)
    }
  }

  const addKey = async () => {
    if (!newKey.trim() || !newValue.trim()) return
    
    updateLoading('operations', true)
    try {
      const payload: any = { key: newKey.trim(), value: newValue.trim() }
      if (newTtl && parseInt(newTtl) > 0) {
        payload.ttl = parseInt(newTtl)
      }
      
      const result = await apiCall('/set', { method: 'POST', body: JSON.stringify(payload) })
      if (result.success) {
        setNewKey('')
        setNewValue('')
        setNewTtl('')
        setShowAddDialog(false)
        showStatus('success', 'Key Created', `Added "${payload.key}"`)
        loadKeys()
        loadDatabases()
      }
    } catch (error) {
      showStatus('error', 'Creation Failed', 'Could not create key')
    } finally {
      updateLoading('operations', false)
    }
  }

  const deleteKey = async (keyName: string) => {
    updateLoading('operations', true)
    try {
      const result = await apiCall(`/delete/${encodeURIComponent(keyName)}`, { method: 'DELETE' })
      if (result.success) {
        showStatus('success', 'Key Deleted', `Removed "${keyName}"`)
        setKeys(prev => prev.filter(k => k.key !== keyName))
        if (selectedKey?.key === keyName) setSelectedKey(null)
        loadDatabases()
      }
    } catch (error) {
      showStatus('error', 'Deletion Failed', 'Could not delete key')
    } finally {
      updateLoading('operations', false)
    }
  }

  const updateKey = async (keyName: string, newValue: string) => {
    updateLoading('operations', true)
    try {
      const result = await apiCall('/set', { 
        method: 'POST', 
        body: JSON.stringify({ key: keyName, value: newValue }) 
      })
      if (result.success) {
        setKeys(prev => prev.map(k => 
          k.key === keyName ? { ...k, value: newValue } : k
        ))
        if (selectedKey?.key === keyName) {
          setSelectedKey(prev => prev ? { ...prev, value: newValue } : null)
        }
        showStatus('success', 'Key Updated', `Updated "${keyName}"`)
      }
    } catch (error) {
      showStatus('error', 'Update Failed', 'Could not update key')
    } finally {
      updateLoading('operations', false)
    }
  }

  const filteredKeys = useMemo(() => {
    return keys.filter(key => {
      const matchesSearch = key.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           key.value.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = keyTypeFilter === 'all' || key.type === keyTypeFilter
      return matchesSearch && matchesType
    })
  }, [keys, searchTerm, keyTypeFilter])

  const keyTypes = useMemo(() => {
    const types = new Set(keys.map(k => k.type))
    return Array.from(types)
  }, [keys])

  useEffect(() => {
    if (isConnected) {
      loadDatabases()
      loadKeys()
    }
  }, [isConnected])

  const currentDbInfo = databases.find(db => db.id === currentDb)

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto p-6 space-y-6 max-w-7xl">
          <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-background border p-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold mb-2">Redis Database Browser</h1>
                <p className="text-lg text-muted-foreground">Explore and manage your Redis databases</p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Disconnected
              </Badge>
            </div>
          </div>
          
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Database className="h-16 w-16 text-muted-foreground/40 mx-auto mb-6" />
              <h3 className="text-xl font-semibold mb-3">Connection Required</h3>
              <p className="text-muted-foreground mb-6">Connect to Redis to browse and manage your databases</p>
              <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />No Connection</Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto p-6 space-y-6 max-w-7xl">
        
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-background border p-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Redis Database Browser</h1>
              <div className="flex items-center gap-4 text-lg text-muted-foreground">
                <span>Explore and manage your Redis databases</span>
                <Badge variant="outline" className="font-mono">DB{currentDb}</Badge>
                {currentDbInfo && (
                  <Badge variant="secondary">{currentDbInfo.keys.toLocaleString()} keys</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={loadKeys} variant="outline" disabled={loading.keys}>
                {loading.keys ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh
              </Button>
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </Badge>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Database Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Key
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Key</DialogTitle>
                    <DialogDescription>Add a new key-value pair to DB{currentDb}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Key Name</Label>
                        <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} />
                      </div>
                      <div>
                        <Label>Type</Label>
                        <Select value={keyType} onValueChange={setKeyType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="string">String</SelectItem>
                            <SelectItem value="list">List</SelectItem>
                            <SelectItem value="hash">Hash</SelectItem>
                            <SelectItem value="set">Set</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Value</Label>
                      <Textarea 
                        value={newValue} 
                        onChange={(e) => setNewValue(e.target.value)}
                        placeholder="Enter value data..."
                        className="min-h-[100px]"
                      />
                    </div>
                    <div>
                      <Label>TTL (seconds)</Label>
                      <Input 
                        type="number" 
                        value={newTtl} 
                        onChange={(e) => setNewTtl(e.target.value)}
                        placeholder="Optional expiration time"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={addKey} disabled={loading.operations}>
                        {loading.operations ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                        Create
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button onClick={loadKeys} variant="outline" disabled={loading.keys}>
                {loading.keys ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Refresh Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Browser Interface */}
        <Card className="min-h-[600px]">
          <CardContent className="p-0">
            <ResizablePanelGroup direction="horizontal" className="h-[600px]">
              
              {/* Database Sidebar */}
              <ResizablePanel defaultSize={20} minSize={15}>
                <div className="h-full border-r bg-muted/30">
                  <div className="p-4 border-b bg-card">
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                      Databases
                    </h3>
                  </div>
                  <ScrollArea className="h-[calc(600px-60px)]">
                    <div className="p-3 space-y-2">
                      {Array.from({length: 16}, (_, i) => {
                        const dbInfo = databases.find(db => db.id === i)
                        const isActive = currentDb === i
                        const hasKeys = (dbInfo?.keys ?? 0) > 0

                        return (
                          <div
                            key={i}
                            onClick={() => switchDatabase(i)}
                            className={`
                              flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all
                              hover:shadow-md hover:-translate-y-0.5
                              ${isActive 
                                ? 'bg-primary text-primary-foreground shadow-lg' 
                                : 'hover:bg-muted/60 bg-background border'
                              }
                              ${loading.switching ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                          >
                            <div className="flex items-center space-x-2">
                              <Database className="h-4 w-4" />
                              <span className="font-medium">DB{i}</span>
                            </div>
                            <Badge variant={isActive ? "secondary" : "outline"} className="text-xs">
                              {hasKeys ? (dbInfo?.keys ?? 0).toLocaleString() : '0'}
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </ResizablePanel>

              <ResizableHandle />

              {/* Keys Panel */}
              <ResizablePanel defaultSize={35} minSize={25}>
                <div className="h-full flex flex-col">
                  <div className="p-4 border-b bg-card space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search keys..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Select value={keyTypeFilter} onValueChange={setKeyTypeFilter}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          {keyTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Badge variant="outline">
                        {filteredKeys.length} of {keys.length}
                      </Badge>
                    </div>
                  </div>

                  <ScrollArea className="flex-1">
                    {loading.keys ? (
                      <div className="p-4 space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="p-4 border rounded-lg animate-pulse">
                            <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                            <div className="h-3 bg-muted rounded w-1/2" />
                          </div>
                        ))}
                      </div>
                    ) : filteredKeys.length === 0 ? (
                      <div className="p-8 text-center">
                        <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-1">No Keys Found</h3>
                        <p className="text-sm text-muted-foreground">
                          {searchTerm ? 'Try adjusting your search' : 'This database is empty'}
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 space-y-2">
                        {filteredKeys.map((key) => (
                          <Card
                            key={key.key}
                            onClick={() => setSelectedKey(key)}
                            className={`
                              cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5
                              ${selectedKey?.key === key.key 
                                ? 'ring-2 ring-primary bg-primary/5 border-primary/20' 
                                : 'hover:bg-muted/30'
                              }
                            `}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <Key className="h-4 w-4 text-primary" />
                                  <span className="font-mono text-sm font-medium truncate max-w-[200px]">
                                    {key.key}
                                  </span>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuGroup>
                                      <DropdownMenuItem onClick={() => navigator.clipboard.writeText(key.key)}>
                                        <Copy className="h-4 w-4 mr-2" />
                                        Copy Key
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => deleteKey(key.key)}>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              <div className="flex items-center justify-between">
                                <Badge variant="outline" className="text-xs">
                                  {key.type}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {key.size} bytes
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </ResizablePanel>

              <ResizableHandle />

              {/* Value Viewer */}
              <ResizablePanel defaultSize={45}>
                <div className="h-full flex flex-col">
                  {selectedKey ? (
                    <>
                      <div className="p-4 border-b bg-card">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Key Details
                          </h3>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newValue = prompt('Edit value:', selectedKey.value)
                                if (newValue !== null && newValue.trim()) {
                                  updateKey(selectedKey.key, newValue.trim())
                                }
                              }}
                              disabled={loading.operations}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteKey(selectedKey.key)}
                              disabled={loading.operations}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {[
                            { label: 'Key Name', value: selectedKey.key, mono: true },
                            { label: 'Type', value: selectedKey.type, badge: true },
                            { label: 'Size', value: `${selectedKey.size} bytes` },
                            { label: 'TTL', value: selectedKey.ttl ? `${selectedKey.ttl}s` : 'No expiration' }
                          ].map(({ label, value, mono, badge }) => (
                            <div key={label}>
                              <Label className="text-muted-foreground">{label}</Label>
                              {badge ? (
                                <Badge variant="outline" className="mt-1">{value}</Badge>
                              ) : (
                                <p className={`mt-1 ${mono ? 'font-mono' : ''}`}>{value}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex-1 p-4">
                        <Label className="text-muted-foreground">Value</Label>
                        <ScrollArea className="h-full mt-2">
                          <div className="p-4 bg-muted/30 rounded-lg font-mono text-sm whitespace-pre-wrap border">
                            {selectedKey.value}
                          </div>
                        </ScrollArea>
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <Key className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-2">No Key Selected</h3>
                        <p className="text-sm text-muted-foreground">
                          Select a key from the list to view its details and value
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DatabaseBrowser

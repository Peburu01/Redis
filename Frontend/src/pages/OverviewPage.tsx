import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Database, TrendingUp, Cpu, Network, TestTube, RefreshCw, 
  Cloud, Wifi, Shield, CheckCircle2, AlertCircle, 
  Timer, Gauge, Target, Eye
} from 'lucide-react'

interface DatabaseInfo { id: number; keys: number; expires: number; avgTtl: number }
interface PerformanceMetrics {
  latency: number; opsPerSec: number; hitRatio: string; memoryUsageMB: number
  connectedClients: string; currentDbKeys: number; totalCommands: string
  keyspaceHits: string; keyspaceMisses: string; usedMemoryHuman: string
  uptimeHuman: string; memoryUsagePercent?: string; redisVersion?: string
}

interface OverviewPageProps {
  isConnected: boolean; currentDb: number; connectionInfo: any
  showStatus: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void
  setActiveSection: (section: string) => void
}

const OverviewPage = ({ isConnected, currentDb, connectionInfo, showStatus, setActiveSection }: OverviewPageProps) => {
  const [databases, setDatabases] = useState<DatabaseInfo[]>([])
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null)
  const [loading, setLoading] = useState({ refreshing: false, testing: false, updating: false })
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const apiCall = async (endpoint: string) => {
    const response = await fetch(`/api${endpoint}`, { headers: { 'Content-Type': 'application/json' } })
    return await response.json()
  }

  const updateLoading = (key: keyof typeof loading, value: boolean) => 
    setLoading(prev => ({ ...prev, [key]: value }))

  const refreshDatabases = async () => {
    if (!isConnected) return
    updateLoading('refreshing', true)
    try {
      const result = await apiCall('/databases-info')
      if (result.success) {
        setDatabases(result.databases || [])
        showStatus('success', 'Refresh Complete', `Found ${result.totalKeys || 0} keys`)
      }
    } catch (error: any) {
      showStatus('error', 'Refresh Failed', error.message)
    } finally {
      updateLoading('refreshing', false)
    }
  }

  const updatePerformance = async () => {
    if (!isConnected) return
    updateLoading('updating', true)
    try {
      const result = await apiCall('/performance')
      if (result.success) {
        setPerformance(result.performance)
        setLastUpdate(new Date())
      }
    } catch { } finally {
      updateLoading('updating', false)
    }
  }

  const runLatencyTest = async () => {
    if (!isConnected) return
    updateLoading('testing', true)
    try {
      const result = await apiCall('/latency-test?samples=100')
      if (result.success) {
        showStatus('success', 'Test Complete', `Avg: ${result.avg}ms | P95: ${result.p95}ms`)
        await updatePerformance()
      }
    } catch (error: any) {
      showStatus('error', 'Test Failed', error.message)
    } finally {
      updateLoading('testing', false)
    }
  }

  useEffect(() => {
    if (isConnected) {
      updatePerformance()
      refreshDatabases()
      const interval = setInterval(updatePerformance, 5000)
      return () => clearInterval(interval)
    }
  }, [isConnected])

  const getHealthColor = () => {
    if (!performance) return 'blue'
    const latency = performance.latency || 0
    const hitRatio = parseFloat(performance.hitRatio || '0')
    if (latency <= 10 && hitRatio >= 80) return 'green'
    if (latency <= 50 && hitRatio >= 60) return 'blue'
    return latency <= 100 ? 'yellow' : 'red'
  }

  const getLatencyStatus = (latency?: number) => {
    if (!latency) return 'No data'
    if (latency <= 10) return 'Excellent'
    if (latency <= 50) return 'Good'
    return 'Slow'
  }

  const getStatusColor = (type: string) => {
    const colors = { green: 'text-green-600 border-l-green-500', red: 'text-red-600 border-l-red-500', 
                    yellow: 'text-yellow-600 border-l-yellow-500', blue: 'text-blue-600 border-l-blue-500' }
    return colors[type as keyof typeof colors] || colors.blue
  }

  const MetricCard = ({ title, value, unit, icon: Icon, color, trend }: {
    title: string; value: string | number; unit?: string; icon: any; color: string; trend?: string
  }) => (
    <Card className={`border-l-4 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer ${getStatusColor(color).split(' ')[1]}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-4 w-4 ${getStatusColor(color).split(' ')[0]}`} />
              <p className="text-sm text-muted-foreground">{title}</p>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{value}</p>
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </div>
          </div>
          {trend && <Badge variant="secondary" className="text-xs">{trend}</Badge>}
        </div>
      </CardContent>
    </Card>
  )

  const health = getHealthColor()
  const latency = performance?.latency || 0

  const metrics = [
    { title: 'Response Time', value: latency, unit: 'ms', icon: Timer, 
      color: latency <= 10 ? 'green' : latency <= 50 ? 'blue' : 'red', trend: getLatencyStatus(latency) },
    { title: 'Throughput', value: performance?.opsPerSec ?? 0, unit: 'ops/s', icon: TrendingUp, color: 'blue', trend: 'Real-time' },
    { title: 'Memory Usage', value: performance?.memoryUsageMB ?? 0, unit: 'MB', icon: Cpu, color: 'yellow', 
      trend: performance?.memoryUsagePercent ? `${performance.memoryUsagePercent}% used` : 'Available' },
    { title: 'Active Clients', value: performance?.connectedClients ?? '0', icon: Network, color: 'green', trend: 'Connected' }
  ]

  const actions = [
    { label: 'Performance Test', icon: TestTube, onClick: runLatencyTest, isLoading: loading.testing },
    { label: 'Refresh Data', icon: RefreshCw, onClick: refreshDatabases, isLoading: loading.refreshing },
    { label: 'Browse Data', icon: Database, onClick: () => setActiveSection('databases'), isLoading: false },
    { label: 'Monitoring', icon: TrendingUp, onClick: () => setActiveSection('monitoring'), isLoading: false }
  ]

  const performanceData = [
    ['Database Keys', performance?.currentDbKeys?.toLocaleString()],
    ['Total Commands', performance?.totalCommands],
    ['Memory Used', performance?.usedMemoryHuman]
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto p-6 space-y-6 max-w-7xl">
        
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-background border p-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Redis Analytics Hub</h1>
              <p className="text-lg text-muted-foreground">Real-time monitoring and performance insights</p>
            </div>
            <div className="text-right space-y-2">
              <Badge variant={isConnected ? "default" : "destructive"} className="gap-1">
                {isConnected ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {isConnected ? `HEALTHY (${health.toUpperCase()})` : 'OFFLINE'}
              </Badge>
              {lastUpdate && <p className="text-xs text-muted-foreground">Updated {lastUpdate.toLocaleTimeString()}</p>}
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading.updating && !performance ? (
            Array.from({length: 4}).map((_, i) => (
              <Card key={i} className="p-6"><Skeleton className="h-20 w-full" /></Card>
            ))
          ) : (
            metrics.map((metric, i) => <MetricCard key={i} {...metric} />)
          )}
        </div>

        {/* Connection Details */}
        {isConnected && connectionInfo && (
          <Card className={`border-l-4 ${getStatusColor(health).split(' ')[1]}`}>
            <CardHeader>
              <div className="flex items-center gap-3">
                {connectionInfo.connectionType === 'railway' ? <Cloud className="h-6 w-6 text-purple-500" /> : 
                  connectionInfo.ssl ? <Shield className="h-6 w-6 text-green-500" /> : <Wifi className="h-6 w-6 text-blue-500" />}
                <div>
                  <CardTitle>Connection Active</CardTitle>
                  <CardDescription>{connectionInfo.host}:{connectionInfo.port} • {performance?.redisVersion || 'Unknown'}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Databases */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Databases ({databases.length})
                </CardTitle>
                <Button variant="outline" size="sm" onClick={refreshDatabases} disabled={loading.refreshing}>
                  <RefreshCw className={`h-4 w-4 ${loading.refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {databases.slice(0, 6).map((db) => {
                  const maxKeys = Math.max(...databases.map(d => d.keys || 1))
                  const percentage = (db.keys / maxKeys) * 100
                  const isActive = db.id === currentDb
                  return (
                    <div key={db.id} className={`p-3 rounded-lg transition-all ${
                      isActive ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                          <span className="font-medium">DB {db.id}</span>
                          {isActive && <Badge variant="secondary" className="text-xs"><Eye className="h-3 w-3 mr-1" />Active</Badge>}
                        </div>
                        <span className="font-mono text-sm">{db.keys?.toLocaleString() ?? '0'} keys</span>
                      </div>
                      <Progress value={percentage} className="h-1.5" />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Cache Hit Ratio</span>
                    <span className="text-xl font-bold">{performance?.hitRatio ?? '-'}%</span>
                  </div>
                  <Progress value={parseFloat(performance?.hitRatio ?? '0')} className="h-2" />
                </div>
                
                <div className="grid grid-cols-1 gap-3 pt-3 border-t">
                  {performanceData.map(([label, value]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className="font-medium">{value ?? '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {actions.map(({ label, icon: Icon, onClick, isLoading }) => (
                <Button key={label} onClick={onClick} disabled={!isConnected || isLoading} variant="outline" 
                  className="h-20 flex-col gap-2">
                  <Icon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default OverviewPage

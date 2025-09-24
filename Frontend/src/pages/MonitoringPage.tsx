import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { 
  Database, Zap, Activity, BarChart3, HardDrive, Users, TestTube, 
  RefreshCw, Loader2, Info, Wifi, Server, Clock, TrendingUp, AlertTriangle,
  Timer, Gauge, CheckCircle2
} from 'lucide-react'

interface PerformanceMetrics {
  latency: number; opsPerSec: number; hitRatio: string; memoryUsageMB: number
  connectedClients: string; currentDbKeys: number; totalCommands: string
  keyspaceHits: string; keyspaceMisses: string; usedMemoryHuman: string
  uptimeHuman: string; memoryUsagePercent?: string; redisVersion?: string
  serverMode?: string; maxMemoryHuman?: string
}

interface MonitoringPageProps {
  isConnected: boolean
  showStatus: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void
}

const MonitoringPage = ({ isConnected, showStatus }: MonitoringPageProps) => {
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null)
  const [loading, setLoading] = useState({ updating: false, testing: false })
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const intervalRef = useRef<number | null>(null)

  const updateLoading = (key: keyof typeof loading, value: boolean) => 
    setLoading(prev => ({ ...prev, [key]: value }))

  const fetchPerformanceData = async () => {
    if (!isConnected || loading.updating) return
    
    updateLoading('updating', true)
    try {
      const response = await fetch('/api/performance', { 
        headers: { 'Content-Type': 'application/json' } 
      })
      const result = await response.json()
      
      if (result.success) {
        setPerformance(result.performance)
        setLastUpdate(new Date())
      }
    } catch (error) {
      showStatus('error', 'Update Failed', 'Failed to fetch performance data')
    } finally {
      updateLoading('updating', false)
    }
  }

  const runLatencyTest = async () => {
    if (!isConnected || loading.testing) return
    
    updateLoading('testing', true)
    showStatus('info', 'Performance Test', 'Running benchmark...')
    
    try {
      const response = await fetch('/api/latency-test?samples=100', { 
        headers: { 'Content-Type': 'application/json' } 
      })
      const result = await response.json()
      
      if (result.success) {
        showStatus('success', 'Test Completed', 
          `Avg: ${result.avg}ms | P95: ${result.p95}ms | Throughput: ${result.throughput} ops/s`)
        fetchPerformanceData()
      }
    } catch (error) {
      showStatus('error', 'Test Failed', 'Latency test failed')
    } finally {
      updateLoading('testing', false)
    }
  }

  useEffect(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (isConnected && autoRefresh) {
      intervalRef.current = window.setInterval(fetchPerformanceData, 3000)
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isConnected, autoRefresh])

  useEffect(() => {
    if (isConnected) fetchPerformanceData()
  }, [isConnected])

  const getLatencyStatus = (latency: number) => {
    if (latency > 50) return { status: 'poor', label: 'High', color: 'red' }
    if (latency > 20) return { status: 'fair', label: 'Normal', color: 'yellow' }
    return { status: 'excellent', label: 'Excellent', color: 'green' }
  }

  const getHitRatioStatus = (hitRatio: string) => {
    const ratio = parseFloat(hitRatio || '0')
    if (ratio > 80) return { status: 'excellent', label: 'Excellent', color: 'green' }
    if (ratio > 60) return { status: 'good', label: 'Good', color: 'blue' }
    return { status: 'poor', label: 'Poor', color: 'red' }
  }

  const MetricCard = ({ title, value, unit, icon: Icon, color = 'blue', trend }: {
    title: string; value: string | number; unit?: string; icon: any; color?: string; trend?: string
  }) => (
    <Card className={`border-l-4 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer ${
      color === 'green' ? 'border-l-green-500' : color === 'red' ? 'border-l-red-500' : 
      color === 'yellow' ? 'border-l-yellow-500' : 'border-l-blue-500'
    }`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-4 w-4 ${color === 'green' ? 'text-green-600' : color === 'red' ? 'text-red-600' : 
                color === 'yellow' ? 'text-yellow-600' : 'text-blue-600'}`} />
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

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto p-6 space-y-6 max-w-7xl">
          <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-background border p-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold mb-2">Redis System Monitor</h1>
                <p className="text-lg text-muted-foreground">Real-time performance monitoring and analytics</p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Disconnected
              </Badge>
            </div>
          </div>
          
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Wifi className="h-16 w-16 text-muted-foreground/40 mx-auto mb-6" />
              <h3 className="text-xl font-semibold mb-3">Connection Required</h3>
              <p className="text-muted-foreground mb-6">Connect to Redis to access real-time monitoring</p>
              <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />No Connection</Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const latencyStatus = getLatencyStatus(performance?.latency || 0)
  const hitRatioStatus = getHitRatioStatus(performance?.hitRatio || '0')

  const metrics = [
    { title: 'Response Time', value: performance?.latency || 0, unit: 'ms', icon: Timer, 
      color: latencyStatus.color, trend: latencyStatus.label },
    { title: 'Throughput', value: performance?.opsPerSec || 0, unit: 'ops/s', icon: TrendingUp, color: 'blue' },
    { title: 'Hit Ratio', value: performance?.hitRatio || '0', unit: '%', icon: BarChart3,
      color: hitRatioStatus.color, trend: hitRatioStatus.label },
    { title: 'Memory Usage', value: performance?.memoryUsageMB || 0, unit: 'MB', icon: HardDrive, 
      color: 'yellow', trend: performance?.memoryUsagePercent ? `${performance.memoryUsagePercent}% used` : 'Available' },
    { title: 'Active Clients', value: performance?.connectedClients || '0', icon: Users, color: 'green', trend: 'Connected' },
    { title: 'Total Keys', value: performance?.currentDbKeys || 0, icon: Database, color: 'blue' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto p-6 space-y-6 max-w-7xl">
        
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-background border p-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Redis System Monitor</h1>
              <div className="flex items-center gap-4 text-lg text-muted-foreground">
                <span>Real-time performance monitoring and analytics</span>
                {lastUpdate && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Updated {lastUpdate.toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center space-x-2">
                <Switch id="auto" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
                <Label htmlFor="auto" className="text-sm">Auto-refresh</Label>
              </div>
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
              <Gauge className="h-5 w-5" />
              Performance Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button onClick={fetchPerformanceData} variant="outline" disabled={loading.updating}>
                {loading.updating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Refresh Data
              </Button>
              <Button onClick={runLatencyTest} disabled={loading.testing}>
                {loading.testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
                Run Benchmark
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Grid */}
        {!performance && loading.updating ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-20 w-full" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((metric, i) => <MetricCard key={i} {...metric} />)}
          </div>
        )}

        {performance && (
          <>
            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Cache Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Cache Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{performance.keyspaceHits}</p>
                      <p className="text-sm text-muted-foreground">Cache Hits</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{performance.keyspaceMisses}</p>
                      <p className="text-sm text-muted-foreground">Cache Misses</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Hit Ratio</span>
                      <span className="text-xl font-bold">{performance.hitRatio}%</span>
                    </div>
                    <Progress value={parseFloat(performance.hitRatio)} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Response Time Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Response Time Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-6 bg-muted/50 rounded-lg">
                    <p className="text-4xl font-bold mb-2">{performance.latency}ms</p>
                    <Badge variant={performance.latency > 50 ? "destructive" : performance.latency > 20 ? "secondary" : "default"}>
                      {latencyStatus.label}
                    </Badge>
                  </div>
                  <Button onClick={runLatencyTest} className="w-full" variant="outline" disabled={loading.testing}>
                    {loading.testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
                    Run Performance Test
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Tabs */}
            <Tabs defaultValue="memory" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="memory">Memory Usage</TabsTrigger>
                <TabsTrigger value="server">Server Info</TabsTrigger>
                <TabsTrigger value="operations">Operations</TabsTrigger>
              </TabsList>
              
              <TabsContent value="memory" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <HardDrive className="h-5 w-5" />
                      Memory Usage Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-xl font-bold">{performance.usedMemoryHuman}</p>
                        <p className="text-sm text-muted-foreground">Memory Used</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-xl font-bold">{performance.maxMemoryHuman || 'No Limit'}</p>
                        <p className="text-sm text-muted-foreground">Memory Limit</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-xl font-bold">{performance.currentDbKeys.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Total Keys</p>
                      </div>
                    </div>
                    {performance.memoryUsagePercent && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Usage Percentage</span>
                          <span>{performance.memoryUsagePercent}%</span>
                        </div>
                        <Progress value={parseFloat(performance.memoryUsagePercent)} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="server" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      Server Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {[
                        { label: 'Redis Version', value: performance.redisVersion || 'Unknown' },
                        { label: 'Server Mode', value: performance.serverMode || 'Unknown' },
                        { label: 'Uptime', value: performance.uptimeHuman },
                        { label: 'Connections', value: performance.connectedClients }
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <h4 className="font-semibold text-sm text-muted-foreground mb-2">{label}</h4>
                          <p className="text-lg font-bold">{value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="operations" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Operations Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {[
                        { label: 'Total Commands', value: performance.totalCommands },
                        { label: 'Operations/sec', value: performance.opsPerSec },
                        { label: 'Keyspace Hits', value: performance.keyspaceHits },
                        { label: 'Keyspace Misses', value: performance.keyspaceMisses }
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <h4 className="font-semibold text-sm text-muted-foreground mb-2">{label}</h4>
                          <p className="text-lg font-bold">{value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Status Alert */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Auto-refresh {autoRefresh ? 'enabled (3s intervals)' : 'disabled'} • Real-time monitoring active</span>
                <Badge variant="outline"><Activity className="h-3 w-3 mr-1" />Live Data</Badge>
              </AlertDescription>
            </Alert>
          </>
        )}
      </div>
    </div>
  )
}

export default MonitoringPage

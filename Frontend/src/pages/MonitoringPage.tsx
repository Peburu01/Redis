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
  RefreshCw, Loader2, Info, Wifi, Server, Clock, TrendingUp, AlertTriangle
} from 'lucide-react'
import MetricCard from '../components/MetricCard'

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
  const intervalRef = useRef<number | null>(null) // Fixed: Use number for browser environment

  const fetchPerformanceData = async () => {
    if (!isConnected || loading.updating) return
    
    setLoading(prev => ({ ...prev, updating: true }))
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
      setLoading(prev => ({ ...prev, updating: false }))
    }
  }

  const runLatencyTest = async () => {
    if (!isConnected || loading.testing) return
    
    setLoading(prev => ({ ...prev, testing: true }))
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
      setLoading(prev => ({ ...prev, testing: false }))
    }
  }

  // Auto-refresh effect
  useEffect(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current) // Use window.clearInterval for browser
      intervalRef.current = null
    }

    if (isConnected && autoRefresh) {
      intervalRef.current = window.setInterval(() => { // Use window.setInterval for browser
        fetchPerformanceData()
      }, 3000)
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isConnected, autoRefresh])

  // Initial load effect
  useEffect(() => {
    if (isConnected) {
      fetchPerformanceData()
    }
  }, [isConnected])

  const getLatencyStatus = (latency: number) => {
    if (latency > 50) return { status: 'poor', label: 'High' }
    if (latency > 20) return { status: 'fair', label: 'Normal' }
    return { status: 'excellent', label: 'Excellent' }
  }

  const getHitRatioStatus = (hitRatio: string) => {
    const ratio = parseFloat(hitRatio || '0')
    if (ratio > 80) return { status: 'excellent', label: 'Excellent' }
    if (ratio > 60) return { status: 'good', label: 'Good' }
    return { status: 'poor', label: 'Poor' }
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">System Monitor</h1>
          <p className="text-muted-foreground">Real-time Redis monitoring</p>
        </div>
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Wifi className="h-16 w-16 text-muted-foreground/40 mx-auto mb-6" />
            <h3 className="text-xl font-semibold mb-3">Connection Required</h3>
            <p className="text-muted-foreground mb-6">Connect to Redis to access monitoring</p>
            <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />Disconnected</Badge>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">System Monitor</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Real-time Redis monitoring</span>
            {lastUpdate && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Updated {lastUpdate.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-2">
            <Switch id="auto" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            <Label htmlFor="auto">Auto-refresh</Label>
          </div>
          <Button onClick={fetchPerformanceData} variant="outline" size="sm" disabled={loading.updating}>
            {loading.updating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
          <Button onClick={runLatencyTest} size="sm" disabled={loading.testing}>
            {loading.testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
            Test
          </Button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {!performance && loading.updating && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {performance && (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <MetricCard 
              title="Latency" 
              value={performance.latency} 
              unit="ms" 
              icon={Zap} 
              change={getLatencyStatus(performance.latency).label}
              changeType={
                getLatencyStatus(performance.latency).status === 'excellent' ? 'positive' : 
                getLatencyStatus(performance.latency).status === 'fair' ? 'neutral' : 'negative'
              } 
            />
            <MetricCard title="Throughput" value={performance.opsPerSec} unit="ops/s" icon={TrendingUp} />
            <MetricCard 
              title="Hit Ratio" 
              value={performance.hitRatio} 
              unit="%" 
              icon={BarChart3}
              change={getHitRatioStatus(performance.hitRatio).label}
              changeType={
                getHitRatioStatus(performance.hitRatio).status === 'excellent' ? 'positive' : 
                getHitRatioStatus(performance.hitRatio).status === 'good' ? 'neutral' : 'negative'
              }
            />
            <MetricCard 
              title="Memory" 
              value={performance.memoryUsageMB} 
              unit="MB" 
              icon={HardDrive}
              change={performance.memoryUsagePercent ? `${performance.memoryUsagePercent}% used` : undefined} 
            />
            <MetricCard title="Connections" value={performance.connectedClients} icon={Users} />
            <MetricCard title="Keys" value={performance.currentDbKeys} icon={Database} />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="performance">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="memory">Memory</TabsTrigger>
              <TabsTrigger value="server">Server</TabsTrigger>
            </TabsList>
            
            <TabsContent value="performance" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />Cache Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{performance.keyspaceHits}</p>
                        <p className="text-xs text-muted-foreground">Hits</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">{performance.keyspaceMisses}</p>
                        <p className="text-xs text-muted-foreground">Misses</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Hit Ratio</span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{performance.hitRatio}%</span>
                        <Progress value={parseFloat(performance.hitRatio)} className="w-24 h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />Response Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center p-6 bg-muted/50 rounded-lg">
                      <p className="text-4xl font-bold mb-2">{performance.latency}ms</p>
                      <Badge 
                        variant={
                          performance.latency > 50 ? "destructive" : 
                          performance.latency > 20 ? "secondary" : "default"
                        }
                      >
                        {getLatencyStatus(performance.latency).label}
                      </Badge>
                    </div>
                    <Button onClick={runLatencyTest} className="w-full" variant="outline" disabled={loading.testing}>
                      {loading.testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
                      Run Benchmark
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="memory">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5" />Memory Usage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-xl font-bold">{performance.usedMemoryHuman}</p>
                      <p className="text-sm text-muted-foreground">Used</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-xl font-bold">{performance.maxMemoryHuman || 'No Limit'}</p>
                      <p className="text-sm text-muted-foreground">Limit</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-xl font-bold">{performance.currentDbKeys.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Keys</p>
                    </div>
                  </div>
                  {performance.memoryUsagePercent && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Usage</span><span>{performance.memoryUsagePercent}%</span>
                      </div>
                      <Progress value={parseFloat(performance.memoryUsagePercent)} className="h-2" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="server">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />Server Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2">Version</h4>
                      <p className="text-lg font-bold">{performance.redisVersion || 'Unknown'}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2">Mode</h4>
                      <Badge variant="outline" className="capitalize">{performance.serverMode || 'Unknown'}</Badge>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2">Uptime</h4>
                      <p className="text-lg font-bold">{performance.uptimeHuman}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2">Connections</h4>
                      <p className="text-lg font-bold">{performance.connectedClients}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Auto-refresh {autoRefresh ? 'enabled (3s)' : 'disabled'}</span>
              <Badge variant="outline"><Activity className="h-3 w-3 mr-1" />Connected</Badge>
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  )
}

export default MonitoringPage

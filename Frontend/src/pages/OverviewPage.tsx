import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Database, Zap, Activity, HardDrive, Users, TestTube, RefreshCw, 
  Cloud, Wifi, Loader2, TrendingUp, Server, Clock, Shield, 
  BarChart3, CheckCircle2, AlertCircle 
} from 'lucide-react'
import MetricCard from '../components/MetricCard'

// Types
interface DatabaseInfo {
  id: number; keys: number; expires: number; avgTtl: number
}

interface PerformanceMetrics {
  latency: number; opsPerSec: number; hitRatio: string; memoryUsageMB: number
  connectedClients: string; currentDbKeys: number; totalCommands: string
  keyspaceHits: string; keyspaceMisses: string; usedMemoryHuman: string; uptimeHuman: string
  memoryUsagePercent?: string; redisVersion?: string; serverMode?: string
  maxMemoryHuman?: string
}

interface OverviewPageProps {
  isConnected: boolean; currentDb: number; connectionInfo: any
  showStatus: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void
  setActiveSection: (section: string) => void
}

const OverviewPage = ({ isConnected, currentDb, connectionInfo, showStatus, setActiveSection }: OverviewPageProps) => {
  const [databases, setDatabases] = useState<DatabaseInfo[]>([])
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null)
  const [loadingStates, setLoadingStates] = useState({
    refreshing: false, testing: false, updating: false
  })
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // API helper
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(`/api${endpoint}`, { headers: { 'Content-Type': 'application/json' }, ...options })
      return await response.json()
    } catch (error) {
      throw new Error(`API call failed: ${error}`)
    }
  }

  // Refresh databases
  const refreshDatabases = async () => {
    if (!isConnected) return
    setLoadingStates(prev => ({ ...prev, refreshing: true }))
    try {
      const result = await apiCall('/databases-info')
      if (result.success) {
        setDatabases(result.databases || [])
        if (result.totalKeys !== undefined) {
          showStatus('success', 'Refresh Complete', `Found ${result.totalKeys} keys across all databases`)
        }
      }
    } catch (error: any) {
      showStatus('error', 'Refresh Failed', error.message)
    } finally {
      setLoadingStates(prev => ({ ...prev, refreshing: false }))
    }
  }

  // Update performance
  const updatePerformance = async () => {
    if (!isConnected || loadingStates.updating) return
    setLoadingStates(prev => ({ ...prev, updating: true }))
    try {
      const result = await apiCall('/performance')
      if (result.success) {
        setPerformance(result.performance)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Performance update error:', error)
    } finally {
      setLoadingStates(prev => ({ ...prev, updating: false }))
    }
  }

  // Run latency test
  const runLatencyTest = async () => {
    if (!isConnected) return
    setLoadingStates(prev => ({ ...prev, testing: true }))
    showStatus('info', 'Performance Test', 'Running comprehensive latency benchmark...')
    try {
      const result = await apiCall('/latency-test?samples=100')
      if (result.success) {
        showStatus('success', 'Benchmark Complete', 
          `Avg: ${result.avg}ms | P95: ${result.p95}ms | P99: ${result.p99}ms | Throughput: ${result.throughput} ops/s`)
        await updatePerformance()
      }
    } catch (error: any) {
      showStatus('error', 'Test Failed', error.message)
    } finally {
      setLoadingStates(prev => ({ ...prev, testing: false }))
    }
  }

  // Auto-update performance
  useEffect(() => {
    if (isConnected) {
      updatePerformance()
      const interval = setInterval(updatePerformance, 5000)
      return () => clearInterval(interval)
    }
  }, [isConnected])

  // Auto-refresh databases on mount
  useEffect(() => {
    if (isConnected) refreshDatabases()
  }, [isConnected])

  // Helper functions
  const getHealthStatus = () => {
    if (!performance) return { status: 'unknown', color: 'muted-foreground' }
    const latency = performance.latency
    const hitRatio = parseFloat(performance.hitRatio || '0')
    
    if (latency <= 10 && hitRatio >= 80) return { status: 'excellent', color: 'text-green-500' }
    if (latency <= 50 && hitRatio >= 60) return { status: 'good', color: 'text-blue-500' }
    if (latency <= 100) return { status: 'fair', color: 'text-yellow-500' }
    return { status: 'poor', color: 'text-red-500' }
  }

  const formatUptime = (uptime: string) => {
    return uptime?.replace(/(\d+)\s*days?\s*(\d+):(\d+):(\d+)/, '$1d $2h $3m') || 'Unknown'
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8 max-w-7xl">
        {/* Header Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
              <p className="text-lg text-muted-foreground mt-1">
                Real-time monitoring and performance insights
              </p>
            </div>
            <div className="flex items-center gap-2">
              {lastUpdate && (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {lastUpdate.toLocaleTimeString()}
                </Badge>
              )}
              <Badge variant={isConnected ? "default" : "destructive"} className="gap-1">
                {isConnected ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loadingStates.updating && !performance ? (
            // Loading skeletons
            Array.from({length: 4}).map((_, i) => (
              <Card key={i} className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </Card>
            ))
          ) : (
            <>
              <MetricCard 
                title="Response Time" 
                value={performance?.latency ?? 0} 
                unit="ms" 
                icon={Zap} 
                change={performance?.latency ? (performance.latency <= 10 ? 'Excellent' : performance.latency <= 50 ? 'Good' : 'Slow') : 'No data'}
                changeType={performance?.latency ? (performance.latency <= 10 ? 'positive' : performance.latency <= 50 ? 'neutral' : 'negative') : 'neutral'}
              />
              <MetricCard 
                title="Throughput" 
                value={performance?.opsPerSec ?? 0} 
                unit="ops/s" 
                icon={TrendingUp} 
                change="Operations per second"
                changeType="neutral"
              />
              <MetricCard 
                title="Memory Usage" 
                value={performance?.memoryUsageMB ?? 0} 
                unit="MB" 
                icon={HardDrive} 
                change={performance?.memoryUsagePercent ? `${performance.memoryUsagePercent}% used` : 'Memory utilization'}
                changeType="neutral"
              />
              <MetricCard 
                title="Active Clients" 
                value={performance?.connectedClients ?? '0'} 
                icon={Users} 
                change="Connected clients"
                changeType="neutral"
              />
            </>
          )}
        </div>

        {/* Connection Status Card */}
        {isConnected && connectionInfo && (
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                {connectionInfo.connectionType === 'railway' ? 
                  <Cloud className="h-6 w-6 text-purple-500" /> : 
                  connectionInfo.ssl ? <Shield className="h-6 w-6 text-green-500" /> :
                  <Wifi className="h-6 w-6 text-blue-500" />
                }
                <span>Connection Details</span>
                <Badge variant="outline" className={`ml-auto ${getHealthStatus().color}`}>
                  {getHealthStatus().status.toUpperCase()}
                </Badge>
              </CardTitle>
              <CardDescription>Active Redis instance information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <p className="text-base font-semibold capitalize">
                    {connectionInfo.connectionType || 'Local'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Endpoint</p>
                  <p className="text-base font-mono">
                    {connectionInfo.host}:{connectionInfo.port}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Security</p>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold">
                      {connectionInfo.ssl ? 'SSL/TLS' : 'Standard'}
                    </p>
                    {connectionInfo.ssl && <Shield className="h-4 w-4 text-green-500" />}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Version</p>
                  <p className="text-base font-semibold">
                    {performance?.redisVersion || 'Unknown'}
                  </p>
                </div>
              </div>
              
              {performance?.uptimeHuman && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">System Uptime</span>
                    </div>
                    <Badge variant="secondary">
                      {formatUptime(performance.uptimeHuman)}
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Database Status & Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Database Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Overview
              </CardTitle>
              <CardDescription>Key distribution across available databases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {databases.length === 0 ? (
                  <div className="text-center py-8">
                    <Database className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No database information available</p>
                  </div>
                ) : (
                  databases.slice(0, 8).map((db) => {
                    const maxKeys = Math.max(...databases.map(d => d.keys || 1))
                    const percentage = maxKeys > 0 ? (db.keys / maxKeys) * 100 : 0
                    const isCurrentDb = db.id === currentDb
                    
                    return (
                      <div key={db.id} className={`flex items-center justify-between p-2 rounded-lg transition-colors ${isCurrentDb ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full transition-colors ${
                            isCurrentDb ? 'bg-primary' : 'bg-muted-foreground/30'
                          }`} />
                          <span className="font-medium">Database {db.id}</span>
                          {isCurrentDb && <Badge variant="secondary" className="text-xs">Active</Badge>}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground font-mono min-w-16 text-right">
                            {db.keys?.toLocaleString() ?? '0'} keys
                          </span>
                          <Progress value={percentage} className="w-20 h-2" />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Insights
              </CardTitle>
              <CardDescription>Current system performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Cache Performance */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Cache Hit Ratio</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold">
                        {performance?.hitRatio ?? '-'}%
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={parseFloat(performance?.hitRatio ?? '0')} 
                    className="h-3"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Hits: {performance?.keyspaceHits ?? '-'}</span>
                    <span>Misses: {performance?.keyspaceMisses ?? '-'}</span>
                  </div>
                </div>

                <Separator />

                {/* Key Stats */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Current DB Keys</span>
                    <span className="font-semibold">
                      {performance?.currentDbKeys?.toLocaleString() ?? '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Commands</span>
                    <span className="font-semibold">
                      {performance?.totalCommands ?? '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Memory Used</span>
                    <span className="font-semibold">
                      {performance?.usedMemoryHuman ?? '-'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common operations and diagnostics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={runLatencyTest} 
                disabled={!isConnected || loadingStates.testing}
                size="lg"
              >
                {loadingStates.testing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4 mr-2" />
                )}
                {loadingStates.testing ? 'Running Test...' : 'Performance Test'}
              </Button>
              
              <Button 
                onClick={refreshDatabases} 
                variant="outline" 
                disabled={!isConnected || loadingStates.refreshing}
                size="lg"
              >
                {loadingStates.refreshing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {loadingStates.refreshing ? 'Refreshing...' : 'Refresh Data'}
              </Button>
              
              <Button 
                onClick={() => setActiveSection('data')} 
                variant="outline" 
                disabled={!isConnected}
                size="lg"
              >
                <Database className="h-4 w-4 mr-2" />
                Browse Data
              </Button>

              <Button 
                onClick={() => setActiveSection('monitoring')} 
                variant="outline" 
                disabled={!isConnected}
                size="lg"
              >
                <Activity className="h-4 w-4 mr-2" />
                Detailed Monitoring
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Status Alert */}
        {!isConnected && (
          <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Not Connected:</strong> Connect to a Redis instance to view system metrics and manage data.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}

export default OverviewPage

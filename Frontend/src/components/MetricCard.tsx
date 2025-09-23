import { Card, CardContent } from "@/components/ui/card"

const MetricCard = ({ title, value, unit, icon: Icon, change, changeType, className = "" }: {
  title: string; value: string | number; unit?: string; icon: any
  change?: string; changeType?: 'positive' | 'negative' | 'neutral'; className?: string
}) => {
  const changeColor = changeType === 'positive' ? 'text-chart-1' : changeType === 'negative' ? 'text-destructive' : 'text-muted-foreground'

  return (
    <Card className={`border-border/50 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-foreground">{value}</span>
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </div>
            {change && <p className={`text-xs mt-2 ${changeColor}`}>{change}</p>}
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default MetricCard

import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

interface StatusMessage {
  id: string; type: 'success' | 'error' | 'info' | 'warning'
  title: string; message: string; timestamp: number
}

const StatusToast = ({ message, onClose }: { message: StatusMessage; onClose: (id: string) => void }) => {
  const styles = {
    success: 'bg-card border-sidebar-border text-card-foreground',
    error: 'bg-destructive/10 border-destructive/20 text-destructive',
    warning: 'bg-chart-4/10 border-chart-4/20 text-chart-4',
    info: 'bg-sidebar-accent border-sidebar-border text-sidebar-accent-foreground'
  }

  const icons = {
    success: <CheckCircle className="h-4 w-4" />,
    error: <XCircle className="h-4 w-4" />,
    warning: <AlertCircle className="h-4 w-4" />,
    info: <Info className="h-4 w-4" />
  }

  return (
    <div className={`rounded-lg border p-4 mb-3 shadow-sm ${styles[message.type]} animate-in slide-in-from-right-5 duration-200`}>
      <div className="flex items-start gap-3">
        {icons[message.type]}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{message.title}</div>
          <div className="text-sm opacity-80 mt-1">{message.message}</div>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-60 hover:opacity-100" onClick={() => onClose(message.id)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

export default StatusToast

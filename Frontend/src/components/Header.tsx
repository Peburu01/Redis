import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Sun, Moon } from 'lucide-react'

const Header = ({ isDark, onToggleTheme, isCollapsed, currentDb }: {
  isDark: boolean; onToggleTheme: () => void; isCollapsed: boolean; currentDb: number
}) => (
  <header className={`bg-background border-b border-border ${isCollapsed ? 'ml-16' : 'ml-64'} transition-all duration-200 sticky top-0 z-20`}>
    <div className="flex items-center justify-between px-6 py-4">
      <div></div>
      <div className="flex items-center gap-4">
        <Badge variant="secondary" className="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
          Database {currentDb}
        </Badge>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 rounded-md">
          <Sun className="h-4 w-4 text-muted-foreground" />
          <Switch checked={isDark} onCheckedChange={onToggleTheme} className="data-[state=checked]:bg-sidebar-primary" />
          <Moon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  </header>
)

export default Header

import { Moon, Sun, type LucideIcon } from 'lucide-react';
import { Theme, useTheme } from '@/lib/theme-context';

const options: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: Theme.light, label: 'Light', icon: Sun },
  { value: Theme.dark, label: 'Dark', icon: Moon },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Appearance"
      className="flex items-center gap-0.5 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-0.5"
    >
      {options.map(({ value, label, icon: Icon }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={isActive}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={`flex size-6 items-center justify-center rounded-md transition-colors ${
              isActive
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
            }`}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}

export default ThemeToggle;

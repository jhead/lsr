import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    if (theme === 'system') {
      return <Monitor className="w-5 h-5" />;
    } else if (theme === 'dark') {
      return <Moon className="w-5 h-5" />;
    } else {
      return <Sun className="w-5 h-5" />;
    }
  };

  return (
    <button
      onClick={cycleTheme}
      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
      aria-label={`Current theme: ${theme}. Click to change theme.`}
      title={`Theme: ${theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'}`}
    >
      {getIcon()}
    </button>
  );
}

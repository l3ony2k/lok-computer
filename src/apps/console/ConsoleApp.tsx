import React, { useState, useEffect, useRef, ComponentType } from 'react';
import { useWindowManager } from '@/hooks/useWindowManager';
import { useTheme } from 'next-themes';
import { APP_LIST } from '@/config/apps';
import { WindowLayout } from '@/components/window/WindowLayout';

interface LogEntry {
  id: number;
  timestamp: string;
  message: any[];
  type: 'log' | 'error' | 'warn' | 'info';
  expanded?: boolean;
}

interface Command {
  name: string;
  description: string;
  action: (args?: string[]) => void;
}

interface LogItemProps {
  log: LogEntry;
  getLogColor: (type: LogEntry['type']) => string;
  formatMessage: (msgParts: any[]) => string;
}

// Highlight log prefixes with different colors
const highlightPrefix = (text: string): React.ReactNode => {
  // Match prefixes like [Cache], [API:X], [App:X], [Session], [Registry]
  const prefixMatch = text.match(/^(\[[^\]]+\])\s*/);
  if (!prefixMatch) return text;

  const prefix = prefixMatch[1];
  const rest = text.slice(prefixMatch[0].length);

  // Determine prefix color based on category
  let prefixClass = 'text-neutral-400';
  if (prefix.startsWith('[Cache]')) {
    prefixClass = 'text-green-400';
  } else if (prefix.startsWith('[API:')) {
    prefixClass = 'text-cyan-400';
  } else if (prefix.startsWith('[App:')) {
    prefixClass = 'text-yellow-400';
  } else if (prefix.startsWith('[Session]')) {
    prefixClass = 'text-purple-400';
  } else if (prefix.startsWith('[Registry]')) {
    prefixClass = 'text-pink-400';
  }

  return (
    <>
      <span className={prefixClass}>{prefix}</span>
      {' '}{rest}
    </>
  );
};

const LogItem: React.FC<LogItemProps> = ({ log, getLogColor, formatMessage }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayMessage = formatMessage(log.message);
  const lines = displayMessage.split('\n');
  const isLong = lines.length > 10;

  const content = isLong && !isExpanded
    ? lines.slice(0, 10).join('\n') + '\n...'
    : displayMessage;

  // Highlight the first line's prefix
  const firstNewline = content.indexOf('\n');
  const firstLine = firstNewline >= 0 ? content.slice(0, firstNewline) : content;
  const restLines = firstNewline >= 0 ? content.slice(firstNewline) : '';

  return (
    <div className={`mb-1 ${getLogColor(log.type)}`}>
      <div className="flex items-start">
        <span className="text-neutral-600 mr-2 select-none text-xs shrink-0">[{log.timestamp}]</span>
        <div className="flex-1 overflow-hidden min-w-0">
          <span className="break-all whitespace-pre-wrap">
            {highlightPrefix(firstLine)}{restLines}
          </span>
          {isLong && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="block text-xs text-neutral-500 hover:text-neutral-300 mt-1 focus:outline-none underline decoration-dotted"
            >
              {isExpanded ? 'Show less' : `Show ${lines.length - 10} more lines...`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const ConsoleApp: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState(0);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { windows, addWindow, addOrFocusWindow, closeWindow } = useWindowManager();
  const { theme, setTheme } = useTheme();

  // Add auto-focus effect
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Scroll to bottom when logs change
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [logs]);

  const commands: Record<string, Command> = {
    help: {
      name: 'help',
      description: 'Show available commands',
      action: () => {
        console.info('Available commands:',
          Object.entries(commands)
            .map(([name, cmd]) => `\n${name}${cmd.name === 'apps' ? ' [list|open|close] [app]' : cmd.name === 'theme' ? ' [get|set|toggle] [theme]' : ''}: ${cmd.description}`)
            .join('')
        );
      }
    },
    clear: {
      name: 'clear',
      description: 'Clear console output',
      action: () => setLogs([])
    },
    apps: {
      name: 'apps',
      description: 'Manage applications (list, open, close)',
      action: (args?: string[]) => {
        const subCommand = args?.[0]?.toLowerCase();
        const appName = args?.slice(1).join(' ');

        switch (subCommand) {
          case 'list':
            console.info('Available apps:', APP_LIST.map(app => `\n- ${app.name}`).join(''));
            break;
          case 'open':
            if (!appName) {
              console.error('Usage: apps open <app name>');
              return;
            }
            const appToOpen = APP_LIST.find(app => app.name.toLowerCase() === appName.toLowerCase());
            if (appToOpen) {
              if (appToOpen.singleInstance) {
                addOrFocusWindow({
                  title: appToOpen.name,
                  content: React.createElement(appToOpen.component as ComponentType),
                  iconType: appToOpen.iconType,
                  width: appToOpen.defaultWidth || 600,
                  height: appToOpen.defaultHeight || 400,
                  minWidth: 300,
                  minHeight: 200,
                  singleInstance: true
                });
              } else {
                addWindow({
                  title: appToOpen.name,
                  content: React.createElement(appToOpen.component as ComponentType),
                  iconType: appToOpen.iconType,
                  width: appToOpen.defaultWidth || 600,
                  height: appToOpen.defaultHeight || 400,
                  minWidth: 300,
                  minHeight: 200
                });
              }
              console.info(`Opened ${appToOpen.name}`);
            } else {
              console.error(`App "${appName}" not found`);
            }
            break;
          case 'close':
            if (!appName) {
              console.error('Usage: apps close <app name>');
              return;
            }
            const windowToClose = windows.find(w => w.title.toLowerCase() === appName.toLowerCase());
            if (windowToClose) {
              closeWindow(windowToClose.id);
              console.info(`Closed ${windowToClose.title}`);
            } else {
              console.error(`No open window found for "${appName}"`);
            }
            break;
          default:
            console.error('Usage: apps [list|open|close] [app]');
        }
      }
    },
    theme: {
      name: 'theme',
      description: 'Manage theme (get, set, toggle)',
      action: (args?: string[]) => {
        const subCommand = args?.[0]?.toLowerCase();
        const themeArg = args?.[1]?.toLowerCase();

        switch (subCommand) {
          case 'get':
            console.info('Current theme:', theme);
            break;
          case 'set':
            if (!themeArg || !['light', 'dark', 'system'].includes(themeArg)) {
              console.error('Usage: theme set [light|dark|system]');
              return;
            }
            setTheme(themeArg);
            console.info(`Theme set to: ${themeArg}`);
            break;
          case 'toggle':
            const newTheme = theme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
            console.info(`Theme toggled to: ${newTheme}`);
            break;
          default:
            console.error('Usage: theme [get|set|toggle] [theme]');
        }
      }
    },
    status: {
      name: 'status',
      description: 'Show system status',
      action: () => {
        console.info('System Status:', {
          time: new Date().toLocaleString(),
          theme: theme,
          openWindows: windows.length,
          apps: APP_LIST.length,
          windowTitles: windows.map(w => w.title)
        });
      }
    },
    'rm -rf /': {
      name: 'rm -rf /',
      description: 'Do not run this command',
      action: () => simulateSystemDeletion()
    }
  };

  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleInfo = console.info;

    const captureLog = (type: LogEntry['type'], ...args: any[]) => {
      setLogs(prevLogs => [
        ...prevLogs,
        {
          id: Date.now() + Math.random(),
          timestamp: new Date().toLocaleTimeString(),
          message: args,
          type: type,
          expanded: false
        },
      ]);
      originalConsoleLog.apply(console, [`[Captured for App Console - ${type}]`, ...args]);
    };

    console.log = (...args) => captureLog('log', ...args);
    console.error = (...args) => captureLog('error', ...args);
    console.warn = (...args) => captureLog('warn', ...args);
    console.info = (...args) => captureLog('info', ...args);

    // Initial welcome message
    console.info('Welcome to lok.computer Console!');
    console.info('Type "help" to see available commands');

    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      console.info = originalConsoleInfo;
    };
  }, []);

  const formatMessage = (msgParts: any[]) => {
    return msgParts.map(part => {
      if (typeof part === 'object') {
        try {
          return JSON.stringify(part, null, 2);
        } catch (e) {
          return '[Unserializable Object]';
        }
      }
      return String(part);
    }).join(' ');
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-500';
      case 'warn':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-400';
      default:
        return 'text-neutral-300';
    }
  };

  const simulateSystemDeletion = () => {
    setIsDeleting(true);
    setDeletionProgress(0);

    const criticalPaths = [
      '/system32',
      '/usr/bin',
      '/boot',
      '/etc',
      '/var/log',
      '/home/guest',
      '/dev',
      '/proc',
      '/lok.computer',
      '/desktop',
      '/apps',
      '/images',
      '/videos',
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i >= criticalPaths.length) {
        clearInterval(interval);
        console.error('SYSTEM CRITICAL FAILURE. REBOOTING...');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return;
      }
      console.log(`Deleting ${criticalPaths[i]}...`);
      setDeletionProgress(Math.round(((i + 1) / criticalPaths.length) * 100));
      i++;
    }, 500);
  };

  const handleCommand = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const trimmedCommand = command.trim();
      if (!trimmedCommand) return;

      console.log(`> ${trimmedCommand}`);
      setCommandHistory(prev => [...prev, trimmedCommand]);
      setHistoryIndex(-1);
      setCommand('');

      const [cmdName, ...args] = trimmedCommand.split(' ');
      const cmd = commands[cmdName.toLowerCase()] || commands[trimmedCommand.toLowerCase()]; // Check for full command string too (like "rm -rf /")

      if (cmd) {
        try {
          cmd.action(args);
        } catch (err: any) {
          console.error(`Error executing command: ${err.message}`);
        }
      } else {
        console.error(`Command not found: ${cmdName}`);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCommand('');
        } else {
          setHistoryIndex(newIndex);
          setCommand(commandHistory[newIndex]);
        }
      }
    }
  };

  return (
    <WindowLayout
      hasPadding={false}
      className="bg-black font-mono text-sm"
      footer={
        <div className="p-1 border-t border-border flex items-center bg-black">
          <span className="text-neutral-500 mr-1">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleCommand}
            placeholder="Type 'help' for available commands"
            className="bg-transparent flex-1 focus:outline-none text-neutral-300 placeholder-neutral-600"
            disabled={isDeleting}
            autoFocus
          />
        </div>
      }
    >
      <div className="p-2 min-h-full">
        {logs.map((log) => (
          <LogItem key={log.id} log={log} getLogColor={getLogColor} formatMessage={formatMessage} />
        ))}
        <div ref={consoleEndRef} />
      </div>
    </WindowLayout>
  );
};

export default ConsoleApp;
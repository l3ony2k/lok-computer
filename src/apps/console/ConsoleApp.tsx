import React, { useState, useEffect, useRef } from 'react';
import { useWindowActions, useWindowState } from '@/hooks/useWindowManager';
import { useApplicationLauncher } from '@/hooks/useApplicationLauncher';
import { useTheme } from 'next-themes';
import { APP_LIST } from '@/config/apps';
import { WindowLayout } from '@/components/window/WindowLayout';
import { rebootIntoKernelPanic, rebootSystem, requestSystemUpdateCheck, SYSTEM_VERSION } from '@/lib/system';

interface LogEntry {
  id: number;
  timestamp: string;
  message: unknown[];
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
  formatMessage: (msgParts: unknown[]) => string;
}

// Highlight log prefixes with different colors
const highlightPrefix = (text: string): React.ReactNode => {
  // Match prefixes like [Cache], [API:X], [App:X], [Session], [Registry]
  const prefixMatch = text.match(/^(\[[^\]]+\])\s*/);
  if (!prefixMatch) return text;

  const prefix = prefixMatch[1];
  const rest = text.slice(prefixMatch[0].length);

  // Determine prefix color based on category
  let prefixClass = 'console-prefix-default';
  if (prefix.startsWith('[Cache]')) {
    prefixClass = 'console-prefix-cache';
  } else if (prefix.startsWith('[API:')) {
    prefixClass = 'console-prefix-api';
  } else if (prefix.startsWith('[App:')) {
    prefixClass = 'console-prefix-app';
  } else if (prefix.startsWith('[Session]')) {
    prefixClass = 'console-prefix-session';
  } else if (prefix.startsWith('[Registry]')) {
    prefixClass = 'console-prefix-registry';
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
        <span className="console-timestamp mr-2 select-none text-xs shrink-0">[{log.timestamp}]</span>
        <div className="flex-1 overflow-hidden min-w-0">
          <span className="break-all whitespace-pre-wrap">
            {highlightPrefix(firstLine)}{restLines}
          </span>
          {isLong && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="console-expand block text-xs mt-1 focus:outline-none underline decoration-dotted"
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
  const { windows } = useWindowState();
  const { closeWindow } = useWindowActions();
  const openApplication = useApplicationLauncher();
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
          case 'open': {
            if (!appName) {
              console.error('Usage: apps open <app name>');
              return;
            }
            const appToOpen = APP_LIST.find(app => app.name.toLowerCase() === appName.toLowerCase());
            if (appToOpen) {
              openApplication(appToOpen.componentType);
              console.info(`Opened ${appToOpen.name}`);
            } else {
              console.error(`App "${appName}" not found`);
            }
            break;
          }
          case 'close': {
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
          }
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
          case 'toggle': {
            const newTheme = theme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
            console.info(`Theme toggled to: ${newTheme}`);
            break;
          }
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
    version: {
      name: 'version',
      description: 'Show the running system version',
      action: () => console.info(`lok.computer v${SYSTEM_VERSION}`)
    },
    update: {
      name: 'update',
      description: 'Check for a system update',
      action: () => requestSystemUpdateCheck()
    },
    reboot: {
      name: 'reboot',
      description: 'Hard reload and boot the system again',
      action: () => void rebootSystem('console reboot command')
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

    const captureLog = (type: LogEntry['type'], ...args: unknown[]) => {
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

  const formatMessage = (msgParts: unknown[]) => {
    return msgParts.map(part => {
      if (typeof part === 'object') {
        try {
          return JSON.stringify(part, null, 2);
        } catch {
          return '[Unserializable Object]';
        }
      }
      return String(part);
    }).join(' ');
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error':
        return 'console-log-error';
      case 'warn':
        return 'console-log-warn';
      case 'info':
        return 'console-log-info';
      default:
        return 'console-log-default';
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
        console.error('INIT PROCESS LOST. ROOT FILESYSTEM UNAVAILABLE.');
        setTimeout(() => {
          void rebootIntoKernelPanic();
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
      const isDangerousRemove = /^(sudo\s+)?rm\s+-(?=[a-z]*r)(?=[a-z]*f)[a-z]+\s+(--no-preserve-root\s+)?\/(\*)?$/i.test(trimmedCommand);
      const cmd = isDangerousRemove
        ? commands['rm -rf /']
        : commands[cmdName.toLowerCase()] || commands[trimmedCommand.toLowerCase()];

      if (cmd) {
        try {
          cmd.action(args);
        } catch (err) {
          console.error(`Error executing command: ${err instanceof Error ? err.message : String(err)}`);
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
      className="console-layout font-mono text-sm"
      footer={
        <div className="app-footer-row console-command-row justify-start">
          <span className="console-command-prompt mr-1">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleCommand}
            placeholder="Type 'help' for available commands"
            className="console-command-input bg-transparent flex-1 focus:outline-none"
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

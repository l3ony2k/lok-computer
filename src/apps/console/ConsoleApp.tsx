import React, { useState, useEffect, useRef, ComponentType } from 'react';
import { useWindowManager } from '@/hooks/useWindowManager';
import { useTheme } from 'next-themes';
import { APP_LIST } from '@/config/apps';

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

export const ConsoleApp: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState(0);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { windows, addWindow, closeWindow } = useWindowManager();
  const { theme, setTheme } = useTheme();

  // Add auto-focus effect
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

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
              addWindow({
                title: appToOpen.name,
                content: React.createElement(appToOpen.component as ComponentType),
                iconType: appToOpen.iconType,
                width: appToOpen.defaultWidth || 600,
                height: appToOpen.defaultHeight || 400,
                minWidth: 300,
                minHeight: 200
              });
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

  useEffect(() => {
    if (consoleEndRef.current) {
      const scrollContainer = consoleEndRef.current.parentElement;
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [logs]);

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
      '/music',
      '/documents',
      '/downloads',
      '/important-files',
      '/definitely-not-memes',
      '/crypto-wallets',
      '/homework-folder',
      '/secret-stuff'
    ];

    let progress = 0;
    const totalSteps = criticalPaths.length;
    const interval = setInterval(() => {
      if (progress < totalSteps) {
        console.error(`Deleting ${criticalPaths[progress]}...`);
        progress++;
        setDeletionProgress(progress);
      } else {
        clearInterval(interval);
        // Show fatal error for 5 seconds
        console.error('FATAL ERROR: Kernel not found');
        console.error('FATAL ERROR: System files corrupted');
        console.error('FATAL ERROR: Who am i?');
        console.error('FATAL ERROR: Who are you?');
        console.error('FATAL ERROR: I am not a computer');
        console.error('FATAL ERROR: I am a human');
        console.error('FATAL ERROR: I am a human');
        console.error('FATAL ERROR: I am a human');
        // Disable all pointer events during the freeze
        document.documentElement.style.pointerEvents = 'none';
        
        setTimeout(() => {
          // Black out the screen
          document.documentElement.style.filter = 'brightness(0)';
          
          setTimeout(() => {
            // Re-enable pointer events and restore screen
            document.documentElement.style.pointerEvents = '';
            document.documentElement.style.filter = '';
            setIsDeleting(false);
            setDeletionProgress(0);
            console.info('jk! 😅');
            console.info('be careful with dangerous commands tho!');
          }, 5000);
        }, 5000); // Wait 5 seconds before blackout
      }
    }, 200);
  };

  const handleCommand = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && command.trim()) {
      const fullCommand = command.trim();

      // Check for dangerous commands
      const dangerousCommands = [
        'rm',
        'rm -rf',
        'rm -r',
        'rmdir /s',
        'format',
        'del',
        'del /f',
        'deltree',
      ];

      if (dangerousCommands.some(cmd => fullCommand.toLowerCase().startsWith(cmd))) {
        simulateSystemDeletion();
        setCommand('');
        return;
      }

      const [cmdName, ...args] = fullCommand.split(' ');
      const cmd = commands[cmdName.toLowerCase()];

      // Add command to history
      setCommandHistory(prev => [...prev, fullCommand]);
      setHistoryIndex(-1);

      if (cmd) {
        cmd.action(args);
      } else {
        console.error(`Unknown command: ${cmdName}`);
      }
      setCommand('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex + 1;
        if (newIndex < commandHistory.length) {
          setHistoryIndex(newIndex);
          setCommand(commandHistory[commandHistory.length - 1 - newIndex]);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > -1) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        if (newIndex >= 0) {
          setCommand(commandHistory[commandHistory.length - 1 - newIndex]);
        } else {
          setCommand('');
        }
      }
    }
  };

  const toggleExpand = (id: number) => {
    setLogs(prevLogs =>
      prevLogs.map(log =>
        log.id === id ? { ...log, expanded: !log.expanded } : log
      )
    );
  };

  const shouldCollapse = (message: string) => {
    const lines = message.split('\n');
    return lines.length > 10;
  };

  return (
    <div className="h-full flex flex-col bg-neutral-900 text-neutral-300 font-mono text-xs select-text">
      <div className="p-1 border-b border-neutral-700 text-neutral-400 select-none">
        root@lok.computer 
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-1">
        {logs.map(log => {
          const message = formatMessage(log.message);
          const isCollapsible = shouldCollapse(message);
          const displayMessage = !log.expanded && isCollapsible
            ? message.split('\n').slice(0, 10).join('\n') + '\n...'
            : message;

          return (
            <div key={log.id} className={`flex items-start ${getLogColor(log.type)}`}>
              <span className="text-neutral-500 mr-2 select-none">{log.timestamp}</span>
              <div className="flex-1">
                <div className="flex items-start">
                  {isCollapsible && (
                    <button
                      onClick={() => toggleExpand(log.id)}
                      className="mr-1 text-neutral-500 hover:text-neutral-300 focus:outline-none"
                    >
                      {log.expanded ? '▼' : '▶'}
                    </button>
                  )}
                  <span className="break-all whitespace-pre-wrap">{displayMessage}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={consoleEndRef} />
      </div>
      <div className="p-1 border-t border-neutral-700 flex items-center">
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
        />
      </div>
    </div>
  );
};

export default ConsoleApp; 
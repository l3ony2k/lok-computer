import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { CustomIcon } from '@/components/window/CustomIcon';
import { useApplicationLauncher } from '@/hooks/useApplicationLauncher';
import { APP_LIST } from '@/config/apps';
import { APP_CONFIG } from '@/config/constants';
import { getUserChannels } from '@/lib/api';
import { rankFuzzy } from '@/lib/fuzzyMatch';
import { LAUNCHER_OPEN_EVENT, isLauncherShortcut, launcherShortcutLabel } from '@/lib/launcher';
import { useRecentApps } from '@/lib/recentApps';
import { scrollIntoViewWithin } from '@/lib/utils';
import { rebootSystem, requestSystemUpdateCheck } from '@/lib/system';
import type { ArenaChannel } from '@/types/arena';

type LauncherGroup = 'Recent' | 'Applications' | 'Channels' | 'System';

interface LauncherItem {
  id: string;
  label: string;
  group: LauncherGroup;
  icon?: string;
  hint?: string;
  run: () => void;
}

const RESULT_LIMIT = 14;
const RECENT_LIMIT = 5;
const GROUP_ORDER: LauncherGroup[] = ['Recent', 'Applications', 'Channels', 'System'];

/**
 * Spotlight-style launcher: Cmd/Ctrl+K or the search button beside the clock.
 * Searches applications, lok's Are.na channels (as folders), and a few system
 * commands; Enter opens the highlighted result.
 */
export const KeyboardLauncher: React.FC = () => {
  const openApplication = useApplicationLauncher();
  const recent = useRecentApps();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [channels, setChannels] = useState<ArenaChannel[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const open = () => {
      setQuery('');
      setActiveIndex(0);
      setIsOpen(true);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isLauncherShortcut(event)) return;
      event.preventDefault();
      setIsOpen((current) => {
        if (current) return false;
        setQuery('');
        setActiveIndex(0);
        return true;
      });
    };
    window.addEventListener(LAUNCHER_OPEN_EVENT, open);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener(LAUNCHER_OPEN_EVENT, open);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  // Channels come from the list the boot screen already cached.
  useEffect(() => {
    if (!isOpen || channels.length) return;
    let cancelled = false;
    getUserChannels()
      .then((list) => {
        if (!cancelled) setChannels(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isOpen, channels.length]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus({ preventScroll: true });
  }, [isOpen]);

  const catalogue = useMemo<LauncherItem[]>(() => {
    const apps: LauncherItem[] = APP_LIST.map((app) => ({
      id: `app:${app.componentType}`,
      label: app.name,
      group: 'Applications',
      icon: app.iconType,
      run: () => openApplication(app.componentType),
    }));
    const folders: LauncherItem[] = channels.map((channel) => ({
      id: `channel:${channel.slug}`,
      label: channel.title,
      group: 'Channels',
      icon: 'folder',
      hint: typeof channel.counts?.blocks === 'number' ? `${channel.counts.blocks} blocks` : undefined,
      run: () => openApplication('ChannelExplorer', {
        title: channel.title,
        iconType: 'folder',
        props: { channelSlug: channel.slug, username: APP_CONFIG.ARENA_USERNAME },
      }),
    }));
    const system: LauncherItem[] = [
      { id: 'system:update', label: 'Check for updates', group: 'System', run: requestSystemUpdateCheck },
      { id: 'system:restart', label: 'Restart', group: 'System', run: () => void rebootSystem('restart from the launcher') },
    ];
    return [...apps, ...folders, ...system];
  }, [channels, openApplication]);

  const results = useMemo<LauncherItem[]>(() => {
    if (!query.trim()) {
      const recentItems: LauncherItem[] = recent.slice(0, RECENT_LIMIT).map((entry) => ({
        id: `recent:${entry.componentType}:${JSON.stringify(entry.props ?? {})}`,
        label: entry.title,
        group: 'Recent',
        icon: entry.iconType,
        run: () => openApplication(entry.componentType, { title: entry.title, iconType: entry.iconType, props: entry.props }),
      }));
      return [...recentItems, ...catalogue.filter((item) => item.group === 'Applications')];
    }
    return rankFuzzy(query, catalogue, (item) => item.label).slice(0, RESULT_LIMIT).map((entry) => entry.item);
  }, [catalogue, openApplication, query, recent]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    scrollIntoViewWithin(active, { block: 'nearest' });
  }, [activeIndex, results]);

  const run = (item: LauncherItem) => {
    close();
    item.run();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (results.length ? (index + 1) % results.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (results.length ? (index - 1 + results.length) % results.length : 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = results[activeIndex];
      if (item) run(item);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };

  if (!isOpen) return null;

  // Group headings in the catalogue order; a search result list is flat.
  const searching = Boolean(query.trim());
  const grouped = searching ? null : GROUP_ORDER.filter((group) => results.some((item) => item.group === group));

  const renderItem = (item: LauncherItem) => {
    const index = results.indexOf(item);
    return (
      <button
        key={item.id}
        type="button"
        role="option"
        aria-selected={index === activeIndex}
        data-index={index}
        data-active={index === activeIndex || undefined}
        className="launcher-item menu-item-button flex items-center select-none"
        onMouseMove={() => setActiveIndex(index)}
        onClick={() => run(item)}
      >
        <span className="launcher-item-icon flex items-center justify-center" aria-hidden="true">
          {item.icon ? <CustomIcon iconType={item.icon} className="w-4 h-4" /> : <Search className="w-3.5 h-3.5" />}
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {searching && <span className="launcher-item-group">{item.group}</span>}
        {!searching && item.hint && <span className="launcher-item-group">{item.hint}</span>}
      </button>
    );
  };

  return createPortal(
    <div
      className="launcher-scrim fixed inset-0 z-[10001]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="launcher-panel menu-surface" role="dialog" aria-label="Search" onKeyDown={onKeyDown}>
        <div className="launcher-field flex items-center">
          <Search className="launcher-field-icon w-4 h-4" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="launcher-input"
            placeholder="Search apps and channels"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            aria-autocomplete="list"
            aria-controls="launcher-results"
          />
          <kbd className="launcher-shortcut">{launcherShortcutLabel()}</kbd>
        </div>
        <div ref={listRef} id="launcher-results" className="launcher-results scrollable-area" role="listbox">
          {results.length === 0 && <div className="launcher-empty">Nothing matches “{query}”</div>}
          {grouped
            ? grouped.map((group) => (
                <div key={group} className="launcher-group">
                  <div className="launcher-group-title" aria-hidden="true">{group}</div>
                  {results.filter((item) => item.group === group).map(renderItem)}
                </div>
              ))
            : results.map(renderItem)}
        </div>
      </div>
    </div>,
    document.body,
  );
};

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bold, Download, Eraser, Eye, Heading1, Heading2, Italic, List, ListOrdered, Plus, Strikethrough, Trash2, Underline } from 'lucide-react';
import { toast } from 'sonner';
import { WindowLayout } from '@/components/window/WindowLayout';
import { RetroButton } from '@/components/ui/RetroButton';
import { usePersistedState } from '@/hooks/useStorage';
import { renderMarkdown } from './markdown';
import { htmlToText, sanitizeHtml, textToHtml } from './richText';
import './notepad.css';

export interface NotepadAppProps {
  onPropsChange?: (props: Record<string, unknown>) => void;
}

export type NoteFormat = 'text' | 'markdown' | 'rich';

export interface NoteEntry {
  id: string;
  title: string;
  /** Plain text, Markdown source, or sanitised HTML, by `format`. */
  body: string;
  format: NoteFormat;
  createdAt: number;
  updatedAt: number;
}

interface NotepadState {
  entries: NoteEntry[];
  activeId: string | null;
}

const STORAGE_KEY = 'app:notepad';
const FORMATS: ReadonlyArray<{ id: NoteFormat; label: string; title: string }> = [
  { id: 'text', label: 'Text', title: 'Plain text' },
  { id: 'markdown', label: 'Markdown', title: 'Markdown with a preview' },
  { id: 'rich', label: 'Rich', title: 'Basic rich text' },
];

const isFormat = (value: unknown): value is NoteFormat => FORMATS.some((format) => format.id === value);

const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeState = (stored: unknown): NotepadState => {
  if (!stored || typeof stored !== 'object') return { entries: [], activeId: null };
  const candidate = stored as Partial<NotepadState>;
  const entries: NoteEntry[] = [];
  for (const entry of Array.isArray(candidate.entries) ? candidate.entries : []) {
    if (!entry || typeof entry !== 'object') continue;
    const { id, title, body, format, createdAt, updatedAt } = entry as Partial<NoteEntry>;
    if (typeof id !== 'string') continue;
    entries.push({
      id,
      title: typeof title === 'string' ? title : '',
      body: typeof body === 'string' ? body : '',
      format: isFormat(format) ? format : 'text',
      createdAt: typeof createdAt === 'number' ? createdAt : 0,
      updatedAt: typeof updatedAt === 'number' ? updatedAt : 0,
    });
  }
  const activeId = typeof candidate.activeId === 'string' && entries.some((entry) => entry.id === candidate.activeId)
    ? candidate.activeId
    : entries[0]?.id ?? null;
  return { entries, activeId };
};

const plainText = (entry: NoteEntry) => (entry.format === 'rich' ? htmlToText(entry.body) : entry.body);

/** The sidebar label: the title, else the first line of the note. */
const entryLabel = (entry: NoteEntry) => {
  const title = entry.title.trim();
  if (title) return title;
  const firstLine = plainText(entry).split('\n').map((line) => line.trim()).find(Boolean);
  return firstLine ? firstLine.slice(0, 60) : 'Untitled';
};

const formatDate = (timestamp: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : date.toLocaleDateString([], { day: 'numeric', month: 'short' });
};

const fileName = (entry: NoteEntry) => {
  const base = entryLabel(entry).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'note';
  const extension = entry.format === 'markdown' ? 'md' : entry.format === 'rich' ? 'html' : 'txt';
  return `${base}.${extension}`;
};

/**
 * Notes that live in this browser: plain text, Markdown with a preview, or
 * basic rich text. Everything is saved as you type (IndexedDB), and a note
 * can be downloaded as a file.
 */
export const NotepadApp: React.FC<NotepadAppProps> = () => {
  const [state, setState, loading] = usePersistedState<NotepadState>({
    key: STORAGE_KEY,
    defaultValue: { entries: [], activeId: null },
    normalize: normalizeState,
    debounceMs: 300,
  });
  const [preview, setPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const richRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const entries = useMemo(() => [...state.entries].sort((a, b) => b.updatedAt - a.updatedAt), [state.entries]);
  const active = state.entries.find((entry) => entry.id === state.activeId) ?? null;

  const updateActive = useCallback((patch: Partial<NoteEntry>) => {
    setState((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) => (entry.id === prev.activeId ? { ...entry, ...patch, updatedAt: Date.now() } : entry)),
    }));
  }, [setState]);

  const createNote = useCallback(() => {
    const entry: NoteEntry = { id: createId(), title: '', body: '', format: 'text', createdAt: Date.now(), updatedAt: Date.now() };
    setState((prev) => ({ entries: [entry, ...prev.entries], activeId: entry.id }));
    setPreview(false);
    setTimeout(() => titleRef.current?.focus({ preventScroll: true }), 0);
  }, [setState]);

  const deleteActive = () => {
    if (!active) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setConfirmDelete(false);
    setState((prev) => {
      const remaining = prev.entries.filter((entry) => entry.id !== prev.activeId);
      const next = [...remaining].sort((a, b) => b.updatedAt - a.updatedAt)[0];
      return { entries: remaining, activeId: next?.id ?? null };
    });
  };

  // The rich editor is uncontrolled: its HTML is set when a note (or its format) is opened, never on each keystroke.
  const activeId = active?.id;
  const activeFormat = active?.format;
  useEffect(() => {
    const editor = richRef.current;
    if (!editor || activeFormat !== 'rich') return;
    const current = state.entries.find((entry) => entry.id === activeId);
    editor.innerHTML = sanitizeHtml(current?.body ?? '');
    // The body is read from the entry only when the note changes; later keystrokes come through onInput.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, activeFormat]);

  const changeFormat = (format: NoteFormat) => {
    if (!active || active.format === format) return;
    let body = active.body;
    if (active.format === 'rich') body = htmlToText(active.body);
    else if (format === 'rich') body = active.format === 'markdown' ? renderMarkdown(active.body) : textToHtml(active.body);
    updateActive({ format, body });
    setPreview(false);
  };

  const command = (name: string, value?: string) => {
    const editor = richRef.current;
    if (!editor) return;
    editor.focus({ preventScroll: true });
    document.execCommand(name, false, value);
    updateActive({ body: sanitizeHtml(editor.innerHTML) });
  };

  const download = () => {
    if (!active) return;
    const content = active.format === 'rich'
      ? `<!doctype html>\n<meta charset="utf-8">\n<title>${entryLabel(active).replace(/</g, '&lt;')}</title>\n${active.body}`
      : active.body;
    const type = active.format === 'rich' ? 'text/html' : active.format === 'markdown' ? 'text/markdown' : 'text/plain';
    const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName(active);
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    const key = event.key.toLowerCase();
    if (key === 's') {
      event.preventDefault();
      toast('Saved', { description: 'Notes save themselves as you type.' });
    } else if (key === 'n') {
      event.preventDefault();
      createNote();
    }
  };

  const text = active ? plainText(active) : '';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <WindowLayout
      className="notepad-window"
      hasPadding={false}
      isScrollable={false}
      toolbar={active ? (
        <div className="app-toolbar-row notepad-toolbar">
          <input
            ref={titleRef}
            type="text"
            className="search-input notepad-title"
            placeholder="Untitled"
            value={active.title}
            onChange={(event) => updateActive({ title: event.target.value })}
            aria-label="Note title"
          />
          <div className="app-joined-control notepad-formats" role="radiogroup" aria-label="Format">
            {FORMATS.map((format) => (
              <RetroButton
                key={format.id}
                size="sm"
                role="radio"
                aria-checked={active.format === format.id}
                active={active.format === format.id}
                title={format.title}
                onClick={() => changeFormat(format.id)}
              >
                {format.label}
              </RetroButton>
            ))}
          </div>
          {active.format === 'markdown' && (
            <RetroButton size="sm" active={preview} onClick={() => setPreview((open) => !open)} title="Preview the rendered Markdown">
              <Eye className="w-3.5 h-3.5" /> Preview
            </RetroButton>
          )}
          <RetroButton size="sm" onClick={download} title={`Download as ${fileName(active)}`}>
            <Download className="w-3.5 h-3.5" />
          </RetroButton>
          <RetroButton
            size="sm"
            onClick={deleteActive}
            onBlur={() => setTimeout(() => setConfirmDelete(false), 150)}
            title="Delete this note"
            aria-label={confirmDelete ? 'Confirm delete' : 'Delete note'}
          >
            <Trash2 className="w-3.5 h-3.5" />{confirmDelete && <span> Confirm</span>}
          </RetroButton>
        </div>
      ) : undefined}
      footer={
        <div className="app-footer-row notepad-footer">
          <span>{active ? `${words} ${words === 1 ? 'word' : 'words'} · ${text.length} characters` : `${state.entries.length} ${state.entries.length === 1 ? 'note' : 'notes'}`}</span>
          <span className="notepad-footer-right">{active?.updatedAt ? `Saved ${formatDate(active.updatedAt)}` : 'Saved in this browser'}</span>
        </div>
      }
    >
      <div className="notepad-layout" onKeyDown={handleKeyDown}>
        <nav className="notepad-sidebar" aria-label="Notes">
          <RetroButton size="sm" className="notepad-new" onClick={createNote} title="New note (Ctrl+N)">
            <Plus className="w-3.5 h-3.5" /> New note
          </RetroButton>
          <div className="notepad-list scrollable-area" role="listbox" aria-label="Saved notes">
            {entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="option"
                aria-selected={entry.id === state.activeId}
                data-active={entry.id === state.activeId || undefined}
                className="notepad-list-item"
                onClick={() => {
                  setState((prev) => ({ ...prev, activeId: entry.id }));
                  setPreview(false);
                }}
              >
                <span className="notepad-list-title">{entryLabel(entry)}</span>
                <span className="notepad-list-meta">{formatDate(entry.updatedAt)} · {entry.format}</span>
              </button>
            ))}
            {!loading && entries.length === 0 && <p className="notepad-empty-list">No notes yet.</p>}
          </div>
        </nav>

        <div className="notepad-editor-pane">
          {!active && (
            <div className="notepad-empty">
              <strong>No note open</strong>
              <span>Notes are saved in this browser as you type.</span>
              <RetroButton size="sm" onClick={createNote}><Plus className="w-3.5 h-3.5" /> New note</RetroButton>
            </div>
          )}

          {active && active.format !== 'rich' && (
            <div className="notepad-split" data-preview={preview && active.format === 'markdown' ? 'true' : undefined}>
              <textarea
                ref={textRef}
                key={active.id}
                className="notepad-editor"
                value={active.body}
                onChange={(event) => updateActive({ body: event.target.value })}
                placeholder={active.format === 'markdown' ? '# Heading\n\nWrite **Markdown** here…' : 'Write here…'}
                spellCheck
                aria-label="Note text"
              />
              {preview && active.format === 'markdown' && (
                <div className="notepad-preview scrollable-area" aria-label="Preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(active.body) }} />
              )}
            </div>
          )}

          {active && active.format === 'rich' && (
            <div className="notepad-rich-pane">
              <div className="notepad-rich-toolbar" role="toolbar" aria-label="Formatting">
                <RetroButton size="icon" title="Bold (Ctrl+B)" aria-label="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => command('bold')}><Bold className="w-3.5 h-3.5" /></RetroButton>
                <RetroButton size="icon" title="Italic (Ctrl+I)" aria-label="Italic" onMouseDown={(event) => event.preventDefault()} onClick={() => command('italic')}><Italic className="w-3.5 h-3.5" /></RetroButton>
                <RetroButton size="icon" title="Underline (Ctrl+U)" aria-label="Underline" onMouseDown={(event) => event.preventDefault()} onClick={() => command('underline')}><Underline className="w-3.5 h-3.5" /></RetroButton>
                <RetroButton size="icon" title="Strikethrough" aria-label="Strikethrough" onMouseDown={(event) => event.preventDefault()} onClick={() => command('strikeThrough')}><Strikethrough className="w-3.5 h-3.5" /></RetroButton>
                <RetroButton size="icon" title="Heading 1" aria-label="Heading 1" onMouseDown={(event) => event.preventDefault()} onClick={() => command('formatBlock', '<h1>')}><Heading1 className="w-3.5 h-3.5" /></RetroButton>
                <RetroButton size="icon" title="Heading 2" aria-label="Heading 2" onMouseDown={(event) => event.preventDefault()} onClick={() => command('formatBlock', '<h2>')}><Heading2 className="w-3.5 h-3.5" /></RetroButton>
                <RetroButton size="icon" title="Bulleted list" aria-label="Bulleted list" onMouseDown={(event) => event.preventDefault()} onClick={() => command('insertUnorderedList')}><List className="w-3.5 h-3.5" /></RetroButton>
                <RetroButton size="icon" title="Numbered list" aria-label="Numbered list" onMouseDown={(event) => event.preventDefault()} onClick={() => command('insertOrderedList')}><ListOrdered className="w-3.5 h-3.5" /></RetroButton>
                <RetroButton size="icon" title="Clear formatting" aria-label="Clear formatting" onMouseDown={(event) => event.preventDefault()} onClick={() => { command('removeFormat'); command('formatBlock', '<p>'); }}><Eraser className="w-3.5 h-3.5" /></RetroButton>
              </div>
              <div
                ref={richRef}
                className="notepad-rich scrollable-area"
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-multiline="true"
                aria-label="Note text"
                spellCheck
                onInput={(event) => updateActive({ body: sanitizeHtml(event.currentTarget.innerHTML) })}
                onPaste={(event) => {
                  // Pasted HTML keeps its structure but loses styles and scripts.
                  const html = event.clipboardData.getData('text/html');
                  if (!html) return;
                  event.preventDefault();
                  document.execCommand('insertHTML', false, sanitizeHtml(html));
                  updateActive({ body: sanitizeHtml(event.currentTarget.innerHTML) });
                }}
              />
            </div>
          )}
        </div>
      </div>
    </WindowLayout>
  );
};

export default NotepadApp;

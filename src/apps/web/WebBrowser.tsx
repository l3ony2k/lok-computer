import React, { useState, useRef, useEffect, KeyboardEvent } from "react";
import { WindowLayout } from "@/components/window/WindowLayout";
import { RetroButton } from "@/components/ui/RetroButton";

// ============================================
// BOOKMARKS CONFIGURATION
// ============================================
interface Bookmark {
  name: string;
  url: string;
}

const BOOKMARKS: Bookmark[] = [
  { name: "are.na", url: "https://are.na/lok" },
  { name: "blog", url: "https://l3on.site" },
  { name: "journal", url: "https://journal.lok.computer" },
  { name: "canvas", url: "https://abc.lok.computer" },
  { name: "status", url: "https://status.cafe/users/lok" },
  { name: "simone's", url: "https://simone.computer/#/webdesktops" },
];
// ============================================

// Simple SVG icons for toolbar (or use a library if available)
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>;
const ForwardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;
const RefreshIcon = ({ className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-4 h-4 ${className}`}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>;

const sanitizeUrl = (url: string): string => {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

/**
 * A small iframe browser. The pages it shows are cross-origin, so their own
 * navigation cannot be observed; the address bar and history follow only what
 * is typed, clicked in the bookmark bar, or stepped through with back/forward.
 */
interface WebBrowserProps {
  initialUrl?: string;
  onPropsChange?: (props: Partial<WebBrowserProps>) => void;
}

export const WebBrowser: React.FC<WebBrowserProps> = ({ initialUrl = "https://lok.nekoweb.org", onPropsChange }) => {
  const [currentUrlInput, setCurrentUrlInput] = useState<string>(initialUrl);
  const [iframeSrc, setIframeSrc] = useState<string>(initialUrl);
  const [history, setHistory] = useState<string[]>([initialUrl]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setIframeSrc(initialUrl);
    setHistory([initialUrl]);
    setHistoryIndex(0);
    setCurrentUrlInput(initialUrl);
  }, [initialUrl]);

  // Share Window and session restore reopen the page on screen, not the first one.
  useEffect(() => {
    onPropsChange?.({ initialUrl: iframeSrc });
  }, [iframeSrc, onPropsChange]);

  const show = (url: string) => {
    setIsLoading(true);
    setIframeSrc(url);
    setCurrentUrlInput(url);
  };

  const navigate = (url: string) => {
    const sanitized = sanitizeUrl(url);
    console.log(`[App:Web] Loading: ${sanitized}`);
    show(sanitized);
    const newHistory = [...history.slice(0, historyIndex + 1), sanitized];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleGo = () => {
    if (currentUrlInput.trim() === "") return;
    navigate(currentUrlInput);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') handleGo();
  };

  const handleRefresh = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    setIsLoading(true);
    // Assigning src, even to the same address, makes the iframe navigate again (works cross-origin).
    iframe.src = iframeSrc;
  };

  const goBack = () => {
    if (historyIndex <= 0) return;
    setHistoryIndex(historyIndex - 1);
    show(history[historyIndex - 1]);
  };

  const goForward = () => {
    if (historyIndex >= history.length - 1) return;
    setHistoryIndex(historyIndex + 1);
    show(history[historyIndex + 1]);
  };

  return (
    <WindowLayout
      toolbar={
        <div className="app-toolbar-stack">
          {/* URL Bar */}
          <div className="app-toolbar-row browser-address-row">
            <div className="app-control-group">
              <RetroButton
                onClick={goBack}
                disabled={historyIndex === 0}
                size="sm"
                className="disabled:opacity-50"
                title="Backward"
              >
                <BackIcon />
              </RetroButton>
              <RetroButton
                onClick={goForward}
                disabled={historyIndex === history.length - 1}
                size="sm"
                className="disabled:opacity-50"
                title="Forward"
              >
                <ForwardIcon />
              </RetroButton>
              <RetroButton
                onClick={handleRefresh}
                disabled={isLoading}
                size="sm"
                title="Refresh"
              >
                <RefreshIcon className={isLoading ? "animate-spin" : ""} />
              </RetroButton>
            </div>
            <div className="app-joined-control browser-address-group">
              <input
                type="text"
                value={currentUrlInput}
                onChange={(e) => setCurrentUrlInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter URL..."
                className="search-input text-xs flex-1 focus:outline-none"
              />
              <RetroButton
                onClick={handleGo}
                size="sm"
                title="Go to URL"
              >
                Go
              </RetroButton>
              <RetroButton
                onClick={() => window.open(sanitizeUrl(currentUrlInput), '_blank', 'noopener,noreferrer')}
                size="sm"
                className="browser-external-button"
                title="Open in new browser tab"
              >
                ↗
              </RetroButton>
            </div>
          </div>
          {/* Bookmark Bar */}
          <div className="app-toolbar-row browser-bookmark-bar">
            {BOOKMARKS.map((bookmark) => (
              <RetroButton
                key={bookmark.url}
                onClick={() => navigate(bookmark.url)}
                size="sm"
                className="whitespace-nowrap flex-shrink-0"
                title={bookmark.url}
              >
                {bookmark.name}
              </RetroButton>
            ))}
          </div>
        </div>
      }
      hasPadding={false}
      isScrollable={false}
    >
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        title="Web Browser Content"
        className="w-full h-full border-0"
        sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"
        onLoad={() => setIsLoading(false)}
      />
    </WindowLayout>
  );
};

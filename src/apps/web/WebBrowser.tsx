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


export const WebBrowser: React.FC<{ initialUrl?: string }> = ({ initialUrl = "https://lok.nekoweb.org" }) => {
  const [currentUrlInput, setCurrentUrlInput] = useState<string>(initialUrl);
  const [iframeSrc, setIframeSrc] = useState<string>(initialUrl);
  const [history, setHistory] = useState<string[]>([initialUrl]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isNavigatingRef = useRef<boolean>(false);

  // Inject navigation tracking script
  const injectNavigationScript = () => {
    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        const script = document.createElement('script');
        script.textContent = `
          // Track clicks on links
          document.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' && e.target.href) {
              window.parent.postMessage({ type: 'navigation', url: e.target.href }, '*');
            }
          });
          
          // Track form submissions
          document.addEventListener('submit', (e) => {
            if (e.target.action) {
              window.parent.postMessage({ type: 'navigation', url: e.target.action }, '*');
            }
          });

          // Track history changes
          const pushState = history.pushState;
          history.pushState = function() {
            pushState.apply(history, arguments);
            window.parent.postMessage({ type: 'navigation', url: document.location.href }, '*');
          };

          const replaceState = history.replaceState;
          history.replaceState = function() {
            replaceState.apply(history, arguments);
            window.parent.postMessage({ type: 'navigation', url: document.location.href }, '*');
          };

          window.addEventListener('popstate', () => {
            window.parent.postMessage({ type: 'navigation', url: document.location.href }, '*');
          });
        `;

        try {
          iframe.contentDocument?.head.appendChild(script);
        } catch (e) {
          console.warn('Could not inject navigation script:', e);
        }
      }
    } catch (e) {
      console.warn('Could not access iframe:', e);
    }
  };

  useEffect(() => {
    // Set up message listener for iframe navigation
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'navigation') {
        const newUrl = event.data.url;
        handleIframeNavigation(newUrl);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleIframeNavigation = (newUrl: string) => {
    if (!isNavigatingRef.current) {
      isNavigatingRef.current = true;
      setIsLoading(true);
      console.log(`[App:Web] Navigating to: ${newUrl}`);

      // Update URL input and history
      setCurrentUrlInput(newUrl);
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newUrl);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      isNavigatingRef.current = false;
    }
  };

  useEffect(() => {
    setIframeSrc(initialUrl);
    setHistory([initialUrl]);
    setHistoryIndex(0);
    setCurrentUrlInput(initialUrl);
  }, [initialUrl]);

  const sanitizeUrl = (url: string): string => {
    let newUrl = url.trim();
    if (!newUrl.startsWith("http://") && !newUrl.startsWith("https://")) {
      newUrl = "https://" + newUrl;
    }
    return newUrl;
  };

  const navigate = (url: string) => {
    const sanitized = sanitizeUrl(url);
    console.log(`[App:Web] Loading: ${sanitized}`);
    setIsLoading(true);
    setIframeSrc(sanitized);
    setCurrentUrlInput(sanitized);

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(sanitized);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleGo = () => {
    if (currentUrlInput.trim() === "") return;
    navigate(currentUrlInput);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleGo();
    }
  };

  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      try {
        iframeRef.current.src = iframeRef.current.src;
      } catch (e) {
        console.error("Error refreshing iframe:", e);
        setIsLoading(false);
      }
    }
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const backUrl = history[newIndex];
      setIframeSrc(backUrl);
      setCurrentUrlInput(backUrl);
      setIsLoading(true);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const forwardUrl = history[newIndex];
      setIframeSrc(forwardUrl);
      setCurrentUrlInput(forwardUrl);
      setIsLoading(true);
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);

    // Try to update URL from iframe if possible
    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow && iframe.contentWindow.location.href !== "about:blank") {
        const currentUrl = iframe.contentWindow.location.href;
        handleIframeNavigation(currentUrl);
        injectNavigationScript(); // Inject the script after successful load
      }
    } catch (e) {
      // Silently handle cross-origin restrictions
    }
  };

  return (
    <WindowLayout
      toolbar={
        <div className="flex flex-col">
          {/* URL Bar */}
          <div className="flex items-center justify-between space-x-2 p-1 border-b border-border">
            <div className="flex items-center space-x-0">
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
            <div className="flex items-center flex-1 mx-2">
              <input
                type="text"
                value={currentUrlInput}
                onChange={(e) => setCurrentUrlInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter URL..."
                className="search-input text-xs flex-1 h-[18px] border-r-0 focus:outline-none"
              />
              <RetroButton
                onClick={handleGo}
                size="sm"
                className="h-[18px]"
                title="Go to URL"
              >
                Go
              </RetroButton>
              <RetroButton
                onClick={() => window.open(sanitizeUrl(currentUrlInput), '_blank', 'noopener,noreferrer')}
                size="sm"
                className="h-[18px] ml-1"
                title="Open in new browser tab"
              >
                ↗
              </RetroButton>
            </div>
          </div>
          {/* Bookmark Bar */}
          <div className="flex items-center gap-1 p-1 border-b border-border h-[26px] overflow-x-auto overflow-y-hidden">
            {BOOKMARKS.map((bookmark, index) => (
              <RetroButton
                key={index}
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
        sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts" // Common sandbox attributes
        onLoad={handleIframeLoad}
      />
    </WindowLayout>
  );
};
import { useCallback, useMemo } from 'react';
import { WindowLayout } from '@/components/window/WindowLayout';
import { RetroButton } from '@/components/ui/RetroButton';
import { copyText } from '@/lib/clipboard';
import { getAgentDocument, renderMarkdown } from '@/config/documents';
import { isTextDocumentPath } from '@/config/textDocuments';

interface DocumentAppProps {
  path?: string;
}

/**
 * A plain-text window for the site's agent-facing documents (/privacy,
 * /contact, /developers): the same Markdown the Worker serves to agents,
 * shown as is, with a button to copy all of it.
 */
export const DocumentApp = ({ path }: DocumentAppProps) => {
  const text = useMemo(() => {
    const document = isTextDocumentPath(path) ? getAgentDocument(path) : undefined;
    return document ? renderMarkdown(document) : null;
  }, [path]);

  const copyAll = useCallback(() => {
    if (text) void copyText(text);
  }, [text]);

  return (
    <WindowLayout
      toolbar={
        <div className="app-toolbar-row">
          <span className="text-xs text-muted-foreground flex-1 min-w-0">Written for agents and crawlers, not as a page for people.</span>
          <RetroButton size="sm" onClick={copyAll} disabled={!text} title="Copy the whole text as Markdown">
            Copy
          </RetroButton>
        </div>
      }
    >
      <pre className="font-mono whitespace-pre-wrap break-words select-text">
        {text ?? 'This document does not exist.'}
      </pre>
    </WindowLayout>
  );
};

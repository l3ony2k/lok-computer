import React, { useEffect } from 'react';
import { WindowLayout } from '@/components/window/WindowLayout';
import { StateMessage } from '@/components/ui/StateMessage';
import { RetroButton } from '@/components/ui/RetroButton';

export const GuestbookApp: React.FC = () => {

  useEffect(() => {
    console.log('[App:Guestbook] Loading script...');

    // Create and load the guestbook script
    const script = document.createElement('script');
    script.src = 'https://guestbooks.meadow.cafe/resources/js/embed_script/671/script.js';
    script.async = true;
    script.onload = () => {
      console.log('[App:Guestbook] Script loaded');
    };
    script.onerror = () => {
      console.error('[App:Guestbook] Failed to load script');
    };

    // Add script to document head
    document.head.appendChild(script);

    return () => {
      console.log('[App:Guestbook] Cleanup');
      // Clean up the script when component unmounts
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  return (
    <WindowLayout
      className="guestbook-window-layout"
      hasPadding={false}
      isScrollable={false}
      footer={
        <div className="app-footer-row justify-end">
          <span id="guestbooks___guestbook-made-with" className="text-xs opacity-50 select-none">
            Lovingly made with <a target="_blank" href="https://guestbooks.meadow.cafe/guestbook/671" className="underline hover:opacity-80">Guestbooks</a>
          </span>
        </div>
      }
    >
      <div className="guestbook-layout">
        <section className="guestbook-composer-pane scrollable-area" aria-label="Sign the guestbook">
          <div className="guestbook-pane-inner">
            <div id="guestbooks___guestbook-form-container">
              <form id="guestbooks___guestbook-form" action="https://guestbooks.meadow.cafe/guestbook/671/submit" method="post" className="space-y-3">
                <div className="guestbooks___input-container">
                  <input
                    placeholder="Name"
                    type="text"
                    id="name"
                    name="name"
                    required
                    className="search-input w-full"
                  />
                </div>
                <div className="guestbooks___input-container">
                  <input
                    placeholder="Website (optional)"
                    type="url"
                    id="website"
                    name="website"
                    className="search-input w-full"
                  />
                </div>
                <div id="guestbooks___challenge-answer-container"></div>
                <div className="guestbooks___input-container">
                  <textarea
                    placeholder="Message (plain text only)..."
                    id="text"
                    name="text"
                    className="search-input guestbook-message-input w-full"
                    required
                  ></textarea>
                </div>
                <RetroButton type="submit" variant="primary">Submit</RetroButton>
                <div id="guestbooks___error-message" className="text-sm text-destructive"></div>
              </form>
            </div>
          </div>
        </section>

        <section className="guestbook-messages-pane scrollable-area" aria-label="Guestbook messages">
          <div className="guestbook-pane-inner">
            <div id="guestbooks___guestbook-messages-container">
              <StateMessage minHeight="h-24">Loading messages...</StateMessage>
            </div>
          </div>
        </section>
      </div>
    </WindowLayout>
  );
};

export default GuestbookApp; 

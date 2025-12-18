import React, { useEffect } from 'react';
import { WindowLayout } from '@/components/window/WindowLayout';
import { StateMessage } from '@/components/ui/StateMessage';
import { RetroButton } from '@/components/ui/RetroButton';

interface GuestbookAppProps {
  // Any props needed for the guestbook app
}

export const GuestbookApp: React.FC<GuestbookAppProps> = () => {

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
      footer={
        <div className="flex items-center justify-end p-1 border-t border-border bg-background">
          <span id="guestbooks___guestbook-made-with" className="text-xs opacity-50 select-none">
            Lovingly made with <a target="_blank" href="https://guestbooks.meadow.cafe/guestbook/671" className="underline hover:opacity-80">Guestbooks</a>
          </span>
        </div>
      }
    >
      <div className="p-2">
        <div className="max-w-lg mx-auto space-y-4">
          {/* Guestbook Form Container */}
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
                  className="search-input w-full resize-vertical min-h-[100px]"
                  required
                ></textarea>
              </div>
              <RetroButton type="submit" className="px-2 py-1 text-sm">Submit</RetroButton>
              <div id="guestbooks___error-message" className="text-sm text-destructive"></div>
            </form>
          </div>

          {/* Messages Section */}
          <div id="guestbooks___guestbook-messages-container" className="space-y-3">
            <StateMessage minHeight="h-24">Loading messages...</StateMessage>
          </div>
        </div>
      </div>
    </WindowLayout>
  );
};

export default GuestbookApp; 

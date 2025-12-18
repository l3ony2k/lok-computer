import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { WindowLayout } from '@/components/window/WindowLayout';
import { RetroButton } from '@/components/ui/RetroButton';
import { APP_CONFIG } from '@/config/constants';
import { getAppState, setAppState } from '@/lib/storage';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
};

const APP_STATE_KEY = 'app:ai-chat';
const MAX_HISTORY = 10;
const INITIAL_MESSAGE: Message = { id: '1', text: 'Hello user, how can I help you?', sender: 'ai' };

export const TalkToAI = () => {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [input, setInput] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load messages from IndexedDB on mount
  useEffect(() => {
    let mounted = true;

    const loadMessages = async () => {
      try {
        // Try IndexedDB first
        const saved = await getAppState<Message[]>(APP_STATE_KEY);

        if (mounted) {
          if (saved && saved.length > 0) {
            setMessages(saved);
          } else {
            // Migrate from localStorage if exists
            try {
              const legacyData = localStorage.getItem('ai-chat-history');
              if (legacyData) {
                const parsed = JSON.parse(legacyData);
                if (parsed && parsed.length > 0) {
                  setMessages(parsed);
                  // Save to IndexedDB and clear localStorage
                  await setAppState(APP_STATE_KEY, parsed);
                  localStorage.removeItem('ai-chat-history');
                  console.info('[TalkToAI] Migrated chat history from localStorage to IndexedDB');
                }
              }
            } catch (e) {
              console.warn('[TalkToAI] Failed to migrate from localStorage:', e);
            }
          }
        }
      } catch (error) {
        console.error('[TalkToAI] Failed to load chat history:', error);
      } finally {
        if (mounted) {
          setIsInitialized(true);
        }
      }
    };

    loadMessages();

    return () => {
      mounted = false;
    };
  }, []);

  // Save messages to IndexedDB whenever they change
  useEffect(() => {
    if (!isInitialized) return;

    const saveMessages = async () => {
      try {
        await setAppState(APP_STATE_KEY, messages);
      } catch (error) {
        console.error('[TalkToAI] Failed to save chat history:', error);
      }
    };

    saveMessages();
  }, [messages, isInitialized]);

  // Initial focus
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        const scrollContainer = messagesEndRef.current.parentElement?.parentElement;
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    }, 0);
  };

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const { mutate: sendMessage, isPending: isLoading } = useMutation({
    mutationFn: async (userMessage: Message) => {
      console.log('[App:AI] Sending message...');
      // Convert messages to OpenAI format
      const apiMessages = messages.concat(userMessage).slice(-MAX_HISTORY).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      console.log(`[API:AI] POST chat (${apiMessages.length} messages)`);
      const response = await fetch(APP_CONFIG.AI_CHAT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content;

      if (!aiResponse) {
        throw new Error('Invalid AI response format');
      }

      return aiResponse;
    },
    onSuccess: (aiResponse) => {
      console.log('[App:AI] Response received');
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        sender: 'ai',
      };
      setMessages(prev => [...prev, aiMessage]);
      scrollToBottom();
      // Focus back on input after sending
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    },
    onError: (error) => {
      console.error('Error getting AI response:', error);
      toast.error('Failed to get AI response. Please try again.');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    scrollToBottom();
    sendMessage(userMessage);
  };

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    const initialMessage = { id: Date.now().toString(), text: 'Hello user, how can I help you?', sender: 'ai' as const };
    setMessages([initialMessage]);
    setConfirmClear(false);
    toast.success('Chat history cleared');
    // Focus back on input after clearing
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  // Reset confirm state when clicking elsewhere
  const handleClearBlur = () => {
    // Small delay to allow click to register first
    setTimeout(() => {
      setConfirmClear(false);
    }, 150);
  };

  return (
    <WindowLayout
      toolbar={
        <div className="flex items-center justify-center p-1 border-b border-border">
          <span className="text-xs opacity-50">AI may go crazy. Use at your own risk.</span>
        </div>
      }
      footer={
        <div className="flex items-center justify-between space-x-2 p-1 border-t border-border">
          <RetroButton
            type="button"
            onClick={handleClear}
            onBlur={handleClearBlur}
            size="sm"
            title={confirmClear ? "Click again to confirm" : "Clear chat history"}
            className={confirmClear ? "bg-red-600 hover:bg-red-700 text-white" : ""}
            style={{ width: '60px' }}
          >
            {confirmClear ? "Confirm?" : "Clear"}
          </RetroButton>
          <form onSubmit={handleSubmit} className="flex items-center flex-1 mx-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isLoading ? "Waiting for response..." : "Type a message..."}
              disabled={isLoading}
              className="search-input text-xs flex-1 h-[18px] border-r-0 focus:outline-none"
            />
            <RetroButton
              type="submit"
              disabled={isLoading}
              size="sm"
              className="disabled:opacity-50"
              title="Send message"
            >
              Send
            </RetroButton>
          </form>
        </div>
      }
      hasPadding={true}
    >
      <div className="space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs md:max-w-md px-2 py-1 text-[0.875rem] ${message.sender === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
                }`}
            >
              {message.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </WindowLayout>
  );
};

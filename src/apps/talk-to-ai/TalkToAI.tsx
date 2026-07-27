import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { WindowLayout } from '@/components/window/WindowLayout';
import { RetroButton } from '@/components/ui/RetroButton';
import { APP_CONFIG } from '@/config/constants';
import { usePersistedState } from '@/hooks/useStorage';
import { TypoText } from './TypoText';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
};

const APP_STATE_KEY = 'app:ai-chat';
const MAX_HISTORY = 10;
const INITIAL_MESSAGES: Message[] = [{ id: '1', text: 'Hello user, how can I help you?', sender: 'ai' }];

// Set to true to test typo effect without real API
const DEV_MODE = false;
const MOCK_RESPONSES = [
  "That's a great question! Let me think about that for a moment. I believe the answer involves considering multiple perspectives and weighing the pros and cons carefully.",
  "I'd be happy to help you with that! Here's what I think we should do: first, analyze the problem, then break it down into smaller steps.",
  "Interesting! Based on my understanding, this could be approached in several ways. The most straightforward method would be to start with the basics and build from there.",
  "Thanks for asking! I enjoy helping with questions like this. The key insight here is that sometimes the simplest solution is the best one.",
  "Good question! Let me explain this step by step. First, we need to understand the underlying concepts before we can tackle the more complex aspects.",
];

export const TalkToAI = () => {
  // Using usePersistedState hook instead of manual load/save useEffects
  const [messages, setMessages] = usePersistedState<Message[]>({
    key: APP_STATE_KEY,
    defaultValue: INITIAL_MESSAGES,
    debounceMs: 150,
  });
  const [input, setInput] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [latestAiMessageId, setLatestAiMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

      // DEV_MODE: Return mock response instead of calling API
      if (DEV_MODE) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
        const randomResponse = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
        console.log('[App:AI] DEV_MODE: Returning mock response');
        return randomResponse;
      }

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
      const aiMessageId = (Date.now() + 1).toString();
      const aiMessage: Message = {
        id: aiMessageId,
        text: aiResponse,
        sender: 'ai',
      };
      setMessages(prev => [...prev, aiMessage]);
      setLatestAiMessageId(aiMessageId); // Track for typo animation
      scrollToBottom();
      // Focus back on input after sending
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    },
    onError: (error) => {
      console.error('Error getting AI response:', error);
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
        <div className="app-toolbar-row justify-center">
          <span className="text-xs opacity-50">AI may go crazy. Use at your own risk.</span>
        </div>
      }
      footer={
        <div className="app-footer-row">
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
          <form onSubmit={handleSubmit} className="app-joined-control flex-1">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isLoading ? "Waiting for response..." : "Type a message..."}
              disabled={isLoading}
              className="search-input text-xs flex-1 focus:outline-none"
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
              {message.sender === 'ai' ? (
                <TypoText
                  text={message.text}
                  isNew={message.id === latestAiMessageId}
                  speed={30}
                  jitter={15}
                  typoChance={4}
                />
              ) : (
                message.text
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </WindowLayout>
  );
};

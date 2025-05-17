import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { ArenaWindowLayout } from "@/apps/arena/components/ArenaWindowLayout";

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
};

const STORAGE_KEY = 'ai-chat-history';
const MAX_HISTORY = 10;

export const TalkToAI = () => {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [
        { id: '1', text: 'Hello user, how can I help you?', sender: 'ai' },
      ];
    } catch (error) {
      console.error('Failed to load chat history:', error);
      return [{ id: '1', text: 'Hello user, how can I help you?', sender: 'ai' }];
    }
  });
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
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
    setIsLoading(true);
    scrollToBottom();

    try {
      // Convert messages to OpenAI format
      const apiMessages = messages.concat(userMessage).slice(-MAX_HISTORY).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      const response = await fetch('/api/chat', {
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

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        sender: 'ai',
      };

      setMessages(prev => [...prev, aiMessage]);
      scrollToBottom();
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast.error('Failed to get AI response. Please try again.');
    } finally {
      setIsLoading(false);
      // Focus back on input after sending
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleClear = () => {
    const initialMessage = { id: Date.now().toString(), text: 'Hello! How can I help you today?', sender: 'ai' as const };
    setMessages([initialMessage]);
    toast.success('Chat history cleared');
    // Focus back on input after clearing
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  return (
    <ArenaWindowLayout
      toolbar={
        <div className="flex items-center justify-center p-1 border-b border-border">
          <span className="text-xs opacity-50">AI may go crazy. Use at your own risk.</span>
        </div>
      }
    >
      <div className="flex flex-col h-full">
        <div className="window-content-area flex-1 p-2 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs md:max-w-md px-2 py-1 ${
                    message.sender === 'user'
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
        </div>
        
        <div className="flex items-center justify-between space-x-2 p-1 border-t border-border">
          <button
            type="button"
            onClick={handleClear}
            className="retro-button text-xs px-1 h-[18px]"
            title="Clear chat history"
          >
            Clear
          </button>
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
            <button
              type="submit"
              disabled={isLoading}
              className="retro-button text-xs px-1 h-[18px] disabled:opacity-50"
              title="Send message"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </ArenaWindowLayout>
  );
};

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

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
        { id: '1', text: 'Hello! How can I help you today?', sender: 'ai' },
      ];
    } catch (error) {
      console.error('Failed to load chat history:', error);
      return [{ id: '1', text: 'Hello! How can I help you today?', sender: 'ai' }];
    }
  });
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const scrollContainer = messagesEndRef.current.parentElement;
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
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
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast.error('Failed to get AI response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    const initialMessage = { id: Date.now().toString(), text: 'Hello! How can I help you today?', sender: 'ai' as const };
    setMessages([initialMessage]);
    toast.success('Chat history cleared');
  };

  return (
    <div className="flex flex-col h-full bg-background">
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
      
      <form onSubmit={handleSend} className="p-2 border-t border-border">
        <div className="flex space-x-0">
          <button
            type="button"
            onClick={handleClear}
            className="retro-button px-2 py-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Clear
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isLoading ? "Waiting for response..." : "Type a message..."}
            disabled={isLoading}
            className="flex-1 px-2 py-1 border border-border bg-background"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="retro-button px-2 py-1 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

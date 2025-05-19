"use client";

import { useState, useEffect, useRef } from "react";
import ChatMessage from "../components/ChatMessage";
import Sidebar from "../components/Sidebar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRouter } from "next/navigation";

interface Message {
  sender: "user" | "assistant";
  content: string;
  id?: string;
  stats?: {
    tokens?: number;
    time?: number;
    tokensPerSecond?: number;
  };
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Sidebar open by default
  const [selectedModel, setSelectedModel] = useState<string>("llama-3.3-70b");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Initialize from localStorage (browser-only)
  useEffect(() => {
    // Only run in browser environment
    const savedModel = localStorage.getItem("selected_model");
    if (savedModel) {
      setSelectedModel(savedModel);
    }
  }, []);
  
  // Handle model selection
  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    // Only access localStorage in browser environment
    if (typeof window !== "undefined") {
      localStorage.setItem("selected_model", modelId);
    }
    setIsSidebarOpen(true);
  };
  const router = useRouter();

  useEffect(() => {
    // Check if we need to migrate from old model ID format
    const currentModel = localStorage.getItem("selected_model");
    if (currentModel && currentModel.startsWith("cerebras/")) {
      console.log("Migrating from old model ID format", currentModel);
      localStorage.setItem("selected_model", "llama-3.3-70b");
    }
    
    const apiKey = localStorage.getItem("CEREBRAS_API_KEY");
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea as content grows
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [input]);

  // No edit functionality
  
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { 
      sender: "user", 
      content: input,
      id: `user_${Date.now()}` 
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const apiKey = localStorage.getItem("CEREBRAS_API_KEY");
    if (!apiKey) {
      alert("API key not found.");
      setIsLoading(false);
      return;
    }

    // Get the selected model from localStorage or use default
    let selectedModel = localStorage.getItem("selected_model") || "llama-3.3-70b";
    
    // Ensure we're using the correct model ID format
    if (selectedModel.startsWith("cerebras/")) {
      console.log("Converting old model ID format in chat request:", selectedModel);
      selectedModel = "llama-3.3-70b";
      localStorage.setItem("selected_model", selectedModel);
    }

    try {
      const response = await fetch("/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ 
          messages: [
            { role: "system", content: "You are a helpful assistant running on Cerebras hardware." },
            ...messages.map(msg => ({
              role: msg.sender === "user" ? "user" : "assistant",
              content: msg.content
            })),
            { role: "user", content: userMessage.content }
          ],
          model: selectedModel
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error:", response.status, errorData);
        
        let errorMessage = "Sorry, there was an error processing your request.";
        if (response.status === 401) {
          errorMessage = "Invalid API key. Please check your Cerebras API key in the settings.";
        } else if (response.status === 400) {
          errorMessage = "Invalid request. Please try again with a different prompt or model.";
        } else if (response.status === 429) {
          errorMessage = "Rate limit exceeded. Please try again later.";
        } else if (response.status >= 500) {
          errorMessage = "Server error. The Cerebras service might be experiencing issues.";
        }
        
        setMessages((prev) => [...prev, { sender: "assistant", content: errorMessage }]);
        return;
      }

      try {
        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder("utf-8");
        let assistantMessage = "";
        
        // For token counting and timing
        const streamStartTime = Date.now(); // Track total stream time
        let firstTokenTime: number | null = null; // Will be set when first token arrives
        let tokenCount = 0;
        let usageData: any = null;
        const messageId = `msg_${Date.now()}`;

        if (reader) {
          // Add an initial empty message from the assistant that we'll update
          setMessages((prev) => [...prev, { 
            sender: "assistant", 
            content: "", 
            id: messageId,
            stats: { tokens: 0, time: 0, tokensPerSecond: 0 }
          }]);
          console.log("Starting to read stream");

          try {
            while (true) {
              const { value, done } = await reader.read();
              
              if (done) {
                console.log("Stream complete");
                
                // Use the usage data from OpenRouter if available
                if (usageData && usageData.completion_tokens) {
                  console.log("Final usage data:", usageData);
                  tokenCount = usageData.completion_tokens;
                }
                
                // Calculate tokens per second based ONLY on time since first token
                // This avoids being dragged down by initial latency
                let tokensPerSecond = 0;
                let timeToDisplay = 0;
                
                if (firstTokenTime !== null && tokenCount > 0) {
                  // Only use the time since the first token arrived
                  const generationTime = (Date.now() - firstTokenTime) / 1000; // in seconds
                  tokensPerSecond = tokenCount / generationTime;
                  timeToDisplay = generationTime;
                  console.log(`Final stats: ${tokenCount} tokens in ${generationTime}s (${tokensPerSecond} tokens/sec)`);
                } else {
                  // Fallback to total time if somehow we didn't track first token time
                  const totalTime = (Date.now() - streamStartTime) / 1000;
                  timeToDisplay = totalTime;
                }
                
                // Update the message with final stats
                setMessages((prev) => {
                  const lastMessage = prev[prev.length - 1];
                  return [
                    ...prev.slice(0, -1),
                    { 
                      ...lastMessage, 
                      stats: {
                        tokens: tokenCount,
                        time: timeToDisplay,
                        tokensPerSecond: tokenCount / timeToDisplay
                      }
                    }
                  ];
                });
                
                break;
              }
              
              // Decode the chunk and split by lines
              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n").filter(line => line.trim().startsWith("data: "));
              
              for (const line of lines) {
                // Remove the "data: " prefix
                const jsonStr = line.replace(/^data: /, "").trim();
                if (jsonStr === "[DONE]") continue;
                
                try {
                  // Parse the JSON data
                  const parsed = JSON.parse(jsonStr);
                  let content = "";
                  
                  // Check if this chunk contains usage data
                  if (parsed.usage) {
                    console.log("Received usage data:", parsed.usage);
                    usageData = parsed.usage;
                    tokenCount = parsed.usage.completion_tokens || 0;
                  }
                  
                  if (parsed.choices?.[0]?.delta?.content) {
                    // Streaming format
                    content = parsed.choices[0].delta.content;
                  } else if (parsed.choices?.[0]?.message?.content) {
                    // Complete message format
                    content = parsed.choices[0].message.content;
                  }
                  
                  if (content) {
                    // Start the timer when we receive the first token
                    if (firstTokenTime === null) {
                      firstTokenTime = Date.now();
                      console.log('First token received, starting timer');
                    }
                    
                    assistantMessage += content;
                    
                    // Calculate current stats based on time since first token
                    if (firstTokenTime !== null) {
                      const currentTime = (Date.now() - firstTokenTime) / 1000; // in seconds
                      const currentTokensPerSecond = tokenCount > 0 ? tokenCount / currentTime : 0;
                      
                      // Update the last message with the new content and current stats
                      setMessages((prev) => [
                        ...prev.slice(0, -1),
                        { 
                          sender: "assistant", 
                          content: assistantMessage,
                          id: messageId,
                          stats: {
                            tokens: tokenCount,
                            time: parseFloat(currentTime.toFixed(1)),
                            tokensPerSecond: parseFloat(currentTokensPerSecond.toFixed(1))
                          }
                        }
                      ]);
                    }
                  }
                } catch (e) {
                  console.error("Error parsing SSE data:", e, jsonStr);
                }
              }
            }
          } catch (streamError) {
            console.error("Error reading stream:", streamError);
            setMessages((prev) => [...prev, { sender: "assistant", content: "Error reading response stream. Please try again." }]);
          }
        }
      } catch (streamError) {
        console.error("Error reading stream:", streamError);
        setMessages((prev) => [...prev, { sender: "assistant", content: "Error reading response stream. Please try again." }]);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [...prev, { sender: "assistant", content: "Sorry, there was an error processing your request." }]);
    } finally {
      setIsLoading(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-dark-900 text-dark-50 overflow-hidden">
      {/* Repository banner */}
      <div className="bg-gradient-to-r from-accent-900/30 to-primary-900/30 px-4 py-2 text-center relative">
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs font-mono text-dark-100">Interested in this chat interface?</span>
          <a 
            href="https://github.com/kwt00/cerebras-chat-interface"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-mono font-semibold bg-accent-600/20 hover:bg-accent-600/40 text-accent-300 hover:text-accent-200 transition-colors px-3 py-1.5 rounded-sm"
            aria-label="Clone Repository"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
            Clone This Repository Yourself!
          </a>
        </div>
      </div>
      {/* Main content area */}
      <div className={`flex flex-col flex-1 w-full transition-all duration-300 ease-in-out ${isSidebarOpen ? 'mr-80' : 'mr-0'}`}>
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-primary-900/30 bg-dark-900 px-6 py-3">
          <div className="flex items-center">
            <h1 className="text-lg font-mono font-semibold tracking-tight text-primary-500">
              CEREBRAS CHAT
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="flex items-center text-xs font-mono text-dark-200 hover:text-primary-400 transition-colors p-1.5 border-1 border-primary-600/30 hover:border-primary-500/50"
              aria-label="Toggle settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </header>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center animate-slide-in">
              <div className="border-1 border-primary-600/30 p-5 mb-6 animate-glow">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8 text-primary-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-mono font-semibold text-gradient mb-3 tracking-tight uppercase neon-text">Cerebras Chat</h2>
              <p className="text-dark-200 max-w-md mb-8 font-mono text-sm">Interact with advanced language models via the Cerebras API</p>
              <div className="flex flex-wrap gap-3 justify-center max-w-md">
                <span 
                  onClick={() => handleModelSelect("qwen-3-32b")} 
                  className="px-3 py-1.5 border-1 border-accent-600/50 text-xs font-mono text-accent-300 hover:text-accent-200 hover:border-accent-500/70 transition-all cursor-pointer animate-pulse"
                >
                  QWEN-3-32B
                </span>
                <span 
                  onClick={() => handleModelSelect("llama-3.3-70b")} 
                  className="px-3 py-1.5 border-1 border-primary-600/30 text-xs font-mono text-primary-400 hover:text-primary-300 hover:border-primary-500/50 transition-all cursor-pointer"
                >
                  LLAMA-3.3-70B
                </span>
                <span 
                  onClick={() => handleModelSelect("llama-3.1-8b")}
                  className="px-3 py-1.5 border-1 border-accent-600/30 text-xs font-mono text-accent-400 hover:text-accent-300 hover:border-accent-500/50 transition-all cursor-pointer"
                >
                  LLAMA-3.1-8B
                </span>
                <span 
                  onClick={() => handleModelSelect("llama-4-scout-17b-16e-instruct")}
                  className="px-3 py-1.5 border-1 border-primary-600/30 text-xs font-mono text-primary-400 hover:text-primary-300 hover:border-primary-500/50 transition-all cursor-pointer"
                >
                  LLAMA-4-SCOUT-17B
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {messages.map((msg, index) => (
                <div key={index} className="animate-slide-in" style={{animationDelay: `${index * 0.05}s`}}>
                  <ChatMessage 
                    sender={msg.sender} 
                    message={msg.content} 
                    id={msg.id}
                    stats={msg.stats}
                  />
                </div>
              ))}
            </div>
          )}
          {isLoading && messages.length > 0 && !messages[messages.length - 1].content && (
            <div className="flex items-center justify-center py-4">
              <span className="text-xs font-mono text-accent-400">PROCESSING...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="px-4 py-4 sm:px-6 bg-dark-900 border-t border-primary-900/30">
          <div className="relative flex max-h-60 w-full overflow-hidden border-1 border-primary-600/30 transition-all duration-200 focus-within:border-primary-500/50">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter command..."
              className="w-full resize-none border-0 bg-dark-900 py-2.5 px-4 text-white placeholder:text-dark-400 focus:ring-0 focus:outline-none text-xs font-mono"
              rows={1}
              style={{ maxHeight: '200px', overflowY: 'auto' }}
              inputMode="text"
              data-lpignore="true"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
            <div className="flex items-center pr-2">
              <button
                type="button"
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className={`p-2 transition-all border-l border-primary-600/30 ${isLoading || !input.trim() ? 'text-dark-400' : 'text-accent-400 hover:text-accent-300'}`}
                aria-label="Send message"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                </svg>
              </button>
            </div>
          </div>
          <a href="https://www.cerebras.ai/"><p className="mt-2 text-xs underline font-mono text-dark-400 text-center tracking-tight">Check Out Our Website</p></a>
        </div>
      </div>
      
      {/* Sidebar - positioned absolutely to avoid blocking chat */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
        selectedModel={selectedModel}
        onModelSelect={handleModelSelect}
      />
    </div>
  );
}

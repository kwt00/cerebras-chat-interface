import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
  message: string;
  sender: "user" | "assistant";
  id?: string;
  stats?: {
    tokens?: number;
    time?: number;
    tokensPerSecond?: number;
  };
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  sender, 
  id, 
  stats
}) => {
  const isUser = sender === "user";
  
  // Process think tags if present in assistant messages
  const { displayMessage, thinkContent } = useMemo(() => {
    if (!isUser && message) {
      const thinkTagMatch = message.match(/<think>([\s\S]*?)<\/think>/m);
      
      if (thinkTagMatch) {
        // Extract the think content and the rest of the message
        const thinkText = thinkTagMatch[1].trim();
        const cleanMessage = message.replace(/<think>[\s\S]*?<\/think>/m, '').trim();
        
        return {
          displayMessage: cleanMessage,
          thinkContent: thinkText
        };
      }
    }
    
    return {
      displayMessage: message,
      thinkContent: null
    };
  }, [message, isUser]);

  return (
    <div className="py-2">
      <div className="mx-auto flex max-w-3xl">
        <div className={`flex h-8 w-8 shrink-0 select-none items-center justify-center ${isUser ? "border-1 border-primary-600/30" : "border-1 border-accent-600/30"} ${isUser ? "bg-dark-800" : "bg-dark-900"}`}>
          {isUser ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-primary-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-accent-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          )}
        </div>
        <div className="ml-3 flex-1 space-y-1">
          <div className="flex items-center">
            <div className="font-mono text-xs tracking-wider uppercase text-dark-200">{isUser ? "You" : "Assistant"}</div>
          </div>
          <div className={`prose-sm prose max-w-none font-mono ${isUser ? "text-dark-100" : "text-white"}`}>
            {displayMessage ? (
              <>
                {/* Display thinking process if available */}
                {thinkContent && (
                  <div className="mb-4 p-3 bg-primary-900/20 border-l-2 border-primary-400/50 text-dark-200">
                    <div className="flex items-center mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-primary-400 mr-2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                      </svg>
                      <span className="text-xs uppercase tracking-wider text-primary-400">Thinking Process</span>
                    </div>
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({children}: any) => <p className="my-1">{children}</p>,
                        pre: ({ children, ...props }: any) => (
                          <pre className="bg-dark-900 border-1 border-primary-600/30 p-3 overflow-auto my-2" {...props}>{children}</pre>
                        ),
                        code: ({ children, inline, ...props }: any) => (
                          inline ? 
                          <code className="bg-dark-900 border-1 border-primary-600/20 px-1 py-0.5 text-accent-400" {...props}>{children}</code> :
                          <code {...props}>{children}</code>
                        )
                      }}
                    >
                      {thinkContent}
                    </ReactMarkdown>
                  </div>
                )}
                
                {/* Display the actual message */}
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]} 
                  components={{
                    pre: ({ children, ...props }: any) => (
                      <pre className="bg-dark-900 border-1 border-primary-600/30 p-3 overflow-auto my-2" {...props}>{children}</pre>
                    ),
                    code: ({ children, inline, ...props }: any) => (
                      inline ? 
                      <code className="bg-dark-900 border-1 border-primary-600/20 px-1 py-0.5 text-accent-400" {...props}>{children}</code> :
                      <code {...props}>{children}</code>
                    ),
                    a: ({children, ...props}: any) => (
                      <a className="text-primary-400 hover:text-primary-300 no-underline border-b border-primary-600/30 hover:border-primary-500/50" {...props}>{children}</a>
                    ),
                    ul: ({children, ...props}: any) => (
                      <ul className="pl-5 list-none" {...props}>{children}</ul>
                    ),
                    li: ({children, ...props}: any) => (
                      <li className="relative before:absolute before:content-[''] before:w-1 before:h-1 before:bg-primary-600/50 before:left-[-1rem] before:top-[0.6rem]" {...props}>{children}</li>
                    )
                  }}
                >
                  {displayMessage}
                </ReactMarkdown>
              </>
            ) : (
              <span className="text-accent-400">...</span>
            )}
            
            {/* Display tokens/second for assistant messages */}
            {!isUser && stats && stats.tokensPerSecond && (
              <div className="mt-2 text-xs font-mono flex justify-end items-center gap-2">
                <div className="flex items-center gap-1 border-1 border-primary-600/30 bg-dark-900 px-2 py-0.5">
                  <span className="text-primary-500">{stats.tokensPerSecond.toFixed(2)}</span>
                  <span className="text-dark-400">tokens/sec</span>
                </div>
                <div className="text-dark-500">
                  <span>{stats.tokens} tokens</span>
                  <span className="mx-1">•</span>
                  <span>{stats.time?.toFixed(3)}s</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;

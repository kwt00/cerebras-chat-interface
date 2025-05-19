import { NextRequest, NextResponse } from "next/server";
import Cerebras from '@cerebras/cerebras_cloud_sdk';

// Simple function to estimate token count
// This is a rough approximation - 1 token ≈ 4 chars for English text
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

// Function to truncate messages to stay under token limit
function truncateMessages(messages: any[], maxTokens: number = 8000): any[] {
  // Always keep the system message
  const systemMessages = messages.filter(msg => msg.role === 'system');
  let userAssistantMessages = messages.filter(msg => msg.role !== 'system');
  
  // Estimate current token count
  let totalTokens = 0;
  
  // Count system message tokens (these are kept intact)
  systemMessages.forEach(msg => {
    totalTokens += estimateTokenCount(msg.content || '');
  });
  
  // Reserve some tokens for the response (2000)
  const reservedTokens = 2000;
  const availableTokens = maxTokens - totalTokens - reservedTokens;
  
  // If we already exceed the limit with just system messages, return only system
  if (availableTokens <= 0) {
    return systemMessages;
  }
  
  // Start from most recent messages and work backwards
  userAssistantMessages.reverse();
  
  const truncatedMessages = [];
  let tokensUsed = 0;
  
  for (const msg of userAssistantMessages) {
    const tokenCount = estimateTokenCount(msg.content || '');
    
    if (tokensUsed + tokenCount <= availableTokens) {
      truncatedMessages.push(msg);
      tokensUsed += tokenCount;
    } else {
      // If a single message exceeds remaining tokens, truncate it
      if (truncatedMessages.length === 0) {
        const availableChars = availableTokens * 4;
        const truncatedContent = msg.content.slice(0, availableChars);
        truncatedMessages.push({
          ...msg,
          content: truncatedContent + "... [truncated due to token limit]"
        });
      }
      break;
    }
  }
  
  // Combine system messages with truncated messages (in correct order)
  return [...systemMessages, ...truncatedMessages.reverse()];
}

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    let { messages, model } = await req.json();
    
    // Ensure there's a system message
    if (!messages.some((msg: {role: string}) => msg.role === 'system')) {
      messages = [
        { role: 'system', content: 'You are a helpful assistant running on Cerebras hardware.' },
        ...messages
      ];
    }
    
    // Truncate messages to stay under 8000 tokens
    const truncatedMessages = truncateMessages(messages, 8000);
    console.log(`Original messages: ${messages.length}, Truncated: ${truncatedMessages.length}`);
    messages = truncatedMessages;
    
    const apiKey = req.headers.get("Authorization")?.split(" ")[1];
    if (!apiKey) return NextResponse.json({ error: "Missing key" }, { status: 401 });

    // Create Cerebras client
    const client = new Cerebras({
      apiKey: apiKey,
    });

    // Set default model if not provided and ensure correct format
    let modelToUse = model || "llama-3.3-70b";
    // Ensure llama-3.1-8b is used instead of llama3.1-8b
    if (modelToUse === "llama3.1-8b") {
      modelToUse = "llama-3.1-8b";
    }
    
    // Set appropriate parameters based on model
    let completionParams: any = {
      model: modelToUse,
      messages: messages,
      stream: true,
    };
    
    // Add model-specific parameters
    if (modelToUse === "qwen-3-32b") {
      completionParams.max_completion_tokens = 10240;
      completionParams.temperature = 0.7;
      completionParams.top_p = 0.95;
    }
    
    console.log(`Using Cerebras model: ${modelToUse} with params:`, completionParams);

    const start = performance.now();
    
    // Create a TransformStream to handle the streaming response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    // Create a separate stream for token counting
    const encoder = new TextEncoder();
    let totalTokens = 0;
    
    try {
      // Create the completion stream using the configured parameters
      const response = await client.chat.completions.create(completionParams);
      // Ensure we have an async iterable for the stream
      const completionStream = response as unknown as AsyncIterable<any>;
      
      // Process the stream
      (async () => {
        try {
          for await (const chunk of completionStream) {
            // Format the chunk as an SSE message with proper type handling
            const typedChunk = chunk as any; // Type assertion for Cerebras SDK response
            const content = typedChunk.choices?.[0]?.delta?.content || "";
            if (content) {
              // Write the chunk to the stream in SSE format
              const sseMessage = `data: ${JSON.stringify(chunk)}\n\n`;
              await writer.write(encoder.encode(sseMessage));
              
              // Count tokens (very rough approximation)
              totalTokens += content.split(/\s+/).length;
            }
          }
          
          // Calculate time with maximum precision
          const elapsedMs = performance.now() - start;
          // Use Number.EPSILON (smallest possible value) instead of 0.001 for maximum precision
          const sec = elapsedMs === 0 ? Number.EPSILON : elapsedMs / 1000;
          const tps = totalTokens/sec;
          
          // Format usage data in the same format as OpenRouter for client compatibility
          // but include the exact floating point values without rounding
          const usageData = {
            usage: {
              completion_tokens: totalTokens,
              total_tokens: totalTokens
            },
            time_info: {
              completion_time: sec,
              total_time: sec
            }
          };
          
          // Send usage data as SSE message
          await writer.write(encoder.encode(`data: ${JSON.stringify(usageData)}\n\n`));
          
          // End the stream
          await writer.write(encoder.encode("data: [DONE]\n\n"));
          
          // Log TPS to server console with full precision
          console.log(`🔢 ${totalTokens} tokens  ⏱️ ${sec.toString()} s  🚀 ${tps} TPS`);
        } catch (streamError: any) {
          console.error("Stream processing error:", streamError);
          const errorMessage = streamError?.message || "Unknown streaming error";
          await writer.write(encoder.encode(`data: {"error": "${errorMessage}"}\n\n`));
        } finally {
          writer.close();
        }
      })();
      
      // Return the readable stream to the client
      return new NextResponse(stream.readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        }
      });
      
    } catch (error: any) {
      console.error("Cerebras API error:", error);
      writer.close();
      
      return NextResponse.json(
        { error: error.message || "Cerebras API error" },
        { status: error.status || 500 }
      );
    }
    
  } catch (err: any) {
    console.error("Internal server error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

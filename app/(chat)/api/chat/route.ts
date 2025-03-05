// app/api/chat/route.ts
import { getVentsService } from '@/lib/vent-service';
import { NextRequest, NextResponse } from 'next/server';

// Get previous messages from a session
const getPreviousMessages = async (id: string) => {
  const ventsService = getVentsService();
  
  // If we have a session ID, use it
  if (id) {
    ventsService.setSessionId(id);
  } else {
    // Create a new session if none exists
    const sessionId = await ventsService.createSession();
    return { messages: [], sessionId };
  }
  
  // Get message history
  const messages = await ventsService.getSessionHistory();
  return { messages, sessionId: id };
};

// Handle new messages from the user
export async function POST(req: NextRequest) {
  try {
    // Get messages and session ID from the request
    const { messages, sessionId } = await req.json();
    const ventsService = getVentsService();
    
    // Set session ID if provided
    if (sessionId) {
      ventsService.setSessionId(sessionId);
    } else {
      // Create a new session if needed
      await ventsService.createSession();
    }
    
    // Get the last message from the user
    const lastMessage = messages[messages.length - 1];
    
    // Send the message to ICP
    const response = await ventsService.sendMessage(lastMessage.content);
    
    // Return the response
    return NextResponse.json({
      response: response.text,
      sessionId: ventsService.getSessionId()
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your message' },
      { status: 500 }
    );
  }
}

// Handle loading previous messages
export async function GET(req: NextRequest) {
  try {
    // Get session ID from query params
    const sessionId = req.nextUrl.searchParams.get('sessionId') || '';
    const { messages, sessionId: newSessionId } = await getPreviousMessages(sessionId);
    
    // Convert ICP messages to chat format expected by the template
    const chatMessages = messages.map(msg => ({
      id: msg.timestamp.toString(),
      role: msg.isUser ? 'user' : 'assistant',
      content: msg.text
    }));
    
    return NextResponse.json({
      messages: chatMessages,
      sessionId: newSessionId
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      { error: 'Failed to load chat history' },
      { status: 500 }
    );
  }
}
// lib/vent-service.ts
import { Actor, HttpAgent } from '@dfinity/agent';

// What a message looks like
export interface Message {
  text: string;
  timestamp: bigint;
  isUser: boolean;
}

// What a conversation looks like
export interface Session {
  id: string;
  messages: Message[];
  dominantEmotion: string | null;
  lastActive: bigint;
}

// The class that talks to our ICP backend
export class VentsService {
  private actor: any;
  private sessionId: string | null = null;

  constructor(canisterId: string, host: string = 'https://ic0.app') {
    // Create an agent to talk to the ICP network
    const agent = new HttpAgent({ host });
    
    // Connect to our specific canister
    this.actor = Actor.createActor(this.createInterface(), {
      agent,
      canisterId,
    });
  }

  // This tells the agent what our canister can do
  private createInterface() {
    return ({ IDL }: any) => {
      const SessionId = IDL.Text;
      const Message = IDL.Record({
        'isUser': IDL.Bool,
        'text': IDL.Text,
        'timestamp': IDL.Int,
      });
      const Session = IDL.Record({
        'id': SessionId,
        'lastActive': IDL.Int,
        'dominantEmotion': IDL.Opt(IDL.Text),
        'messages': IDL.Vec(Message),
      });
      const NewSessionResult = IDL.Variant({
        'error': IDL.Text,
        'success': SessionId,
      });
      const SendMessageResult = IDL.Variant({
        'error': IDL.Text,
        'success': Message,
      });
      return IDL.Service({
        'getSession': IDL.Func([SessionId], [IDL.Opt(Session)], ['query']),
        'getSessionHistory': IDL.Func([SessionId], [IDL.Vec(Message)], ['query']),
        'newSession': IDL.Func([], [NewSessionResult], []),
        'sendMessage': IDL.Func([SessionId, IDL.Text], [SendMessageResult], []),
      });
    };
  }

  // Start a new conversation
  async createSession(): Promise<string> {
    try {
      const result: any = await this.actor.newSession();
      
      if ('error' in result) {
        throw new Error(result.error);
      }
      
      this.sessionId = result.success;
      return this.sessionId;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw new Error('Could not start a new session. Please try again later.');
    }
  }

  // Send a message and get a response
  async sendMessage(message: string): Promise<Message> {
    if (!this.sessionId) {
      throw new Error('No active session. Please create a session first.');
    }
    
    try {
      const result: any = await this.actor.sendMessage(this.sessionId, message);
      
      if ('error' in result) {
        throw new Error(result.error);
      }
      
      return {
        text: result.success.text,
        timestamp: result.success.timestamp,
        isUser: result.success.isUser
      };
    } catch (error) {
      console.error('Failed to send message:', error);
      throw new Error('Message could not be sent. Please try again.');
    }
  }

  // Get all messages in a conversation
  async getSessionHistory(): Promise<Message[]> {
    if (!this.sessionId) {
      return [];
    }
    
    try {
      const messages: any[] = await this.actor.getSessionHistory(this.sessionId);
      return messages.map(msg => ({
        text: msg.text,
        timestamp: msg.timestamp,
        isUser: msg.isUser
      }));
    } catch (error) {
      console.error('Failed to get session history:', error);
      return [];
    }
  }

  // Get the current session ID
  getSessionId(): string | null {
    return this.sessionId;
  }

  // Set a session ID manually (for resuming sessions)
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }
}

// Create a single instance to use throughout the app
let ventsServiceInstance: VentsService | null = null;

export function getVentsService() {
  if (!ventsServiceInstance) {
    // Get canister ID from environment variable
    const canisterId = process.env.NEXT_PUBLIC_ICP_CANISTER_ID || 'rrkah-fqaaa-aaaaa-aaaaq-cai';
    ventsServiceInstance = new VentsService(canisterId);
  }
  return ventsServiceInstance;
}
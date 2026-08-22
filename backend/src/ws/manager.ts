import { Server } from 'http';

class ConnectionManager {
  public init(server?: Server) {
    // No-op in serverless mode (Supabase Realtime handles realtime updates)
  }

  public broadcast(eventType: string, data: any) {
    // Safe no-op in serverless mode; Supabase Realtime automatically handles database event streams
  }
}

export const wsManager = new ConnectionManager();

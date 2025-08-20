import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

export interface QBWCSession {
  ticket: string;
  username: string;
  status: 'active' | 'closed';
  createdAt: string;
  lastActivity: string;
  requestsSent: number;
  ttl: number;
}

export class SessionManager {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const client = new DynamoDBClient({});
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.DYNAMODB_TABLE_NAME || 'qbxml-relay-sessions-dev';
  }

  async createSession(username: string): Promise<QBWCSession> {
    const now = new Date();
    const ticket = this.generateTicket();
    
    const session: QBWCSession = {
      ticket,
      username,
      status: 'active',
      createdAt: now.toISOString(),
      lastActivity: now.toISOString(),
      requestsSent: 0,
      ttl: Math.floor(now.getTime() / 1000) + (24 * 60 * 60), // 24 hours TTL
    };

    try {
      await this.docClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: session,
          ConditionExpression: 'attribute_not_exists(ticket)', // Prevent duplicates
        })
      );

      console.log(`Session created successfully: ${ticket} for user: ${username}`);
      return session;

    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error('Failed to create session');
    }
  }

  async getSession(ticket: string): Promise<QBWCSession | null> {
    if (!ticket) {
      return null;
    }

    try {
      const result = await this.docClient.send(
        new GetCommand({
          TableName: this.tableName,
          Key: { ticket },
        })
      );

      if (!result.Item) {
        console.log(`Session not found: ${ticket}`);
        return null;
      }

      const session = result.Item as QBWCSession;

      // Check if session is still active
      if (session.status !== 'active') {
        console.log(`Session is not active: ${ticket}, status: ${session.status}`);
        return null;
      }

      // Check TTL (additional safety check)
      const now = Math.floor(Date.now() / 1000);
      if (session.ttl && session.ttl < now) {
        console.log(`Session expired: ${ticket}`);
        await this.closeSession(ticket); // Cleanup expired session
        return null;
      }

      return session;

    } catch (error) {
      console.error('Error retrieving session:', error);
      return null;
    }
  }

  async updateSessionActivity(ticket: string): Promise<void> {
    try {
      const now = new Date().toISOString();

      await this.docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { ticket },
          UpdateExpression: 'SET lastActivity = :lastActivity, requestsSent = requestsSent + :inc',
          ExpressionAttributeValues: {
            ':lastActivity': now,
            ':inc': 1,
          },
          ConditionExpression: 'attribute_exists(ticket) AND #status = :activeStatus',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':lastActivity': now,
            ':inc': 1,
            ':activeStatus': 'active',
          },
        })
      );

      console.log(`Session activity updated: ${ticket}`);

    } catch (error) {
      console.error('Error updating session activity:', error);
      // Don't throw here - this is not critical
    }
  }

  async closeSession(ticket: string): Promise<void> {
    if (!ticket) {
      return;
    }

    try {
      await this.docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { ticket },
          UpdateExpression: 'SET #status = :closedStatus, lastActivity = :lastActivity',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':closedStatus': 'closed',
            ':lastActivity': new Date().toISOString(),
          },
          ConditionExpression: 'attribute_exists(ticket)',
        })
      );

      console.log(`Session closed: ${ticket}`);

    } catch (error) {
      console.error('Error closing session:', error);
      // Don't throw here - we want to continue cleanup
    }
  }

  async deleteSession(ticket: string): Promise<void> {
    if (!ticket) {
      return;
    }

    try {
      await this.docClient.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { ticket },
        })
      );

      console.log(`Session deleted: ${ticket}`);

    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
    // This method would typically be called by a scheduled Lambda
    // For now, it's just a placeholder for future implementation
    console.log('Cleanup expired sessions - TODO: Implement scan and cleanup logic');
    
    // TODO: Implement DynamoDB scan to find and delete expired sessions
    // This would be useful for sessions that didn't close properly
  }

  private generateTicket(): string {
    // Generate a unique ticket ID
    // Format: {timestamp}-{uuid}
    const timestamp = Date.now().toString(36);
    const uuid = uuidv4().replace(/-/g, '');
    return `${timestamp}-${uuid}`;
  }

  async validateSession(ticket: string): Promise<boolean> {
    const session = await this.getSession(ticket);
    return session !== null;
  }

  async getSessionStats(ticket: string): Promise<{ requestsSent: number; duration: number } | null> {
    const session = await this.getSession(ticket);
    if (!session) {
      return null;
    }

    const createdAt = new Date(session.createdAt);
    const now = new Date();
    const duration = Math.floor((now.getTime() - createdAt.getTime()) / 1000); // seconds

    return {
      requestsSent: session.requestsSent,
      duration,
    };
  }
}
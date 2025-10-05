import type { Express } from "express";
import { storage } from "./storage";
import jwt from "jsonwebtoken";

// Middleware to authenticate JWT token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'komarce-secret-key') as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to validate role hierarchy for secure messaging
const validateMessageHierarchy = (senderRole: string, receiverRole: string): boolean => {
  const validPairs = [
    ['global_admin', 'local_admin'],
    ['local_admin', 'global_admin'],
    ['local_admin', 'merchant'],
    ['merchant', 'local_admin'],
    ['merchant', 'customer'],
    ['customer', 'merchant']
  ];

  return validPairs.some(([sender, receiver]) => 
    senderRole === sender && receiverRole === receiver
  );
};

export function setupChatRoutes(app: Express) {
  
  // Get unread message count for current user
  app.get('/api/chat/unread-count', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      
      // Get all conversations where user is a participant
      const conversations = await storage.getUserConversations(userId, userRole);
      
      let totalUnreadCount = 0;
      for (const conversation of conversations) {
        const unreadCount = await storage.getUnreadMessageCount(conversation.id, userId);
        totalUnreadCount += unreadCount;
      }
      
      res.json({ count: totalUnreadCount });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({ error: 'Failed to get unread count' });
    }
  });

  // Get recent unread messages for notifications
  app.get('/api/chat/unread-messages', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.userId;
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Get recent unread messages
      const unreadMessages = await storage.getRecentUnreadMessages(userId, limit);
      
      res.json(unreadMessages);
    } catch (error) {
      console.error('Get unread messages error:', error);
      res.status(500).json({ error: 'Failed to get unread messages' });
    }
  });

  // Mark messages as read
  app.post('/api/chat/mark-read', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.userId;
      const { conversationId, messageIds } = req.body;
      
      if (conversationId) {
        // Mark all messages in conversation as read
        await storage.markConversationMessagesAsRead(conversationId, userId);
      } else if (messageIds && Array.isArray(messageIds)) {
        // Mark specific messages as read
        for (const messageId of messageIds) {
          await storage.markMessageAsRead(messageId, userId);
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Mark messages as read error:', error);
      res.status(500).json({ error: 'Failed to mark messages as read' });
    }
  });
  
  // Get available users to chat with based on role hierarchy
  app.get('/api/chat/users', authenticateToken, async (req: any, res) => {
    try {
      const currentUserId = req.user.userId;
      const currentUserRole = req.user.role;

      const availableUsers = await storage.getAvailableChatUsers(currentUserId, currentUserRole);
      res.json(availableUsers);
    } catch (error) {
      console.error('Error fetching chat users:', error);
      res.status(500).json({ message: 'Failed to fetch chat users' });
    }
  });

  // Get or create conversation between two users
  app.post('/api/chat/conversation', authenticateToken, async (req: any, res) => {
    try {
      const { receiverId, receiverRole } = req.body;
      const senderId = req.user.userId;
      const senderRole = req.user.role;

      // Validate message hierarchy
      if (!validateMessageHierarchy(senderRole, receiverRole)) {
        return res.status(403).json({ 
          message: 'Unauthorized: Invalid message hierarchy' 
        });
      }

      // Check if conversation already exists
      let conversation = await storage.getConversation(senderId, receiverId);
      
      if (!conversation) {
        // Create new conversation
        conversation = await storage.createConversation({
          participant1Id: senderId,
          participant1Role: senderRole,
          participant2Id: receiverId,
          participant2Role: receiverRole,
          isActive: true
        });
      }

      res.json(conversation);
    } catch (error) {
      console.error('Error creating/fetching conversation:', error);
      res.status(500).json({ message: 'Failed to handle conversation' });
    }
  });

  // Get user's conversations
  app.get('/api/chat/conversations', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;

      const conversations = await storage.getUserConversations(userId, userRole);
      
      // Enrich with participant details
      const enrichedConversations = await Promise.all(
        conversations.map(async (conv) => {
          const otherParticipantId = conv.participant1Id === userId 
            ? conv.participant2Id 
            : conv.participant1Id;
          const otherParticipantRole = conv.participant1Id === userId 
            ? conv.participant2Role 
            : conv.participant1Role;

          const otherUser = await storage.getUser(otherParticipantId);
          
          return {
            ...conv,
            otherParticipant: otherUser ? {
              id: otherUser.id,
              name: `${otherUser.firstName} ${otherUser.lastName}`,
              role: otherParticipantRole,
              country: otherUser.country
            } : null
          };
        })
      );

      res.json(enrichedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  });

  // Get messages for a conversation
  app.get('/api/chat/conversations/:conversationId/messages', authenticateToken, async (req: any, res) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user.userId;

      // Verify user is part of the conversation
      const conversation = await storage.getConversation('', ''); // We'll validate by checking messages
      const messages = await storage.getChatMessages(conversationId);
      
      // Verify user has access to this conversation
      const hasAccess = messages.some(msg => 
        msg.senderId === userId || msg.receiverId === userId
      );

      if (messages.length > 0 && !hasAccess) {
        return res.status(403).json({ message: 'Access denied to this conversation' });
      }

      // Mark messages as read
      await storage.markConversationMessagesAsRead(conversationId, userId);

      res.json(messages);
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  // Send a secure message
  app.post('/api/chat/messages', authenticateToken, async (req: any, res) => {
    try {
      const { conversationId, receiverId, receiverRole, message, messageType = 'text' } = req.body;
      const senderId = req.user.userId;
      const senderRole = req.user.role;

      // Validate message hierarchy
      if (!validateMessageHierarchy(senderRole, receiverRole)) {
        return res.status(403).json({ 
          message: 'Unauthorized: Invalid message hierarchy' 
        });
      }

      // Validate required fields
      if (!conversationId || !receiverId || !message) {
        return res.status(400).json({ 
          message: 'Missing required fields: conversationId, receiverId, message' 
        });
      }

      // Create secure message
      const newMessage = await storage.createSecureChatMessage({
        conversationId,
        senderId,
        senderRole,
        receiverId,
        receiverRole,
        message,
        messageType,
        isEncrypted: true
      });

      res.status(201).json(newMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  // Mark message as read
  app.put('/api/chat/messages/:messageId/read', authenticateToken, async (req: any, res) => {
    try {
      const { messageId } = req.params;
      const userId = req.user.userId;

      // Additional validation could be added here to ensure user can mark this message as read
      await storage.markMessageAsRead(messageId);
      
      res.json({ success: true, message: 'Message marked as read' });
    } catch (error) {
      console.error('Error marking message as read:', error);
      res.status(500).json({ message: 'Failed to mark message as read' });
    }
  });

  // Get unread message counts per conversation
  app.get('/api/chat/unread-counts', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;

      const conversations = await storage.getUserConversations(userId, userRole);
      const unreadCounts: { [conversationId: string]: number } = {};

      for (const conversation of conversations) {
        const messages = await storage.getChatMessages(conversation.id);
        const unreadCount = messages.filter(msg => 
          msg.receiverId === userId && !msg.isRead
        ).length;
        
        unreadCounts[conversation.id] = unreadCount;
      }

      res.json(unreadCounts);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
      res.status(500).json({ message: 'Failed to fetch unread counts' });
    }
  });

}
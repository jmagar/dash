import { z } from 'zod';
import { createRouter, createRouteHandler } from '../../utils/routeUtils';
import { chatService } from '../../services/chat.service';
import { requireAuth } from '../../middleware/auth';

// Validation schemas
const messageSchema = z.object({
  body: z.object({
    content: z.string(),
    type: z.enum(['text', 'code', 'system']),
    metadata: z.record(z.any()).optional()
  })
});

const conversationIdSchema = z.object({
  params: z.object({
    conversationId: z.string()
  })
});

export const router = createRouter();

// Apply authentication to all chat routes
router.use(requireAuth);

// List conversations
router.get('/conversations', createRouteHandler(
  async (req) => await chatService.listConversations(req.user.id),
  { requireAuth: true }
));

// Get conversation by ID
router.get('/conversations/:conversationId', createRouteHandler(
  async (req) => {
    const { conversationId } = req.params;
    return await chatService.getConversation(req.user.id, conversationId);
  },
  {
    requireAuth: true,
    schema: conversationIdSchema
  }
));

// Create new conversation
router.post('/conversations', createRouteHandler(
  async (req) => await chatService.createConversation(req.user.id),
  { requireAuth: true }
));

// Delete conversation
router.delete('/conversations/:conversationId', createRouteHandler(
  async (req) => {
    const { conversationId } = req.params;
    await chatService.deleteConversation(req.user.id, conversationId);
    return { message: 'Conversation deleted successfully' };
  },
  {
    requireAuth: true,
    schema: conversationIdSchema
  }
));

// Send message
router.post('/conversations/:conversationId/messages', createRouteHandler(
  async (req) => {
    const { conversationId } = req.params;
    const messageData = req.body;
    return await chatService.sendMessage(req.user.id, conversationId, messageData);
  },
  {
    requireAuth: true,
    schema: {
      ...conversationIdSchema,
      ...messageSchema
    }
  }
));

// Get messages for conversation
router.get('/conversations/:conversationId/messages', createRouteHandler(
  async (req) => {
    const { conversationId } = req.params;
    return await chatService.getMessages(req.user.id, conversationId);
  },
  {
    requireAuth: true,
    schema: conversationIdSchema
  }
));

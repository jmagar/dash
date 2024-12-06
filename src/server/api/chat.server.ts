import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { chatService } from '../services/chat.service';
import { LoggingManager } from '../managers/LoggingManager';
import { SendMessageDto, ChatSettingsDto, ChatRequestDto } from '../routes/chat/dto/chat.dto';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { AccessTokenPayload, RefreshTokenPayload } from '../../types/auth';
import { ApiError } from '../../types/error';

interface AuthenticatedRequest extends Request {
  user: AccessTokenPayload | RefreshTokenPayload;
}

interface ValidatedRequest extends AuthenticatedRequest {
  validatedBody?: ChatRequestDto;
}

// Create router instance with explicit type
const router: Router = Router();

// Validation middleware
const validateRequest = (async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const requestDto = plainToClass(ChatRequestDto, req.body);
    const errors = await validate(requestDto);
    
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid request format',
        details: errors,
      });
      return;
    }

    // Attach validated DTO to request
    (req as ValidatedRequest).validatedBody = requestDto;
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    LoggingManager.getInstance().error('Request validation failed:', { error: errorMessage });
    
    res.status(400).json({
      success: false,
      error: 'Invalid request format',
    });
  }
}) as RequestHandler;

// Authentication middleware
const requireAuth = ((
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }
  next();
}) as RequestHandler;

// Define route handler
const handleChatRequest = async (
  req: ValidatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.validatedBody) {
      throw new ApiError('Invalid request body', 400);
    }

    // Convert ChatRequestDto to SendMessageDto
    const messageDto = plainToClass(SendMessageDto, {
      content: req.validatedBody.message,
      sessionId: req.validatedBody.sessionId,
      systemPrompt: req.validatedBody.systemMessage,
      modelConfig: req.validatedBody.config,
      stream: req.validatedBody.stream,
    });

    // Create settings DTO from request config
    const settingsDto = plainToClass(ChatSettingsDto, {
      temperature: req.validatedBody.config?.temperature,
      maxTokens: req.validatedBody.config?.maxTokens,
      systemPrompt: req.validatedBody.systemMessage,
    });

    const response = await chatService.chat(messageDto, settingsDto);
    res.json(response);
  } catch (error) {
    let statusCode = 500;
    let errorMessage = 'Failed to process chat message';

    if (error instanceof ApiError) {
      statusCode = error.status;
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    LoggingManager.getInstance().error('Chat API error:', { 
      error: errorMessage,
      statusCode,
      userId: req.user?.userId,
      sessionId: req.validatedBody?.sessionId
    });
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
    });
  }
};

// Register routes
router.post('/chat', 
  requireAuth,
  validateRequest,
  ((req: Request, res: Response) => {
    void handleChatRequest(req as ValidatedRequest, res);
  }) as RequestHandler
);

export default router;

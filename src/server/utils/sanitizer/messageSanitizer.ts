import { JSDOM } from 'jsdom';
import createDOMPurify, { DOMPurifyI, Config } from 'dompurify';
import { marked } from 'marked';
import { LoggingManager } from '../../managers/LoggingManager';

const window = new JSDOM('').window;
const purify: DOMPurifyI = createDOMPurify(window as unknown as Window);

interface SanitizeOptions {
  allowMarkdown?: boolean;
  allowedTags?: string[];
  allowedAttributes?: string[];
}

interface CodeBlock {
  code: string;
  language: string;
}

const defaultOptions: Required<SanitizeOptions> = {
  allowMarkdown: true,
  allowedTags: [
    'p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li',
    'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
  ],
  allowedAttributes: ['href', 'src', 'class', 'target']
};

/**
 * MessageSanitizer provides HTML sanitization and markdown processing capabilities.
 * 
 * Logging Pattern:
 * This class follows the project's standard logging pattern:
 * 1. For singleton classes:
 *    - Store logger as instance property: private logger: LoggingManager
 *    - Initialize in constructor: this.logger = LoggingManager.getInstance()
 *    - Use with structured metadata: this.logger.error(message, { error, ...metadata })
 * 
 * 2. For regular classes:
 *    - Import LoggingManager and use directly: LoggingManager.getInstance().error(...)
 * 
 * 3. Error Logging Best Practices:
 *    - Always include error details: error instanceof Error ? error.message : String(error)
 *    - Add relevant context: { error, componentName, operationName, ...context }
 *    - Use appropriate log levels:
 *      * error: For errors that need attention
 *      * warn: For concerning but non-critical issues
 *      * info: For important operations
 *      * debug: For detailed troubleshooting
 * 
 * Example:
 * ```typescript
 * try {
 *   // operation
 * } catch (error) {
 *   this.logger.error('Operation failed', {
 *     error: error instanceof Error ? error.message : String(error),
 *     context: 'additional info',
 *     operationName: 'what failed'
 *   });
 * }
 * ```
 */
export class MessageSanitizer {
  private static instance: MessageSanitizer;
  private logger: LoggingManager;
  private parser: marked.Parser;
  private lexer: marked.Lexer;

  private constructor() {
    this.logger = LoggingManager.getInstance();
    this.parser = new marked.Parser();
    this.lexer = new marked.Lexer();
  }

  public static getInstance(): MessageSanitizer {
    if (!MessageSanitizer.instance) {
      MessageSanitizer.instance = new MessageSanitizer();
    }
    return MessageSanitizer.instance;
  }

  /**
   * Sanitize content with configurable options
   * @throws {Error} If sanitization fails
   */
  public sanitize(content: string, options: SanitizeOptions = defaultOptions): string {
    try {
      let sanitized = content.trim();

      // Convert markdown if enabled
      if (options.allowMarkdown) {
        const tokens = this.lexer.lex(sanitized);
        sanitized = this.parser.parse(tokens) || '';
      }

      // Sanitize HTML with proper type safety
      const config: Config = {
        ALLOWED_TAGS: options.allowedTags ?? defaultOptions.allowedTags,
        ALLOWED_ATTR: options.allowedAttributes ?? defaultOptions.allowedAttributes,
        RETURN_DOM: false,
        RETURN_TRUSTED_TYPE: false,
        RETURN_DOM_FRAGMENT: false,
        RETURN_DOM_IMPORT: false
      };

      const result = purify.sanitize(sanitized, config);
      return typeof result === 'string' ? result : result.toString();
    } catch (error) {
      this.logger.error('Error sanitizing content', {
        error: error instanceof Error ? error.message : String(error),
        contentPreview: content.slice(0, 100)
      });
      throw error; // Re-throw to let caller handle error
    }
  }

  /**
   * Extract code blocks from content
   * @returns Array of code blocks with language
   */
  public extractCodeBlocks(content: string): CodeBlock[] {
    const codeBlocks: CodeBlock[] = [];
    const regex = /```(\w*)\n([\s\S]*?)```/g;

    let match = regex.exec(content);
    while (match) {
      if (match[1] !== undefined && match[2] !== undefined) {
        const language = match[1] || 'plaintext';
        const code = match[2].trim();
        codeBlocks.push({ language, code });
      }
      match = regex.exec(content);
    }

    return codeBlocks;
  }

  /**
   * Format a response with proper handling of code blocks
   * @throws {Error} If formatting fails
   */
  public formatResponse(content: string): string {
    try {
      // Extract code blocks
      const codeBlocks = this.extractCodeBlocks(content);
      let formattedContent = content;

      // Replace code blocks with placeholders
      codeBlocks.forEach((block, index) => {
        const placeholder = `<!--CODE_BLOCK_${index}-->`;
        formattedContent = formattedContent.replace(
          `\`\`\`${block.language}\n${block.code}\`\`\``,
          placeholder
        );
      });

      // Sanitize non-code content
      formattedContent = this.sanitize(formattedContent);

      // Restore code blocks with proper formatting
      codeBlocks.forEach((block, index) => {
        const placeholder = `<!--CODE_BLOCK_${index}-->`;
        const sanitizedCode = this.sanitize(block.code);
        formattedContent = formattedContent.replace(
          placeholder,
          `<pre><code class="language-${block.language}">${sanitizedCode}</code></pre>`
        );
      });

      return formattedContent;
    } catch (error) {
      this.logger.error('Error formatting response', {
        error: error instanceof Error ? error.message : String(error),
        contentPreview: content.slice(0, 100)
      });
      throw error; // Re-throw to let caller handle error
    }
  }

  // Static convenience methods
  public static sanitize(content: string, options?: SanitizeOptions): string {
    return MessageSanitizer.getInstance().sanitize(content, options);
  }

  public static formatResponse(content: string): string {
    return MessageSanitizer.getInstance().formatResponse(content);
  }

  public static extractCodeBlocks(content: string): CodeBlock[] {
    return MessageSanitizer.getInstance().extractCodeBlocks(content);
  }
}

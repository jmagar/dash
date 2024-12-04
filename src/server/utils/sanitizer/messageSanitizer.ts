import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { logger } from '../logger';
import { LoggingManager } from '../logging/LoggingManager';

const window = new JSDOM('').window;
const purify = DOMPurify(window as unknown as Window);

interface SanitizeOptions {
  allowMarkdown?: boolean;
  allowedTags?: string[];
  allowedAttributes?: string[];
}

const defaultOptions: SanitizeOptions = {
  allowMarkdown: true,
  allowedTags: [
    'p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li',
    'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
  ],
  allowedAttributes: ['href', 'src', 'class', 'target']
};

export class MessageSanitizer {
  /**
   * Sanitize content with configurable options
   */
  static sanitize(content: string, options: SanitizeOptions = defaultOptions): string {
    try {
      let sanitized = content.trim();

      // Convert markdown if enabled
      if (options.allowMarkdown) {
        sanitized = marked(sanitized);
      }

      // Sanitize HTML
      sanitized = purify.sanitize(sanitized, {
        ALLOWED_TAGS: options.allowedTags,
        ALLOWED_ATTR: options.allowedAttributes,
      });

      return sanitized;
    } catch (error) {
      loggerLoggingManager.getInstance().() // Log only first 100 chars for safety
      });
      return ''; // Return empty string on error
    }
  }

  /**
   * Extract code blocks from content
   */
  static extractCodeBlocks(content: string): Array<{ code: string; language: string }> {
    const codeBlocks: Array<{ code: string; language: string }> = [];
    const regex = /```(\w*)\n([\s\S]*?)```/g;

    let match;
    while ((match = regex.exec(content)) !== null) {
      codeBlocks.push({
        language: match[1] || 'plaintext',
        code: match[2].trim()
      });
    }

    return codeBlocks;
  }

  /**
   * Format a response with proper handling of code blocks
   */
  static formatResponse(content: string): string {
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
        formattedContent = formattedContent.replace(
          placeholder,
          `<pre><code class="language-${block.language}">${
            purify.sanitize(block.code)
          }</code></pre>`
        );
      });

      return formattedContent;
    } catch (error) {
      loggerLoggingManager.getInstance().()
      });
      return content; // Return original content on error
    }
  }
}


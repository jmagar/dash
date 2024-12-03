import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

export class MessageSanitizer {
  private static window = new JSDOM('').window;
  private static purify = DOMPurify(MessageSanitizer.window as any);

  // Allowed HTML tags for markdown rendering
  private static allowedTags = [
    'p', 'br', 'b', 'i', 'em', 'strong', 'code', 'pre',
    'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3',
    'h4', 'h5', 'h6', 'a', 'img'
  ];

  static sanitize(content: string): string {
    // First pass: Basic string sanitization
    let sanitized = content.trim();
    
    // Convert markdown to HTML
    sanitized = marked(sanitized);

    // Second pass: HTML sanitization
    sanitized = MessageSanitizer.purify.sanitize(sanitized, {
      ALLOWED_TAGS: MessageSanitizer.allowedTags,
      ALLOWED_ATTR: ['href', 'src', 'class', 'target'],
    });

    return sanitized;
  }

  static extractCodeBlocks(content: string): { code: string, language: string }[] {
    const codeBlocks: { code: string, language: string }[] = [];
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

  static formatResponse(content: string): string {
    // Handle code blocks specially
    const codeBlocks = MessageSanitizer.extractCodeBlocks(content);
    let formattedContent = content;

    // Replace code blocks with properly formatted versions
    codeBlocks.forEach((block, index) => {
      const placeholder = `<!--CODE_BLOCK_${index}-->`;
      formattedContent = formattedContent.replace(
        `\`\`\`${block.language}\n${block.code}\`\`\``,
        placeholder
      );
    });

    // Sanitize the non-code content
    formattedContent = MessageSanitizer.sanitize(formattedContent);

    // Restore code blocks
    codeBlocks.forEach((block, index) => {
      const placeholder = `<!--CODE_BLOCK_${index}-->`;
      formattedContent = formattedContent.replace(
        placeholder,
        `<pre><code class="language-${block.language}">${
          MessageSanitizer.purify.sanitize(block.code)
        }</code></pre>`
      );
    });

    return formattedContent;
  }
}

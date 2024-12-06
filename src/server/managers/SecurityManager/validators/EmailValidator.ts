export class EmailValidator {
  private static readonly EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  static validate(email: string): boolean {
    if (!email) {
      return false;
    }

    // Basic format check
    if (!this.EMAIL_REGEX.test(email)) {
      return false;
    }

    // Additional checks
    const [localPart, domain] = email.split('@');
    
    // Local part length check (1-64 characters)
    if (localPart.length === 0 || localPart.length > 64) {
      return false;
    }

    // Domain length check (1-255 characters)
    if (domain.length === 0 || domain.length > 255) {
      return false;
    }

    // Domain parts length check (1-63 characters each)
    const domainParts = domain.split('.');
    if (domainParts.some(part => part.length === 0 || part.length > 63)) {
      return false;
    }

    return true;
  }

  static sanitize(email: string): string {
    return email.trim().toLowerCase();
  }
}

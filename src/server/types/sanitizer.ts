/**
 * Configuration options for DOMPurify HTML sanitizer
 */
export interface DOMPurifyConfig {
  /** List of HTML tags that are allowed */
  ALLOWED_TAGS?: string[];
  /** List of HTML attributes that are allowed */
  ALLOWED_ATTR?: string[];
  /** Whether to allow data attributes */
  ALLOW_DATA_ATTR?: boolean;
  /** Whether to allow unknown protocols */
  ALLOW_UNKNOWN_PROTOCOLS?: boolean;
  /** Whether to allow HTML forms */
  ALLOW_FORMS?: boolean;
  /** Whether to remove all contents within forbidden tags */
  KEEP_CONTENT?: boolean;
  /** Whether to return a DOM object instead of HTML string */
  RETURN_DOM?: boolean;
  /** Whether to return a DOM fragment instead of HTML string */
  RETURN_DOM_FRAGMENT?: boolean;
  /** Whether to return a document fragment */
  RETURN_DOM_IMPORT?: boolean;
  /** Whether to return trusted types */
  RETURN_TRUSTED_TYPE?: boolean;
  /** Whether to force all attributes to have a closing tag */
  FORCE_BODY?: boolean;
  /** Whether to sanitize DOM nodes */
  SANITIZE_DOM?: boolean;
  /** Whether to allow usage of native template tag */
  ALLOW_TEMPLATES?: boolean;
  /** Whether to allow ARIA attributes */
  ALLOW_ARIA_ATTR?: boolean;
  /** Whether to remove elements with empty contents */
  WHOLE_DOCUMENT?: boolean;
}

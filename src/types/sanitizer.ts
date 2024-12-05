import { Config } from 'dompurify';

export interface DOMPurifyConfig extends Config {
  ALLOWED_TAGS?: string[];
  ALLOWED_ATTR?: string[];
  RETURN_TRUSTED_TYPE?: boolean;
}

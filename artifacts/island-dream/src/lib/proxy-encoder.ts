/**
 * ProxyEncoder - Utility for encoding/decoding obfuscated proxy requests
 * Converts target URLs to base64 encoded format for the /Mathquiz endpoint
 * Makes proxy requests less obvious to casual inspection
 */

export class ProxyEncoder {
  /**
   * Encode a URL for the obfuscated proxy endpoint
   * @param targetUrl - The URL to encode
   * @returns Base64 encoded JSON payload
   */
  static encodeUrl(targetUrl: string): string {
    try {
      const payload = JSON.stringify({ url: targetUrl, timestamp: Date.now() });
      return Buffer.from(payload).toString('base64');
    } catch (error) {
      console.error('Failed to encode URL:', error);
      throw new Error('URL encoding failed');
    }
  }

  /**
   * Decode (server-side use for verification)
   * @param encoded - Base64 encoded payload
   * @returns Decoded URL string
   */
  static decodeUrl(encoded: string): string {
    try {
      const payload = Buffer.from(encoded, 'base64').toString('utf-8');
      const parsed = JSON.parse(payload);
      return parsed.url;
    } catch (error) {
      console.error('Failed to decode URL:', error);
      throw new Error('URL decoding failed');
    }
  }

  /**
   * Create full proxy request URL
   * @param targetUrl - The URL to fetch through proxy
   * @param proxyBaseUrl - Base URL of proxy server
   * @returns Full obfuscated proxy URL
   */
  static createProxyUrl(
    targetUrl: string,
    proxyBaseUrl: string = import.meta.env.VITE_PROXY_BASE || 'http://localhost:3000'
  ): string {
    try {
      const encoded = this.encodeUrl(targetUrl);
      const encodedParam = encodeURIComponent(encoded);
      return `${proxyBaseUrl}/Mathquiz?true=${encodedParam}`;
    } catch (error) {
      console.error('Failed to create proxy URL:', error);
      throw new Error('Proxy URL creation failed');
    }
  }

  /**
   * Validate if a string looks like an encoded payload
   * @param encoded - String to validate
   * @returns True if valid base64 JSON format
   */
  static isValidEncoded(encoded: string): boolean {
    try {
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      return parsed.url && typeof parsed.url === 'string';
    } catch {
      return false;
    }
  }

  /**
   * Extract metadata from encoded payload
   * @param encoded - Base64 encoded payload
   * @returns Object with url and timestamp
   */
  static getMetadata(encoded: string): { url: string; timestamp: number } | null {
    try {
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      return {
        url: parsed.url,
        timestamp: parsed.timestamp || Date.now()
      };
    } catch {
      return null;
    }
  }
}

export default ProxyEncoder;
/**
 * FetchProxy - Wrapper for making requests through the obfuscated proxy
 * Automatically encodes URLs and handles proxy communication
 */

import ProxyEncoder from './proxy-encoder';

export interface FetchProxyOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'PATCH';
  headers?: Record<string, string>;
  body?: string | FormData;
  timeout?: number;
  proxyBaseUrl?: string;
}

export interface FetchProxyResponse {
  ok: boolean;
  status: number;
  statusText: string;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
  blob: () => Promise<Blob>;
  arrayBuffer: () => Promise<ArrayBuffer>;
  headers: Headers;
}

/**
 * Fetch through the obfuscated proxy endpoint
 * @param url - Target URL to fetch
 * @param options - Fetch options
 * @returns Response-like object
 */
export async function fetchProxy(
  url: string,
  options: FetchProxyOptions = {}
): Promise<FetchProxyResponse> {
  try {
    const proxyBaseUrl = options.proxyBaseUrl || import.meta.env.VITE_PROXY_BASE || 'http://localhost:3000';
    
    // Create encoded proxy URL
    const proxyUrl = ProxyEncoder.createProxyUrl(url, proxyBaseUrl);
    
    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method: options.method || 'GET',
      headers: {
        ...options.headers,
      }
    };

    if (options.body) {
      fetchOptions.body = options.body;
    }

    // Set timeout if specified
    const controller = new AbortController();
    const timeout = options.timeout || 30000; // 30 second default
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(proxyUrl, {
        ...fetchOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        text: () => response.text(),
        json: () => response.json(),
        blob: () => response.blob(),
        arrayBuffer: () => response.arrayBuffer(),
        headers: response.headers
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error('FetchProxy error:', error);
    throw new Error(`Proxy request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetch JSON through the proxy
 */
export async function fetchProxyJson<T = unknown>(
  url: string,
  options?: FetchProxyOptions
): Promise<T> {
  const response = await fetchProxy(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

/**
 * Fetch text through the proxy
 */
export async function fetchProxyText(
  url: string,
  options?: FetchProxyOptions
): Promise<string> {
  const response = await fetchProxy(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.text();
}

/**
 * Fetch blob through the proxy
 */
export async function fetchProxyBlob(
  url: string,
  options?: FetchProxyOptions
): Promise<Blob> {
  const response = await fetchProxy(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.blob();
}

export default fetchProxy;
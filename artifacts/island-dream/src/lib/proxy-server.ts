/**
 * Proxy Server Backend
 * Handles obfuscated proxy requests through /Mathquiz endpoint
 * Decodes base64 encoded URLs and fetches content
 */

import express, { Request, Response, Router } from 'express';

const router = Router();

/**
 * Decode base64 payload and extract URL
 */
function decodeProxyRequest(encoded: string): { url: string; timestamp: number } | null {
  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    
    if (!parsed.url || typeof parsed.url !== 'string') {
      return null;
    }
    
    return {
      url: parsed.url,
      timestamp: parsed.timestamp || Date.now()
    };
  } catch (error) {
    console.error('Decode error:', error);
    return null;
  }
}

/**
 * Validate URL to prevent abuse
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    // Allow http and https only
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Main obfuscated proxy endpoint
 * Path: /Mathquiz?true=<base64_encoded_url>
 * 
 * This endpoint appears as "Mathquiz" to casual inspection
 * but actually handles proxied requests
 */
router.get('/Mathquiz', async (req: Request, res: Response) => {
  try {
    const { true: encodedUrl } = req.query;
    
    // Validate input
    if (!encodedUrl || typeof encodedUrl !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Missing or invalid encoded URL parameter'
      });
    }

    // Decode the payload
    const decoded = decodeProxyRequest(encodedUrl);
    
    if (!decoded) {
      return res.status(400).json({ 
        error: 'Invalid encoding',
        message: 'Failed to decode URL payload'
      });
    }

    // Validate the extracted URL
    if (!isValidUrl(decoded.url)) {
      return res.status(400).json({ 
        error: 'Invalid URL',
        message: 'URL must be valid HTTP or HTTPS'
      });
    }

    // Log request (for monitoring)
    console.log(`[PROXY] Request to: ${decoded.url} at ${new Date(decoded.timestamp).toISOString()}`);

    // Fetch the target content
    const fetchResponse = await fetch(decoded.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000 // 10 second timeout
    });

    // Set response headers
    const contentType = fetchResponse.headers.get('content-type') || 'text/html';
    res.set('Content-Type', contentType);
    res.set('X-Proxied-URL', decoded.url);
    
    // Forward status code
    res.status(fetchResponse.status);

    // Stream the response
    const buffer = await fetchResponse.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('[PROXY] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: 'Fetch failed',
      message: errorMessage
    });
  }
});

/**
 * Health check endpoint (verify proxy is running)
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    endpoint: '/Mathquiz'
  });
});

/**
 * Legacy /browse endpoint (for backwards compatibility)
 * Can be deprecated once frontend fully migrates
 */
router.get('/browse', async (req: Request, res: Response) => {
  try {
    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing URL parameter' });
    }

    if (!isValidUrl(url)) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    console.log(`[LEGACY PROXY] Request to: ${url}`);

    const fetchResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const contentType = fetchResponse.headers.get('content-type') || 'text/html';
    res.set('Content-Type', contentType);
    res.status(fetchResponse.status);

    const buffer = await fetchResponse.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('[LEGACY PROXY] Error:', error);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

export default router;
/**
 * React Native Networking Polyfill
 * Fixes DNS resolution issues and improves network reliability
 */

import { Platform } from 'react-native';

// Polyfill for React Native networking issues
export const initializeNetworkingPolyfill = () => {
  console.log('🔧 Initializing React Native networking polyfill...');
  
  // Add DNS resolution timeout
  if (Platform.OS !== 'web') {
    // Set longer timeouts for React Native
    const originalFetch = global.fetch;
    
    global.fetch = async (url: string | URL | Request, options: RequestInit = {}) => {
      const controller = new AbortController();
      
      // Set longer timeout for DNS resolution
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 30000); // 30 seconds instead of default 15
      
      try {
        const response = await originalFetch(url, {
          ...options,
          signal: controller.signal,
          // Add headers to help with DNS resolution
          headers: {
            'User-Agent': 'BitSleuthWallet/1.0',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            ...options.headers,
          },
        });
        
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        
        // Retry with different approach for DNS issues
        if (error instanceof Error && error.message.includes('Unable to resolve host')) {
          console.log('🔄 DNS resolution failed, retrying with different approach...');
          
          // Wait a bit and try again
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            const retryResponse = await originalFetch(url, {
              ...options,
              headers: {
                'User-Agent': 'BitSleuthWallet/1.0',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache',
                ...options.headers,
              },
            });
            return retryResponse;
          } catch (retryError) {
            console.error('❌ Retry also failed:', retryError);
            throw retryError;
          }
        }
        
        throw error;
      }
    };
    
    console.log('✅ React Native networking polyfill initialized');
  }
};

// Alternative fetch implementation using XMLHttpRequest for better reliability
export const reliableFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = 30000; // 30 second timeout
    
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Create a Response-like object
          const response = {
            ok: true,
            status: xhr.status,
            statusText: xhr.statusText,
            headers: new Headers(),
            json: () => Promise.resolve(JSON.parse(xhr.responseText)),
            text: () => Promise.resolve(xhr.responseText),
            arrayBuffer: () => Promise.resolve(xhr.response),
          } as Response;
          
          resolve(response);
        } else if (xhr.status === 0) {
          // Check if it's a DNS resolution error
          const responseText = xhr.responseText || '';
          if (responseText.includes('Unable to resolve host') || responseText.includes('getaddrinfo ENOTFOUND')) {
            reject(new Error('DNS resolution failed - emulator network issue'));
          } else {
            reject(new Error('Network error - request failed'));
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      }
    };
    
    xhr.onerror = () => {
      reject(new Error('Network error - request failed'));
    };
    
    xhr.ontimeout = () => {
      reject(new Error('Request timeout after 30 seconds'));
    };
    
    const method = options.method || 'GET';
    xhr.open(method, url, true);
    
    // Set headers
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (typeof value === 'string') {
          xhr.setRequestHeader(key, value);
        }
      });
    }
    
    // Set default headers
    xhr.setRequestHeader('User-Agent', 'BitSleuthWallet/1.0');
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('Cache-Control', 'no-cache');
    
    // Send request
    if (options.body) {
      xhr.send(options.body as string);
    } else {
      xhr.send();
    }
  });
};

// Test network connectivity with multiple methods
export const testNetworkConnectivity = async (): Promise<boolean> => {
  const testUrls = [
    'https://httpbin.org/get',
    'https://api.github.com',
    'https://www.google.com',
  ];
  
  for (const url of testUrls) {
    try {
      console.log(`🔍 Testing connectivity to ${url}...`);
      
      // Try regular fetch first
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'BitSleuthWallet/1.0',
          },
        });
        
        if (response.ok) {
          console.log(`✅ Connectivity test passed with ${url}`);
          return true;
        }
      } catch (fetchError) {
        console.log(`⚠️ Fetch failed for ${url}, trying XMLHttpRequest...`);
        
        // Fallback to XMLHttpRequest
        try {
          const response = await reliableFetch(url);
          if (response.ok) {
            console.log(`✅ XMLHttpRequest connectivity test passed with ${url}`);
            return true;
          }
        } catch (xhrError) {
          console.log(`❌ XMLHttpRequest also failed for ${url}`);
        }
      }
    } catch (error) {
      console.log(`❌ Connectivity test failed for ${url}:`, error);
      continue;
    }
  }
  
  console.error('❌ All connectivity tests failed');
  return false;
};

export default {
  initializeNetworkingPolyfill,
  reliableFetch,
  testNetworkConnectivity,
};

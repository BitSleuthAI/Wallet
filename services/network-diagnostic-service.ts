/**
 * Network Diagnostic Service
 * Helps diagnose network connectivity issues and provides troubleshooting guidance
 */

import { Platform } from 'react-native';

export interface NetworkDiagnosticResult {
  isConnected: boolean;
  dnsWorking: boolean;
  apiEndpoints: {
    [key: string]: {
      reachable: boolean;
      responseTime?: number;
      error?: string;
    };
  };
  recommendations: string[];
}

export class NetworkDiagnosticService {
  private static instance: NetworkDiagnosticService;

  static getInstance(): NetworkDiagnosticService {
    if (!NetworkDiagnosticService.instance) {
      NetworkDiagnosticService.instance = new NetworkDiagnosticService();
    }
    return NetworkDiagnosticService.instance;
  }

  /**
   * Run comprehensive network diagnostics
   */
  async runDiagnostics(): Promise<NetworkDiagnosticResult> {
    console.log('🔍 Running network diagnostics...');
    
    const result: NetworkDiagnosticResult = {
      isConnected: false,
      dnsWorking: false,
      apiEndpoints: {},
      recommendations: []
    };

    // Test basic connectivity
    result.isConnected = await this.testBasicConnectivity();
    
    // Test DNS resolution
    result.dnsWorking = await this.testDNSResolution();
    
    // Test API endpoints
    result.apiEndpoints = await this.testAPIEndpoints();
    
    // Generate recommendations
    result.recommendations = this.generateRecommendations(result);
    
    console.log('✅ Network diagnostics completed:', result);
    return result;
  }

  /**
   * Test basic internet connectivity
   */
  private async testBasicConnectivity(): Promise<boolean> {
    const testEndpoints = [
      'https://httpbin.org/get',
      'https://api.github.com',
      'https://www.google.com',
      'https://1.1.1.1'
    ];

    for (const endpoint of testEndpoints) {
      try {
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'BitSleuthWallet/1.0',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        if (response.ok || response.status < 500) {
          console.log(`✅ Basic connectivity test passed with ${endpoint} (${responseTime}ms)`);
          return true;
        }

        console.warn(`⚠️ ${endpoint} returned status ${response.status}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`❌ Connectivity test failed for ${endpoint}:`, message);
        continue;
      }
    }

    console.error('❌ All basic connectivity tests failed');
    return false;
  }

  /**
   * Test DNS resolution
   */
  private async testDNSResolution(): Promise<boolean> {
    const testHosts = [
      'google.com',
      'github.com',
      'cloudflare.com',
      'api.coingecko.com',
      'blockstream.info',
      'mempool.space'
    ];

    let successCount = 0;
    
    for (const host of testHosts) {
      try {
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`https://${host}`, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'BitSleuthWallet/1.0',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        if (response.status < 500) {
          console.log(`✅ DNS resolution successful for ${host} (${responseTime}ms)`);
          successCount++;
        } else {
          console.warn(`⚠️ ${host} returned status ${response.status}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        
        if (message.includes('Unable to resolve host') || message.includes('getaddrinfo ENOTFOUND')) {
          console.error(`❌ DNS resolution failed for ${host}:`, message);
        } else {
          console.warn(`⚠️ Connection test failed for ${host}:`, message);
        }
      }
    }

    const dnsWorking = successCount > testHosts.length / 2;
    console.log(`📊 DNS resolution test: ${successCount}/${testHosts.length} hosts resolved`);
    return dnsWorking;
  }

  /**
   * Test API endpoints used by the wallet
   */
  private async testAPIEndpoints(): Promise<{ [key: string]: { reachable: boolean; responseTime?: number; error?: string } }> {
    const endpoints = {
      'CoinGecko': 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
      'Blockchain.info': 'https://blockchain.info/ticker',
      'CoinCap': 'https://api.coincap.io/v2/assets/bitcoin',
      'Blockstream': 'https://blockstream.info/api/blocks/tip/height',
      'Mempool.space': 'https://mempool.space/api/blocks/tip/height',
      'Blockchain.info UTXO': 'https://blockchain.info/unspent?active=bc1qa0098gltyy4dc42dq0c09vmjpaahy2ealuaxnw'
    };

    const results: { [key: string]: { reachable: boolean; responseTime?: number; error?: string } } = {};

    for (const [name, url] of Object.entries(endpoints)) {
      try {
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'BitSleuthWallet/1.0',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        if (response.ok) {
          console.log(`✅ ${name} API test passed (${responseTime}ms)`);
          results[name] = { reachable: true, responseTime };
        } else {
          console.warn(`⚠️ ${name} API returned status ${response.status}`);
          results[name] = { reachable: false, responseTime, error: `HTTP ${response.status}` };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ ${name} API test failed:`, message);
        results[name] = { reachable: false, error: message };
      }
    }

    return results;
  }

  /**
   * Generate troubleshooting recommendations
   */
  private generateRecommendations(result: NetworkDiagnosticResult): string[] {
    const recommendations: string[] = [];

    if (!result.isConnected) {
      recommendations.push('Check your internet connection');
      recommendations.push('Try switching between WiFi and mobile data');
      recommendations.push('Restart your router if using WiFi');
    }

    if (!result.dnsWorking) {
      recommendations.push('DNS resolution is failing - try changing DNS settings');
      recommendations.push('Use 1.1.1.1 or 8.8.8.8 as DNS servers');
      recommendations.push('Restart your device to refresh DNS cache');
    }

    const failedAPIs = Object.entries(result.apiEndpoints)
      .filter(([_, status]) => !status.reachable)
      .map(([name, _]) => name);

    if (failedAPIs.length > 0) {
      recommendations.push(`Some APIs are unreachable: ${failedAPIs.join(', ')}`);
      
      if (failedAPIs.includes('CoinGecko') && failedAPIs.includes('Blockchain.info')) {
        recommendations.push('All price APIs are failing - check if your network blocks cryptocurrency services');
      }
      
      if (failedAPIs.includes('Blockstream') && failedAPIs.includes('Mempool.space')) {
        recommendations.push('All blockchain APIs are failing - check if your network blocks Bitcoin services');
      }
    }

    if (Platform.OS === 'ios') {
      recommendations.push('On iOS: Check if Low Data Mode is enabled');
      recommendations.push('On iOS: Verify VPN settings if using one');
    }

    if (Platform.OS === 'android') {
      recommendations.push('On Android: Check if Data Saver mode is enabled');
      recommendations.push('On Android: Verify VPN settings if using one');
      recommendations.push('On Android: Check if Private DNS is configured');
    }

    if (recommendations.length === 0) {
      recommendations.push('Network appears to be working correctly');
    }

    return recommendations;
  }

  /**
   * Get a user-friendly error message based on diagnostic results
   */
  getErrorMessage(result: NetworkDiagnosticResult): string {
    if (!result.isConnected) {
      return 'No internet connection detected. Please check your network settings and try again.';
    }

    if (!result.dnsWorking) {
      return 'DNS resolution is failing. Please check your internet connection and DNS settings.';
    }

    const failedAPIs = Object.entries(result.apiEndpoints)
      .filter(([_, status]) => !status.reachable)
      .map(([name, _]) => name);

    if (failedAPIs.length > 0) {
      return `Some services are temporarily unavailable: ${failedAPIs.join(', ')}. Please try again later.`;
    }

    return 'Network connectivity appears to be working correctly.';
  }

  /**
   * Quick connectivity check
   */
  async quickCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://httpbin.org/get', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BitSleuthWallet/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok || response.status < 500;
    } catch (error) {
      console.warn('Quick connectivity check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const networkDiagnosticService = NetworkDiagnosticService.getInstance();

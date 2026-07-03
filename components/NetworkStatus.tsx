/**
 * Network Status Component
 * Shows network connectivity status and provides troubleshooting information
 */

import React, { useEffect, useState } from 'react';
import { PressableOpacity } from '@/components/PressableOpacity';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { NetworkDiagnosticResult, networkDiagnosticService } from '../services/network-diagnostic-service';

interface NetworkStatusProps {
  onDiagnosticsComplete?: (result: NetworkDiagnosticResult) => void;
}

export const NetworkStatus: React.FC<NetworkStatusProps> = ({ onDiagnosticsComplete }) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    checkConnectivity();
  }, []);

  const checkConnectivity = async () => {
    try {
      setIsLoading(true);
      setLastError(null);
      
      const connected = await networkDiagnosticService.quickCheck();
      setIsConnected(connected);
      
      if (!connected) {
        setLastError('No internet connection detected');
      }
    } catch (error) {
      console.error('Connectivity check failed:', error);
      setIsConnected(false);
      setLastError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const runFullDiagnostics = async () => {
    try {
      setIsLoading(true);
      setLastError(null);
      
      const result = await networkDiagnosticService.runDiagnostics();
      
      // Show diagnostic results
      const errorMessage = networkDiagnosticService.getErrorMessage(result);
      const recommendations = result.recommendations;
      
      Alert.alert(
        'Network Diagnostics',
        `${errorMessage}\n\nRecommendations:\n${recommendations.map(r => `• ${r}`).join('\n')}`,
        [
          { text: 'OK', style: 'default' },
          { text: 'Retry', style: 'default', onPress: checkConnectivity }
        ]
      );
      
      onDiagnosticsComplete?.(result);
    } catch (error) {
      console.error('Full diagnostics failed:', error);
      Alert.alert('Diagnostics Failed', 'Unable to run network diagnostics. Please check your connection manually.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    if (isLoading) return '#FFA500'; // Orange for loading
    if (isConnected === true) return '#4CAF50'; // Green for connected
    if (isConnected === false) return '#F44336'; // Red for disconnected
    return '#9E9E9E'; // Gray for unknown
  };

  const getStatusText = () => {
    if (isLoading) return 'Checking...';
    if (isConnected === true) return 'Connected';
    if (isConnected === false) return 'Disconnected';
    return 'Unknown';
  };

  const getStatusIcon = () => {
    if (isLoading) return '⟳';
    if (isConnected === true) return '✓';
    if (isConnected === false) return '✗';
    return '?';
  };

  return (
    <View style={styles.container}>
      <View style={[styles.statusBar, { backgroundColor: getStatusColor() }]}>
        <Text style={styles.statusIcon}>{getStatusIcon()}</Text>
        <Text style={styles.statusText}>{getStatusText()}</Text>
        <PressableOpacity 
          style={styles.refreshButton} 
          onPress={checkConnectivity}
          disabled={isLoading}
        >
          <Text style={styles.refreshText}>⟳</Text>
        </PressableOpacity>
      </View>
      
      {lastError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{lastError}</Text>
          <PressableOpacity 
            style={styles.diagnosticsButton} 
            onPress={runFullDiagnostics}
            disabled={isLoading}
          >
            <Text style={styles.diagnosticsText}>Run Diagnostics</Text>
          </PressableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  statusIcon: {
    fontSize: 16,
    color: 'white',
    marginRight: 8,
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  refreshButton: {
    padding: 4,
  },
  refreshText: {
    fontSize: 16,
    color: 'white',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  errorText: {
    fontSize: 14,
    color: '#C62828',
    marginBottom: 8,
  },
  diagnosticsButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  diagnosticsText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default NetworkStatus;

import { AndroidSafeContainer } from '@/components/AndroidSafeContainer';
import { GradientBackground } from '@/components/GradientBackground';
import { useWallet } from '@/hooks/wallet-store';
import { secureAuthService } from '@/services/secure-auth-service';
import { router, Stack } from 'expo-router';
import { AlertTriangle, ArrowLeft, CheckCircle, Lock, Shield, TestTube } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface MFATestResult {
    step: string;
    success: boolean;
    message: string;
    details?: string;
}

export default function MFATestScreen() {
    const { theme } = useWallet();
    const [testResults, setTestResults] = useState<MFATestResult[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    const handleBack = () => {
        router.back();
    };

    const runMFATests = async () => {
        setIsRunning(true);
        setTestResults([]);
        
        const results: MFATestResult[] = [];
        
        try {
            // Test 1: Check MFA configuration
            console.log('🧪 Test 1: Checking MFA configuration...');
            const mfaConfig = await secureAuthService.verifyMFAConfiguration();
            results.push({
                step: 'MFA Configuration Check',
                success: mfaConfig.isConfigured,
                message: mfaConfig.message,
                details: `Biometric: ${mfaConfig.hasBiometric}, Security Key: ${mfaConfig.hasSecurityKey}, Total Factors: ${mfaConfig.totalFactors}`
            });

            // Test 2: Simulate transaction authentication for small amount
            console.log('🧪 Test 2: Testing transaction authentication (0.001 BTC)...');
            try {
                const smallAmountAuth = await secureAuthService.authenticateForTransaction(0.001, false);
                results.push({
                    step: 'Small Transaction Auth (0.001 BTC)',
                    success: smallAmountAuth,
                    message: smallAmountAuth ? 'Authentication successful' : 'Authentication failed (expected if MFA enabled)',
                    details: 'Small amount should trigger standard auth flow'
                });
            } catch (error) {
                results.push({
                    step: 'Small Transaction Auth (0.001 BTC)',
                    success: false,
                    message: 'Authentication failed with error',
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }

            // Test 3: Simulate transaction authentication for large amount
            console.log('🧪 Test 3: Testing transaction authentication (0.1 BTC)...');
            try {
                const largeAmountAuth = await secureAuthService.authenticateForTransaction(0.1, true);
                results.push({
                    step: 'Large Transaction Auth (0.1 BTC)',
                    success: largeAmountAuth,
                    message: largeAmountAuth ? 'Enhanced authentication successful' : 'Enhanced authentication failed (expected if MFA required)',
                    details: 'Large amount should trigger enhanced auth with MFA'
                });
            } catch (error) {
                results.push({
                    step: 'Large Transaction Auth (0.1 BTC)',
                    success: false,
                    message: 'Enhanced authentication failed with error',
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }

        } catch (error) {
            console.error('❌ MFA test suite error:', error);
            results.push({
                step: 'Test Suite Execution',
                success: false,
                message: 'Test suite failed to execute',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }

        setTestResults(results);
        setIsRunning(false);
    };

    const TestResultItem = ({ result }: { result: MFATestResult }) => (
        <View style={[styles.testResultItem, { 
            backgroundColor: theme.colors.surface,
            borderLeftColor: result.success ? theme.colors.success || '#10B981' : theme.colors.error || '#EF4444'
        }]}>
            <View style={styles.testResultHeader}>
                <View style={[styles.testResultIcon, { 
                    backgroundColor: result.success ? theme.colors.success + '20' : theme.colors.error + '20' 
                }]}>
                    {result.success ? (
                        <CheckCircle color={theme.colors.success || '#10B981'} size={20} />
                    ) : (
                        <AlertTriangle color={theme.colors.error || '#EF4444'} size={20} />
                    )}
                </View>
                <Text style={[styles.testResultStep, { color: theme.colors.text }]}>
                    {result.step}
                </Text>
            </View>
            <Text style={[styles.testResultMessage, { color: theme.colors.textSecondary }]}>
                {result.message}
            </Text>
            {result.details && (
                <Text style={[styles.testResultDetails, { color: theme.colors.textSecondary }]}>
                    Details: {result.details}
                </Text>
            )}
        </View>
    );

    return (
        <GradientBackground theme={theme} variant="primary" direction="vertical">
            <AndroidSafeContainer style={styles.container}>
                <Stack.Screen 
                    options={{ 
                        headerShown: false,
                    }} 
                />
                
                {/* Custom Header */}
                <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleBack}
                        testID="back-button"
                    >
                        <ArrowLeft size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                        MFA Enforcement Test
                    </Text>
                    <View style={styles.headerSpacer} />
                </View>
                
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    {/* Test Info Card */}
                    <View style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
                        <View style={styles.infoHeader}>
                            <TestTube color={theme.colors.primary} size={24} />
                            <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
                                MFA Enforcement Test Suite
                            </Text>
                        </View>
                        
                        <Text style={[styles.infoDescription, { color: theme.colors.textSecondary }]}>
                            This test suite verifies that Multi-Factor Authentication (MFA) is properly enforced 
                            during transaction authentication. It checks various scenarios to ensure security 
                            settings are respected.
                        </Text>
                        
                        <View style={styles.testSteps}>
                            <Text style={[styles.testStepTitle, { color: theme.colors.text }]}>
                                Test Steps:
                            </Text>
                            <Text style={[styles.testStepItem, { color: theme.colors.textSecondary }]}>
                                1. Configuration validation
                            </Text>
                            <Text style={[styles.testStepItem, { color: theme.colors.textSecondary }]}>
                                2. Small transaction auth (standard)
                            </Text>
                            <Text style={[styles.testStepItem, { color: theme.colors.textSecondary }]}>
                                3. Large transaction auth (enhanced)
                            </Text>
                        </View>
                    </View>

                    {/* Test Results */}
                    {testResults.length > 0 && (
                        <View style={styles.resultsSection}>
                            <View style={styles.resultsHeader}>
                                <Shield color={theme.colors.primary} size={20} />
                                <Text style={[styles.resultsTitle, { color: theme.colors.text }]}>
                                    Test Results
                                </Text>
                            </View>
                            
                            <View style={styles.resultsStats}>
                                <View style={styles.statItem}>
                                    <Text style={[styles.statNumber, { color: theme.colors.success || '#10B981' }]}>
                                        {testResults.filter(r => r.success).length}
                                    </Text>
                                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Passed</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={[styles.statNumber, { color: theme.colors.error || '#EF4444' }]}>
                                        {testResults.filter(r => !r.success).length}
                                    </Text>
                                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Failed</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
                                        {testResults.length}
                                    </Text>
                                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total</Text>
                                </View>
                            </View>
                            
                            {testResults.map((result, index) => (
                                <TestResultItem key={index} result={result} />
                            ))}
                        </View>
                    )}

                    {/* Run Test Button */}
                    <TouchableOpacity
                        style={[
                            styles.runTestButton,
                            { 
                                backgroundColor: isRunning ? theme.colors.textSecondary + '40' : theme.colors.primary,
                                opacity: isRunning ? 0.6 : 1
                            }
                        ]}
                        onPress={runMFATests}
                        disabled={isRunning}
                    >
                        <TestTube color="white" size={20} />
                        <Text style={styles.runTestButtonText}>
                            {isRunning ? 'Running Tests...' : 'Run MFA Enforcement Tests'}
                        </Text>
                    </TouchableOpacity>

                    {/* MFA Status Info */}
                    <View style={[styles.statusCard, { backgroundColor: theme.colors.surface }]}>
                        <View style={styles.statusHeader}>
                            <Lock color={theme.colors.primary} size={20} />
                            <Text style={[styles.statusTitle, { color: theme.colors.text }]}>
                                Multi-Factor Authentication Status
                            </Text>
                        </View>
                        
                        <Text style={[styles.statusDescription, { color: theme.colors.textSecondary }]}>
                            Multi-factor authentication enforces multiple verification steps:
                        </Text>
                        
                        <View style={styles.statusFeatures}>
                            <Text style={[styles.statusFeature, { color: theme.colors.textSecondary }]}>
                                • Biometric authentication (required)
                            </Text>
                            <Text style={[styles.statusFeature, { color: theme.colors.textSecondary }]}>
                                • Security key verification (if configured)
                            </Text>
                            <Text style={[styles.statusFeature, { color: theme.colors.textSecondary }]}>
                                • Transaction amount consideration
                            </Text>
                            <Text style={[styles.statusFeature, { color: theme.colors.textSecondary }]}>
                                • Real-time security settings validation
                            </Text>
                        </View>
                    </View>

                    <View style={styles.bottomSpacing} />
                </ScrollView>
            </AndroidSafeContainer>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
        marginRight: 32,
    },
    headerSpacer: {
        width: 32,
    },
    scrollView: {
        flex: 1,
    },
    infoCard: {
        margin: 20,
        padding: 24,
        borderRadius: 16,
        marginBottom: 20,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    infoTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginLeft: 8,
    },
    infoDescription: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 16,
    },
    testSteps: {
        marginTop: 8,
    },
    testStepTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    testStepItem: {
        fontSize: 14,
        marginBottom: 4,
    },
    resultsSection: {
        marginHorizontal: 20,
        marginBottom: 24,
    },
    resultsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    resultsTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 8,
    },
    resultsStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
        paddingVertical: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    testResultItem: {
        marginBottom: 12,
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    testResultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    testResultIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    testResultStep: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    testResultMessage: {
        fontSize: 14,
        marginBottom: 4,
    },
    testResultDetails: {
        fontSize: 12,
        fontStyle: 'italic',
    },
    runTestButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 20,
        marginBottom: 20,
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    runTestButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    statusCard: {
        margin: 20,
        padding: 24,
        borderRadius: 16,
        marginBottom: 20,
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 8,
    },
    statusDescription: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 16,
    },
    statusFeatures: {
        marginTop: 8,
    },
    statusFeature: {
        fontSize: 14,
        marginBottom: 8,
    },
    bottomSpacing: {
        height: 40,
    },
});

import { platformStyles } from '@/constants/themes';
import { PressableOpacity } from '@/components/PressableOpacity';
import { useWallet } from '@/hooks/wallet-store';
import { Mail, X } from 'lucide-react-native';
import React from 'react';
import { Linking, Modal, Platform, Text, View } from 'react-native';

interface FeedbackPopupProps {
  visible: boolean;
  onDismiss: () => void;
  onSubmitFeedback?: () => void;
}

export default function FeedbackPopup({ visible, onDismiss, onSubmitFeedback }: FeedbackPopupProps) {
  const walletContext = useWallet();
  
  // Safety check: if context is not available yet, don't render
  if (!walletContext) {
    return null;
  }
  
  const { theme } = walletContext;

  const handleSubmitFeedback = async () => {
    const email = 'feedback@bitsleuth.ai';
    const subject = 'BitSleuth Wallet Feedback';
    const body = 'Hi BitSleuth team,\n\nI would like to share my feedback about the wallet app:\n\n';
    
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    try {
      const supported = await Linking.canOpenURL(mailtoUrl);
      if (supported) {
        await Linking.openURL(mailtoUrl);
        // Call the callback to mark feedback as submitted
        onSubmitFeedback?.();
      } else {
        // Fallback for web or if no email client is available
        if (Platform.OS === 'web') {
          window.open(mailtoUrl, '_blank');
          onSubmitFeedback?.();
        }
      }
    } catch (error) {
      console.warn('Failed to open email client:', error);
    }
    
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}>
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 400,
          ...platformStyles.cardShadow,
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: theme.colors.text,
            }}>
              Share Your Feedback
            </Text>
            <PressableOpacity
              onPress={onDismiss}
              style={{
                padding: 4,
              }}
            >
              <X size={24} color={theme.colors.textSecondary} />
            </PressableOpacity>
          </View>

          {/* Content */}
          <Text style={{
            fontSize: 16,
            color: theme.colors.textSecondary,
            lineHeight: 24,
            marginBottom: 24,
          }}>
            We&apos;d love to hear about your experience with BitSleuth Wallet! Your feedback helps us improve the app.
          </Text>

          {/* Buttons */}
          <View style={{
            flexDirection: 'row',
            gap: 12,
          }}>
            <PressableOpacity
              onPress={onDismiss}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: theme.colors.background,
                borderWidth: 1,
                borderColor: theme.colors.border,
                alignItems: 'center',
              }}
            >
              <Text style={{
                fontSize: 16,
                fontWeight: '500',
                color: theme.colors.textSecondary,
              }}>
                Maybe Later
              </Text>
            </PressableOpacity>

            <PressableOpacity
              onPress={handleSubmitFeedback}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: theme.colors.primary,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Mail size={18} color="white" />
              <Text style={{
                fontSize: 16,
                fontWeight: '500',
                color: 'white',
              }}>
                Send Feedback
              </Text>
            </PressableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
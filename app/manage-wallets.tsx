import { AndroidSafeContainer } from '@/components/AndroidSafeContainer';
import { PressableOpacity } from '@/components/PressableOpacity';
import { GradientBackground } from '@/components/GradientBackground';
import { platformStyles } from '@/constants/themes';
import { WALLET_COLOR_PALETTE, getWalletGradient } from '@/constants/wallet-colors';
import { useAutoLock } from '@/hooks/auto-lock-store';
import { useTheme } from '@/hooks/theme-store';
import { useWalletActions, useWallets } from '@/hooks/wallet-contexts';
import { getWalletTypeDisplayName } from '@/types/wallet';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import {
    ArrowLeft,
    Check,
    Edit3,
    Plus,
    Trash2,
    X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

export default function ManageWalletsScreen() {
  const { hasPin } = useAutoLock();
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingWallet, setEditingWallet] = useState<any>(null);
  const [editName, setEditName] = useState<string>('');
  const [editColor, setEditColor] = useState<string>('#8B5CF6');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const { theme } = useTheme();
  const { wallets } = useWallets();
  const { editWallet, deleteWallet } = useWalletActions();

  const handleEditWallet = (wallet: any) => {
    setEditingWallet(wallet);
    setEditName(wallet.name);
    setEditColor(wallet.color || '#8B5CF6');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingWallet || !editName.trim() || !editWallet) return;

    try {
      await editWallet(editingWallet.id, editName.trim(), editColor);
      setShowEditModal(false);
      setEditingWallet(null);
      setEditName('');
    } catch (error) {
      console.error('Error updating wallet:', error);
      Alert.alert('Error', 'Failed to update wallet name');
    }
  };

  const handleDeleteWallet = async (wallet: any) => {
    if (!wallet || !deleteWallet) {
      Alert.alert('Error', 'Unable to delete wallet at this time.');
      return;
    }

    if (wallets.length <= 1) {
      Alert.alert(
        'Cannot Delete',
        'You must have at least one wallet. Create another wallet before deleting this one.'
      );
      return;
    }

    Alert.alert(
      'Delete Wallet',
      `Are you sure you want to delete "${wallet.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              console.log('🗑️ Starting wallet deletion:', wallet.id, wallet.name);
              
              // Wait for deletion to complete
              await deleteWallet(wallet.id);
              
              console.log('✅ Wallet deleted successfully');
              
              // Give time for state to settle before any navigation
              setTimeout(() => {
                setIsDeleting(false);
              }, 300);
              
            } catch (error) {
              console.error('❌ Error deleting wallet:', error);
              setIsDeleting(false);
              Alert.alert('Error', 'Failed to delete wallet. Please try again.');
            }
          },
        },
      ]
    );
  };

  const WalletItem = ({ wallet }: { wallet: any }) => (
    <View style={[styles.walletItem, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.walletInfo}>
        <LinearGradient
          colors={getWalletGradient(wallet.color || theme.colors.primary)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.walletColorIndicator}
        />
        <View style={styles.walletDetails}>
          <Text style={[styles.walletName, { color: theme.colors.text }]}>
            {wallet.name}
          </Text>
          <Text style={[styles.walletType, { color: theme.colors.textSecondary }]}>
            {getWalletTypeDisplayName(wallet.type)}
          </Text>
        </View>
      </View>
      <View style={styles.walletActions}>
        <PressableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.primary + '20' }]}
          onPress={() => handleEditWallet(wallet)}
          disabled={isDeleting}
        >
          <Edit3 color={theme.colors.primary} size={18} />
        </PressableOpacity>
        <PressableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.error + '20' }]}
          onPress={() => handleDeleteWallet(wallet)}
          disabled={isDeleting || wallets.length <= 1}
        >
          <Trash2 
            color={wallets.length <= 1 ? theme.colors.textSecondary : theme.colors.error} 
            size={18} 
          />
        </PressableOpacity>
      </View>
    </View>
  );

  const ColorPicker = () => (
    <View style={styles.colorPicker}>
      <Text style={[styles.colorPickerLabel, { color: theme.colors.text }]}>Color</Text>
      <View style={styles.colorOptions}>
        {WALLET_COLOR_PALETTE.map((colorOption) => (
          <PressableOpacity
            key={colorOption.id}
            style={styles.colorOptionContainer}
            onPress={() => setEditColor(colorOption.base)}
          >
            <LinearGradient
              colors={colorOption.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.colorOption}
            >
              {editColor === colorOption.base && (
                <Check color="white" size={16} />
              )}
            </LinearGradient>
          </PressableOpacity>
        ))}
      </View>
    </View>
  );

  const handleBack = () => {
    router.back();
  };

  return (
    <GradientBackground theme={theme} variant="primary" direction="vertical">
      <Stack.Screen 
        options={{ 
          headerShown: false,
        }} 
      />
      
      <AndroidSafeContainer style={styles.container}>
        {/* Custom Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <PressableOpacity
            style={styles.backButton}
            onPress={handleBack}
            testID="back-button"
          >
            <ArrowLeft size={24} color={theme.colors.text} />
          </PressableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Manage Wallets
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <ScrollView style={styles.scrollView}>
          <View style={styles.walletsList}>
            {wallets.map((wallet) => (
              <WalletItem key={wallet.id} wallet={wallet} />
            ))}
          </View>
        </ScrollView>

      <View style={styles.bottomContainer}>
        <PressableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => {
            if (hasPin) {
              // If PIN exists, go to PIN verification first
              router.push('/pin-verification');
            } else {
              // If no PIN exists, go directly to wallet setup
              router.push('/wallet-setup');
            }
          }}
        >
          <Plus color="white" size={20} />
          <Text style={styles.addButtonText}>Add Wallet</Text>
        </PressableOpacity>
      </View>

      {/* Edit Wallet Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Wallet</Text>
              <PressableOpacity
                onPress={() => setShowEditModal(false)}
                style={styles.modalCloseButton}
              >
                <X color={theme.colors.textSecondary} size={24} />
              </PressableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Wallet Name</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter wallet name"
                  placeholderTextColor={theme.colors.textSecondary}
                  maxLength={30}
                  underlineColorAndroid="transparent"
                />
              </View>

              <ColorPicker />
            </View>

            <View style={styles.modalActions}>
              <PressableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.border }]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </PressableOpacity>
              <PressableOpacity
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: editName.trim() ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={handleSaveEdit}
                disabled={!editName.trim()}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    {
                      color: editName.trim() ? 'white' : theme.colors.textSecondary,
                    },
                  ]}
                >
                  Save
                </Text>
              </PressableOpacity>
            </View>
          </View>
      </Modal>
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
  walletsList: {
    padding: 20,
    paddingTop: 40,
  },
  walletItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  walletColorIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 16,
  },
  walletDetails: {
    flex: 1,
  },
  walletName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  walletType: {
    fontSize: 14,
  },
  walletActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  colorPicker: {
    marginBottom: 20,
  },
  colorPickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOptionContainer: {
    ...platformStyles.shadow,
    borderRadius: 20,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: 'white',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

});
import { useWallet } from '@/hooks/wallet-store';
import { Wallet } from '@/types/wallet';
import { Check, ChevronDown } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface WalletSelectorProps {
  label: string;
  onWalletChange?: (wallet: Wallet) => void;
}

export default function WalletSelector({ label, onWalletChange }: WalletSelectorProps) {
  const { wallets, currentWallet, switchWallet, theme } = useWallet();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleWalletSelect = (wallet: Wallet) => {
    switchWallet(wallet.id);
    onWalletChange?.(wallet);
    setIsModalVisible(false);
  };

  const getWalletInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const renderWalletItem = ({ item }: { item: Wallet }) => {
    const isSelected = item.id === currentWallet?.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.walletItem,
          {
            backgroundColor: isSelected ? theme.colors.primary + '20' : 'transparent',
            borderColor: theme.colors.border,
          }
        ]}
        onPress={() => handleWalletSelect(item)}
      >
        <View style={styles.walletItemContent}>
          <View style={[styles.walletAvatar, { backgroundColor: item.color }]}>
            <Text style={styles.walletAvatarText}>
              {getWalletInitial(item.name)}
            </Text>
          </View>
          <View style={styles.walletInfo}>
            <Text style={[styles.walletItemName, { color: theme.colors.text }]}>
              {item.name}
            </Text>
            <Text style={[styles.walletItemBalance, { color: theme.colors.textSecondary }]}>
              {(() => {
                const balance = item.balance?.toFixed(8) || '0.00000000';
                return `${balance} BTC`;
              })()}
            </Text>
          </View>
        </View>
        {isSelected && (
          <Check color={theme.colors.primary} size={20} />
        )}
      </TouchableOpacity>
    );
  };

  if (!currentWallet) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
        {label}
      </Text>
      
      <TouchableOpacity
        style={[
          styles.selector,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          }
        ]}
        onPress={() => setIsModalVisible(true)}
      >
        <View style={styles.selectedWallet}>
          <View style={[styles.walletAvatar, { backgroundColor: currentWallet.color }]}>
            <Text style={styles.walletAvatarText}>
              {getWalletInitial(currentWallet.name)}
            </Text>
          </View>
          <Text style={[styles.selectedWalletName, { color: theme.colors.text }]}>
            {currentWallet.name}
          </Text>
        </View>
        <ChevronDown color={theme.colors.textSecondary} size={20} />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <SafeAreaView style={[styles.modal, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Select Wallet
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={[styles.closeButtonText, { color: theme.colors.primary }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={wallets}
            renderItem={renderWalletItem}
            keyExtractor={(item) => item.id}
            style={styles.walletList}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectedWallet: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  walletAvatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedWalletName: {
    fontSize: 16,
    fontWeight: '500',
  },
  modal: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  walletList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  walletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginVertical: 4,
    borderWidth: 1,
  },
  walletItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  walletInfo: {
    flex: 1,
  },
  walletItemName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  walletItemBalance: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
});
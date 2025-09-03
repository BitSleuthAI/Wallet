import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  RefreshControl,
  Switch,
  Platform,
  Pressable,
} from 'react-native';
import { Stack, router } from 'expo-router';
import {
  Coins,
  Filter,
  Snowflake,
  CheckCircle,
  Circle,
  Info,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { useWallet } from '@/hooks/wallet-store';
import { getAddressUTXOs } from '@/services/bitcoin-service';
import type { UTXO } from '@/types/wallet';
import { GradientBackground } from '@/components/GradientBackground';

type SortOption = 'value' | 'confirmations' | 'age' | 'address';
type FilterOption = 'all' | 'confirmed' | 'unconfirmed' | 'frozen' | 'unfrozen';

export default function CoinControlScreen() {
  const { theme, currentWallet, coinControl } = useWallet();
  const [utxos, setUtxos] = useState<UTXO[]>([]);
  const [selectedUtxos, setSelectedUtxos] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<SortOption>('value');
  const [sortAscending, setSortAscending] = useState<boolean>(false);
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [hideSmallUtxos, setHideSmallUtxos] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadUtxos = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!currentWallet) {
        setUtxos([]);
        return;
      }
      const all: UTXO[] = [];
      for (const addr of currentWallet.addresses) {
        try {
          const list = await getAddressUTXOs(addr);
          for (const u of list) {
            all.push({ ...u, address: addr, frozen: coinControl.isFrozen(`${u.txid}:${u.vout}`) });
          }
        } catch (e) {
          console.warn('Failed to load UTXOs for address', addr, e);
        }
      }
      setUtxos(all);
      const preSelected = new Set(coinControl.getSelectedUtxoIds());
      setSelectedUtxos(preSelected);
    } catch (error) {
      console.error('Error loading UTXOs:', error);
      Alert.alert('Error', 'Failed to load UTXOs');
    } finally {
      setIsLoading(false);
    }
  }, [currentWallet, coinControl]);

  useEffect(() => {
    loadUtxos();
  }, [loadUtxos]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUtxos();
    setRefreshing(false);
  };

  const filteredAndSortedUtxos = useMemo(() => {
    let filtered = utxos.filter(utxo => {
      if (hideSmallUtxos && utxo.value < 1000000) return false; // Hide UTXOs < 0.01 BTC
      
      switch (filterBy) {
        case 'confirmed':
          return utxo.status.confirmed;
        case 'unconfirmed':
          return !utxo.status.confirmed;
        case 'frozen':
          return utxo.frozen;
        case 'unfrozen':
          return !utxo.frozen;
        default:
          return true;
      }
    });

    return filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'value':
          comparison = a.value - b.value;
          break;
        case 'confirmations':
          comparison = (a.confirmations || 0) - (b.confirmations || 0);
          break;
        case 'age':
          const aTime = a.status.block_time || 0;
          const bTime = b.status.block_time || 0;
          comparison = aTime - bTime;
          break;
        case 'address':
          comparison = (a.address || '').localeCompare(b.address || '');
          break;
      }
      
      return sortAscending ? comparison : -comparison;
    });
  }, [utxos, sortBy, sortAscending, filterBy, hideSmallUtxos]);

  const toggleUtxoSelection = (utxoId: string) => {
    const newSelected = new Set(selectedUtxos);
    if (newSelected.has(utxoId)) {
      newSelected.delete(utxoId);
    } else {
      newSelected.add(utxoId);
    }
    setSelectedUtxos(newSelected);
  };

  const toggleUtxoFreeze = (utxoId: string) => {
    coinControl.toggleFreeze(utxoId);
    setUtxos(prev => prev.map(utxo => {
      if (`${utxo.txid}:${utxo.vout}` === utxoId) {
        return { ...utxo, frozen: !utxo.frozen };
      }
      return utxo;
    }));
  };

  const selectAllUtxos = () => {
    const allIds = filteredAndSortedUtxos.map(utxo => `${utxo.txid}:${utxo.vout}`);
    setSelectedUtxos(new Set(allIds));
  };

  const deselectAllUtxos = () => {
    setSelectedUtxos(new Set());
  };

  const freezeSelectedUtxos = () => {
    setUtxos(prev => prev.map(utxo => {
      const utxoId = `${utxo.txid}:${utxo.vout}`;
      if (selectedUtxos.has(utxoId)) {
        return { ...utxo, frozen: true };
      }
      return utxo;
    }));
    setSelectedUtxos(new Set());
  };

  const unfreezeSelectedUtxos = () => {
    setUtxos(prev => prev.map(utxo => {
      const utxoId = `${utxo.txid}:${utxo.vout}`;
      if (selectedUtxos.has(utxoId)) {
        return { ...utxo, frozen: false };
      }
      return utxo;
    }));
    setSelectedUtxos(new Set());
  };

  const formatBTC = (satoshis: number): string => {
    return (satoshis / 100000000).toFixed(8);
  };

  const formatAddress = (address: string): string => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const formatTxId = (txid: string): string => {
    return `${txid.slice(0, 8)}...${txid.slice(-8)}`;
  };

  const getStatusColor = (utxo: UTXO) => {
    if (utxo.frozen) return theme.colors.secondary;
    if (!utxo.status.confirmed) return '#FFA500';
    return theme.colors.success;
  };

  const getStatusText = (utxo: UTXO) => {
    if (utxo.frozen) return 'Frozen';
    if (!utxo.status.confirmed) return 'Unconfirmed';
    return `${utxo.confirmations} conf`;
  };

  const totalSelectedValue = useMemo(() => {
    return filteredAndSortedUtxos
      .filter(utxo => selectedUtxos.has(`${utxo.txid}:${utxo.vout}`))
      .reduce((sum, utxo) => sum + utxo.value, 0);
  }, [filteredAndSortedUtxos, selectedUtxos]);

  const totalValue = useMemo(() => {
    return filteredAndSortedUtxos.reduce((sum, utxo) => sum + utxo.value, 0);
  }, [filteredAndSortedUtxos]);

  const UtxoItem = ({ utxo }: { utxo: UTXO }) => {
    const utxoId = `${utxo.txid}:${utxo.vout}`;
    const isSelected = selectedUtxos.has(utxoId);
    
    return (
      <TouchableOpacity
        style={[
          styles.utxoItem,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
        onPress={() => toggleUtxoSelection(utxoId)}
        testID={`utxo-item-${utxoId}`}
      >
        <View style={styles.utxoHeader}>
          <View style={styles.utxoInfo}>
            <View style={styles.utxoTitleRow}>
              <Text style={[styles.utxoValue, { color: theme.colors.text }]}>
                {formatBTC(utxo.value)} BTC
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(utxo) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(utxo) }]}>
                  {getStatusText(utxo)}
                </Text>
              </View>
            </View>
            
            <Text style={[styles.utxoTxId, { color: theme.colors.textSecondary }]}>
              {formatTxId(utxo.txid)}:{utxo.vout}
            </Text>
            
            <Text style={[styles.utxoAddress, { color: theme.colors.textSecondary }]}>
              {formatAddress(utxo.address || '')}
            </Text>
            
            {utxo.label && (
              <Text style={[styles.utxoLabel, { color: theme.colors.primary }]}>
                {utxo.label}
              </Text>
            )}
          </View>
          
          <View style={styles.utxoActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.border }]}
              onPress={() => toggleUtxoFreeze(utxoId)}
            >
              {utxo.frozen ? (
                <Snowflake color={theme.colors.secondary} size={16} />
              ) : (
                <Circle color={theme.colors.textSecondary} size={16} />
              )}
            </TouchableOpacity>
            
            <View style={styles.selectionIndicator}>
              {isSelected ? (
                <CheckCircle color={theme.colors.primary} size={20} />
              ) : (
                <Circle color={theme.colors.textSecondary} size={20} />
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const FilterControls = () => (
    <View style={[styles.filterContainer, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.filterRow}>
        <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Sort by:</Text>
        <TouchableOpacity
          style={[styles.filterButton, { borderColor: theme.colors.border }]}
          onPress={() => {
            if (sortBy === 'value') {
              setSortAscending(!sortAscending);
            } else {
              setSortBy('value');
              setSortAscending(false);
            }
          }}
        >
          <Text style={[styles.filterButtonText, { color: sortBy === 'value' ? theme.colors.primary : theme.colors.textSecondary }]}>
            Value
          </Text>
          {sortBy === 'value' && (
            sortAscending ? <ChevronUp size={16} color={theme.colors.primary} /> : <ChevronDown size={16} color={theme.colors.primary} />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, { borderColor: theme.colors.border }]}
          onPress={() => {
            if (sortBy === 'confirmations') {
              setSortAscending(!sortAscending);
            } else {
              setSortBy('confirmations');
              setSortAscending(false);
            }
          }}
        >
          <Text style={[styles.filterButtonText, { color: sortBy === 'confirmations' ? theme.colors.primary : theme.colors.textSecondary }]}>
            Confirmations
          </Text>
          {sortBy === 'confirmations' && (
            sortAscending ? <ChevronUp size={16} color={theme.colors.primary} /> : <ChevronDown size={16} color={theme.colors.primary} />
          )}
        </TouchableOpacity>
      </View>
      
      <View style={styles.filterRow}>
        <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Filter:</Text>
        {(['all', 'confirmed', 'unconfirmed', 'frozen', 'unfrozen'] as FilterOption[]).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              {
                borderColor: theme.colors.border,
                backgroundColor: filterBy === filter ? theme.colors.primary + '20' : 'transparent',
              },
            ]}
            onPress={() => setFilterBy(filter)}
          >
            <Text style={[styles.filterButtonText, { color: filterBy === filter ? theme.colors.primary : theme.colors.textSecondary }]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.filterRow}>
        <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Hide small UTXOs:</Text>
        {Platform.OS === 'web' ? (
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: hideSmallUtxos }}
            onPress={() => setHideSmallUtxos(!hideSmallUtxos)}
            style={[
              styles.webSwitch,
              {
                backgroundColor: hideSmallUtxos ? theme.colors.primary : theme.colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.webSwitchThumb,
                {
                  transform: [{ translateX: hideSmallUtxos ? 24 : 2 }],
                  backgroundColor: '#FFFFFF',
                },
              ]}
            />
          </Pressable>
        ) : (
          <Switch
            value={hideSmallUtxos}
            onValueChange={setHideSmallUtxos}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
            ios_backgroundColor={theme.colors.border}
          />
        )}
      </View>
    </View>
  );

  const applySelection = () => {
    const ids = Array.from(selectedUtxos);
    coinControl.setSelected(ids);
    router.back();
  };

  return (
    <GradientBackground theme={theme} variant="primary">
      <SafeAreaView style={styles.container}>
        
        <Stack.Screen 
        options={{ 
          title: 'Coin Control',
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                onPress={() => setShowFilters(!showFilters)}
                style={styles.headerButton}
                testID="toggle-filters"
              >
                <Filter color={theme.colors.primary} size={20} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={applySelection}
                style={styles.headerButton}
                testID="apply-coin-selection"
              >
                <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Apply</Text>
              </TouchableOpacity>
            </View>
          ),
        }} 
      />
      
      <View style={styles.contentContainer}>
        {/* Summary Stats */}
        <View style={[styles.summaryContainer, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Total UTXOs</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
              {filteredAndSortedUtxos.length}
            </Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Total Value</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
              {formatBTC(totalValue)} BTC
            </Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Selected</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>
              {selectedUtxos.size} ({formatBTC(totalSelectedValue)} BTC)
            </Text>
          </View>
        </View>
      </View>
      
      {/* Filter Controls */}
      {showFilters && <FilterControls />}
      
      {/* Action Buttons */}
      {selectedUtxos.size > 0 && (
        <View style={[styles.actionBar, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity
            style={[styles.actionBarButton, { backgroundColor: theme.colors.primary }]}
            onPress={freezeSelectedUtxos}
          >
            <Snowflake color="white" size={16} />
            <Text style={styles.actionBarButtonText}>Freeze</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionBarButton, { backgroundColor: theme.colors.secondary }]}
            onPress={unfreezeSelectedUtxos}
          >
            <Zap color="white" size={16} />
            <Text style={styles.actionBarButtonText}>Unfreeze</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionBarButton, { backgroundColor: theme.colors.error }]}
            onPress={deselectAllUtxos}
          >
            <Text style={styles.actionBarButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* UTXO List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading UTXOs...
            </Text>
          </View>
        ) : filteredAndSortedUtxos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Coins color={theme.colors.textSecondary} size={48} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No UTXOs Found
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              {filterBy === 'all' ? 'Your wallet has no unspent outputs' : `No UTXOs match the current filter: ${filterBy}`}
            </Text>
          </View>
        ) : (
          <>
            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <Text style={[{ marginRight: 12, fontWeight: '600' }, { color: theme.colors.text }]}>
                {selectedUtxos.size} selected
              </Text>
              <TouchableOpacity
                style={[styles.quickActionButton, { borderColor: theme.colors.border }]}
                onPress={selectAllUtxos}
              >
                <CheckCircle color={theme.colors.primary} size={16} />
                <Text style={[styles.quickActionText, { color: theme.colors.primary }]}>Select All</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.quickActionButton, { borderColor: theme.colors.border }]}
                onPress={deselectAllUtxos}
              >
                <Circle color={theme.colors.textSecondary} size={16} />
                <Text style={[styles.quickActionText, { color: theme.colors.textSecondary }]}>Deselect All</Text>
              </TouchableOpacity>
            </View>
            
            {/* UTXO Items */}
            {filteredAndSortedUtxos.map((utxo) => (
              <UtxoItem key={`${utxo.txid}:${utxo.vout}`} utxo={utxo} />
            ))}
            
            {/* Info Footer */}
            <View style={[styles.infoFooter, { backgroundColor: theme.colors.surface }]}>
              <Info color={theme.colors.textSecondary} size={16} />
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                Coin control allows you to manage individual UTXOs. Frozen UTXOs won't be used in transactions unless manually selected.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
      </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 8 : 0,
  },
  headerButton: {
    padding: 8,
  },
  summaryContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterContainer: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 12,
    minWidth: 60,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 4,
  },
  filterButtonText: {
    fontSize: 12,
    marginRight: 4,
  },
  webSwitch: {
    width: 48,
    height: 28,
    borderRadius: 9999,
    justifyContent: 'center',
  },
  webSwitchThumb: {
    width: 24,
    height: 24,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 1.5,
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  actionBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    flex: 1,
    justifyContent: 'center',
  },
  actionBarButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 12,
  },
  quickActionText: {
    fontSize: 14,
    marginLeft: 6,
  },
  utxoItem: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
  },
  utxoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  utxoInfo: {
    flex: 1,
    marginRight: 12,
  },
  utxoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  utxoValue: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  utxoTxId: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 2,
  },
  utxoAddress: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 2,
  },
  utxoLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  utxoActions: {
    alignItems: 'center',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 8,
    flex: 1,
  },
});
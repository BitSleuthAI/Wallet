import { AndroidSafeContainer } from '@/components/AndroidSafeContainer';
import { GradientBackground } from '@/components/GradientBackground';
import { ThemedSwitch } from '@/components/ThemedSwitch';
import { platformStyles } from '@/constants/themes';
import { useWallet } from '@/hooks/wallet-store';
import type { UTXO } from '@/types/wallet';
import { Stack, useRouter } from 'expo-router';
import {
    ArrowLeft,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Circle,
    Coins,
    Filter,
    Info,
    Snowflake,
    Zap,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

type SortOption = 'value' | 'confirmations' | 'age' | 'address';
type FilterOption = 'all' | 'confirmed' | 'unconfirmed' | 'frozen' | 'unfrozen';

export default function CoinControlScreen() {
  const { theme, currentWallet, coinControl } = useWallet();
  const router = useRouter();
  const [selectedUtxos, setSelectedUtxos] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('value');
  const [sortAscending, setSortAscending] = useState<boolean>(false);
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [hideSmallUtxos, setHideSmallUtxos] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadUtxos = useCallback(async () => {
    if (!currentWallet) return;
    
    console.log('🔍 Coin control: Loading UTXOs for wallet in FAST MODE:', currentWallet.id);
    await coinControl.loadWalletUtxos(currentWallet.id, true); // true = fastMode
  }, [currentWallet?.id, coinControl]); // Include coinControl to avoid stale closures

  // Get UTXOs from wallet store
  const utxos = useMemo(() => {
    if (!currentWallet) return [];
    const retrievedUtxos = coinControl.getWalletUtxos(currentWallet.id);
    console.log('🔍 Coin control: Retrieved UTXOs from wallet store:', retrievedUtxos.length);
    console.log('🔍 Coin control: UTXO details:', retrievedUtxos.map(u => ({
      txid: u.txid?.substring(0, 10) + '...',
      vout: u.vout,
      value: u.value,
      status: u.status,
      frozen: u.frozen,
      address: u.address?.substring(0, 10) + '...'
    })));
    return retrievedUtxos;
  }, [currentWallet, coinControl]);

  // Get loading state from wallet store
  const isLoading = useMemo(() => {
    if (!currentWallet) return false;
    return coinControl.isUtxosLoading(currentWallet.id);
  }, [currentWallet, coinControl]);

  useEffect(() => {
    loadUtxos();
  }, [loadUtxos]);

  const onRefresh = async () => {
    if (!currentWallet) return;
    
    setRefreshing(true);
    try {
      console.log('🔄 Coin control: Refreshing UTXOs for wallet in COMPLETE MODE:', currentWallet.id);
      await coinControl.loadWalletUtxos(currentWallet.id, false); // false = complete mode
    } finally {
      setRefreshing(false);
    }
  };

  const filteredAndSortedUtxos = useMemo(() => {
    console.log('🔍 Coin control: Starting filtering with', utxos.length, 'UTXOs');
    console.log('🔍 Coin control: Filter settings:', { filterBy, hideSmallUtxos });
    
    let filtered = utxos.filter(utxo => {
      console.log('🔍 Coin control: Filtering UTXO:', {
        txid: utxo.txid?.substring(0, 10) + '...',
        value: utxo.value,
        status: utxo.status,
        frozen: utxo.frozen,
        hideSmallUtxos: hideSmallUtxos,
        filterBy: filterBy
      });
      
      if (hideSmallUtxos && utxo.value < 1000000) {
        console.log('🔍 Coin control: UTXO filtered out (too small)');
        return false; // Hide UTXOs < 0.01 BTC
      }
      
      let passesFilter = false;
      switch (filterBy) {
        case 'confirmed':
          passesFilter = utxo.status?.confirmed === true;
          break;
        case 'unconfirmed':
          passesFilter = utxo.status?.confirmed === false;
          break;
        case 'frozen':
          passesFilter = utxo.frozen === true;
          break;
        case 'unfrozen':
          passesFilter = utxo.frozen === false;
          break;
        default:
          passesFilter = true;
      }
      
      console.log('🔍 Coin control: UTXO filter result:', passesFilter);
      return passesFilter;
    });
    
    console.log('🔍 Coin control: After filtering:', filtered.length, 'UTXOs remain');

    const sorted = filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'value':
          comparison = a.value - b.value;
          break;
        case 'confirmations':
          comparison = (a.confirmations || 0) - (b.confirmations || 0);
          break;
        case 'age':
          const aTime = a.status?.block_time || 0;
          const bTime = b.status?.block_time || 0;
          comparison = aTime - bTime;
          break;
        case 'address':
          comparison = (a.address || '').localeCompare(b.address || '');
          break;
      }
      
      return sortAscending ? comparison : -comparison;
    });
    
    console.log('🔍 Coin control: Final sorted UTXOs:', sorted.length);
    console.log('🔍 Coin control: Final UTXO details:', sorted.map(u => ({
      txid: u.txid?.substring(0, 10) + '...',
      vout: u.vout,
      value: u.value,
      status: u.status,
      frozen: u.frozen
    })));
    
    return sorted;
  }, [utxos, sortBy, sortAscending, filterBy, hideSmallUtxos]);

  const toggleUtxoSelection = (utxoId: string) => {
    const utxo = utxos.find(item => `${item.txid}:${item.vout}` === utxoId);
    if (utxo?.frozen && !selectedUtxos.has(utxoId)) {
      return;
    }
    const newSelected = new Set(selectedUtxos);
    if (newSelected.has(utxoId)) {
      newSelected.delete(utxoId);
    } else {
      newSelected.add(utxoId);
    }
    setSelectedUtxos(newSelected);
  };

  const toggleUtxoFreeze = (utxoId: string) => {
    const target = utxos.find(utxo => `${utxo.txid}:${utxo.vout}` === utxoId);
    const wasFrozen = target?.frozen ?? false;
    coinControl.toggleFreeze(utxoId);
    // Note: No need to update local state - the coinControl store manages frozen status
    // and the component will re-render when coinControl state changes
    if (!wasFrozen) {
      setSelectedUtxos(prev => {
        if (!prev.has(utxoId)) return prev;
        const next = new Set(prev);
        next.delete(utxoId);
        return next;
      });
    }
  };

  const selectAllUtxos = () => {
    const allIds = filteredAndSortedUtxos
      .filter(utxo => !utxo.frozen)
      .map(utxo => `${utxo.txid}:${utxo.vout}`);
    setSelectedUtxos(new Set(allIds));
  };

  const deselectAllUtxos = () => {
    setSelectedUtxos(new Set());
  };

  const freezeSelectedUtxos = () => {
    // Persist freeze state
    selectedUtxos.forEach((utxoId) => {
      if (!coinControl.isFrozen(utxoId)) {
        coinControl.toggleFreeze(utxoId);
      }
    });
    // Note: No need to update local state - the coinControl store manages frozen status
    // and the component will re-render when coinControl state changes
    setSelectedUtxos(prev => {
      const next = new Set(prev);
      selectedUtxos.forEach(id => next.delete(id));
      return next;
    });
  };

  const unfreezeSelectedUtxos = () => {
    // Persist unfreeze state
    selectedUtxos.forEach((utxoId) => {
      if (coinControl.isFrozen(utxoId)) {
        coinControl.toggleFreeze(utxoId);
      }
    });
    // Note: No need to update local state - the coinControl store manages frozen status
    // and the component will re-render when coinControl state changes
    setSelectedUtxos(prev => {
      const next = new Set(prev);
      selectedUtxos.forEach(id => next.delete(id));
      return next;
    });
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
    return `${utxo.confirmations || 0} conf`;
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
      <View
        style={[
          styles.utxoItem,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
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
            {/* Freeze Button */}
            <View style={styles.actionGroup}>
              <TouchableOpacity
                style={[
                  styles.freezeButton, 
                  { 
                    backgroundColor: utxo.frozen ? theme.colors.secondary + '20' : theme.colors.border,
                    borderColor: utxo.frozen ? theme.colors.secondary : theme.colors.border,
                    borderWidth: 1,
                  }
                ]}
                onPress={() => toggleUtxoFreeze(utxoId)}
              >
                <Snowflake 
                  color={utxo.frozen ? theme.colors.secondary : theme.colors.textSecondary} 
                  size={16} 
                />
              </TouchableOpacity>
              <Text style={[styles.actionLabel, { color: theme.colors.textSecondary }]}>
                {utxo.frozen ? 'Frozen' : 'Freeze'}
              </Text>
            </View>
            
            {/* Select Button */}
            <View style={styles.actionGroup}>
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  {
                    backgroundColor: isSelected ? theme.colors.primary + '20' : 'transparent',
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    borderWidth: 2,
                  }
                ]}
                onPress={() => toggleUtxoSelection(utxoId)}
              >
                {isSelected ? (
                  <CheckCircle color={theme.colors.primary} size={20} />
                ) : (
                  <Circle color={theme.colors.textSecondary} size={20} />
                )}
              </TouchableOpacity>
              <Text style={[styles.actionLabel, { color: theme.colors.textSecondary }]}>
                {isSelected ? 'Selected' : 'Select'}
              </Text>
            </View>
          </View>
        </View>
      </View>
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
        <ThemedSwitch
          value={hideSmallUtxos}
          onValueChange={setHideSmallUtxos}
          theme={theme}
        />
      </View>
    </View>
  );

  const applySelection = () => {
    const ids = Array.from(selectedUtxos);
    coinControl.setSelected(ids);
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            testID="back-button"
          >
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Coin Control
          </Text>
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
        </View>
        {/* Summary Stats */}
        <View style={[
          styles.summaryContainer,
          { backgroundColor: theme.colors.surface },
        ]}>
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
            
            {/* Coin Control Educational Section */}
            <View style={[styles.educationCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.educationHeader}>
                <View style={[styles.educationIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Info color={theme.colors.primary} size={20} />
                </View>
                <Text style={[styles.educationTitle, { color: theme.colors.text }]}>
                  How Coin Control Works
                </Text>
              </View>
              <Text style={[styles.educationText, { color: theme.colors.textSecondary }]}>
                Coin control gives you precise control over which UTXOs (Unspent Transaction Outputs) to use in transactions:
              </Text>
              <View style={styles.educationFeatures}>
                <Text style={[styles.educationFeature, { color: theme.colors.textSecondary }]}>
                  • <Text style={{ fontWeight: '600' }}>UTXOs:</Text> Each Bitcoin you receive creates a separate "coin" that can be spent
                </Text>
                <Text style={[styles.educationFeature, { color: theme.colors.textSecondary }]}>
                  • <Text style={{ fontWeight: '600' }}>Selection:</Text> Choose specific UTXOs to include in your transaction
                </Text>
                <Text style={[styles.educationFeature, { color: theme.colors.textSecondary }]}>
                  • <Text style={{ fontWeight: '600' }}>Privacy:</Text> Avoid linking different Bitcoin sources together
                </Text>
                <Text style={[styles.educationFeature, { color: theme.colors.textSecondary }]}>
                  • <Text style={{ fontWeight: '600' }}>Frozen UTXOs:</Text> Temporarily prevent UTXOs from being automatically selected
                </Text>
                <Text style={[styles.educationFeature, { color: theme.colors.textSecondary }]}>
                  • <Text style={{ fontWeight: '600' }}>Change Management:</Text> Control how much Bitcoin you send back to yourself
                </Text>
              </View>
            </View>
          </>
        )}
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
  headerButton: {
    padding: 8,
  },
  summaryContainer: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 16,
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
    gap: 12,
  },
  actionGroup: {
    alignItems: 'center',
    gap: 4,
  },
  freezeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  selectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
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
  educationCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    ...platformStyles.shadow,
  },
  educationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  educationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  educationTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  educationText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  educationFeatures: {
    marginTop: 8,
  },
  educationFeature: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },

});
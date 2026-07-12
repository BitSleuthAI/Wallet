import { AppButton } from '@/components/AppButton';
import SuccessAnimation from '@/components/SuccessAnimation';
import { platformStyles } from '@/constants/themes';
import { useTheme } from '@/hooks/theme-store';
import { HapticService } from '@/services/haptic-service';
import * as Clipboard from 'expo-clipboard';
import { AlertTriangle, Copy, Zap } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export interface TransactionReviewDetails {
  /** e.g. "0.00120000 BTC" */
  amountBTC: string;
  /** Pre-formatted fiat string (e.g. "$52.13"), or null when price unavailable */
  amountFiat: string | null;
  /** Full recipient address */
  recipient: string;
  /** e.g. "0.00000320 BTC" or "Calculating..." */
  feeBTC: string;
  feeFiat: string | null;
  feeRate: number;
  timeEstimate: string;
  rbfEnabled: boolean;
  /** e.g. "0.00120320 BTC" */
  totalBTC: string;
}

export interface TransactionSuccessDetails {
  txid: string;
  amountBTC: string;
  feeBTC: string;
}

interface TransactionReviewSheetProps {
  visible: boolean;
  details: TransactionReviewDetails | null;
  /** When set, the sheet shows the broadcast-success state */
  success: TransactionSuccessDetails | null;
  /** Disables Confirm and shows its loading state while broadcasting */
  sending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onViewTransaction: () => void;
  onDone: () => void;
}

function DetailRow({ label, value, valueColor, mono }: {
  label: string;
  value: string;
  valueColor: string;
  mono?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, mono && styles.mono, { color: valueColor }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/**
 * TransactionReviewSheet - Native formSheet replacing the old Alert-based
 * send confirmation. Review state summarizes the transaction before the
 * irreversible broadcast; success state confirms it with a copyable txid.
 * The sheet is purely presentational: authentication and signing stay in
 * the send screen's existing handlers.
 */
export function TransactionReviewSheet({
  visible,
  details,
  success,
  sending,
  onConfirm,
  onCancel,
  onViewTransaction,
  onDone,
}: TransactionReviewSheetProps) {
  const { theme } = useTheme();
  const [copiedTxid, setCopiedTxid] = useState(false);

  useEffect(() => {
    if (visible) {
      HapticService.medium();
      setCopiedTxid(false);
    }
  }, [visible]);

  const handleCopyTxid = async () => {
    if (!success) return;
    try {
      await Clipboard.setStringAsync(success.txid);
      HapticService.success();
      setCopiedTxid(true);
    } catch (error) {
      console.warn('Failed to copy txid:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={success ? onDone : onCancel}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {!success ? (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Review Transaction</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Sending real Bitcoin on mainnet
            </Text>

            <View style={styles.amountBlock}>
              <Text style={[styles.amount, { color: theme.colors.text }]}>{details?.amountBTC}</Text>
              {!!details?.amountFiat && (
                <Text style={[styles.amountFiat, { color: theme.colors.textSecondary }]}>
                  {details.amountFiat}
                </Text>
              )}
            </View>

            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.rowLabel, { color: theme.colors.textSecondary }]}>To</Text>
              <Text style={[styles.recipient, { color: theme.colors.text }]}>{details?.recipient}</Text>
            </View>

            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <DetailRow
                label="Network Fee"
                value={`${details?.feeBTC ?? ''}${details?.feeFiat ? ` (${details.feeFiat})` : ''}`}
                valueColor={theme.colors.text}
              />
              <DetailRow
                label="Fee Rate"
                value={`${details?.feeRate ?? ''} sat/vB · ${details?.timeEstimate ?? ''}`}
                valueColor={theme.colors.text}
              />
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: theme.colors.textSecondary }]}>Replace-By-Fee</Text>
                <View style={[
                  styles.rbfBadge,
                  { backgroundColor: (details?.rbfEnabled ? theme.colors.success : theme.colors.textSecondary) + '15' },
                ]}>
                  <Zap
                    color={details?.rbfEnabled ? theme.colors.success : theme.colors.textSecondary}
                    size={12}
                  />
                  <Text style={[
                    styles.rbfText,
                    { color: details?.rbfEnabled ? theme.colors.success : theme.colors.textSecondary },
                  ]}>
                    {details?.rbfEnabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              <DetailRow label="Total" value={details?.totalBTC ?? ''} valueColor={theme.colors.text} />
            </View>

            <View style={[styles.warningBox, { backgroundColor: theme.colors.warning + '15' }]}>
              <AlertTriangle color={theme.colors.warning} size={18} />
              <Text style={[styles.warningText, { color: theme.colors.text }]}>
                Bitcoin transactions cannot be reversed once broadcast. Double-check the recipient address.
              </Text>
            </View>

            <AppButton
              title={sending ? 'Broadcasting...' : 'Confirm & Send'}
              variant="destructive"
              onPress={onConfirm}
              loading={sending}
              disabled={sending}
              style={styles.confirmButton}
              testID="confirm-send-button"
            />
            <AppButton
              title="Cancel"
              variant="secondary"
              onPress={onCancel}
              disabled={sending}
              testID="cancel-send-button"
            />
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.successHeader}>
              <SuccessAnimation size={88} color={theme.colors.success} />
              <Text style={[styles.title, styles.successTitle, { color: theme.colors.text }]}>
                Transaction Broadcast
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                Sent {success.amountBTC} · Fee {success.feeBTC}
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.rowLabel, { color: theme.colors.textSecondary }]}>Transaction ID</Text>
              <Pressable
                onPress={handleCopyTxid}
                accessibilityRole="button"
                accessibilityLabel="Copy transaction ID"
                style={styles.txidRow}
              >
                <Text style={[styles.txid, { color: theme.colors.text }]}>{success.txid}</Text>
                <Copy color={copiedTxid ? theme.colors.success : theme.colors.primary} size={18} />
              </Pressable>
              {!!copiedTxid && (
                <Text style={[styles.copiedText, { color: theme.colors.success }]}>Copied to clipboard</Text>
              )}
            </View>

            <Text style={[styles.successNote, { color: theme.colors.textSecondary }]}>
              The transaction will appear in your wallet once it receives confirmations.
              This typically takes 10-60 minutes depending on network congestion.
            </Text>

            <AppButton
              title="View Transaction"
              onPress={onViewTransaction}
              style={styles.confirmButton}
              testID="view-transaction-button"
            />
            <AppButton
              title="Done"
              variant="secondary"
              onPress={onDone}
              testID="done-button"
            />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: platformStyles.spacing.xl,
    paddingTop: platformStyles.spacing.xxl,
    paddingBottom: platformStyles.spacing.huge,
    gap: platformStyles.spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 4,
  },
  amountBlock: {
    alignItems: 'center',
    marginVertical: platformStyles.spacing.lg,
  },
  amount: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  amountFiat: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 4,
  },
  card: {
    borderRadius: platformStyles.borderRadius.xl,
    borderWidth: 1,
    padding: platformStyles.spacing.lg,
    gap: platformStyles.spacing.sm,
  },
  recipient: {
    fontSize: 14,
    fontFamily: 'monospace',
    letterSpacing: 0.4,
    lineHeight: 21,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 28,
    gap: platformStyles.spacing.md,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  mono: {
    fontFamily: 'monospace',
  },
  rbfBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rbfText: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: platformStyles.spacing.xs,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: platformStyles.spacing.md,
    borderRadius: platformStyles.borderRadius.large,
    padding: platformStyles.spacing.lg,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  confirmButton: {
    marginTop: platformStyles.spacing.md,
  },
  successHeader: {
    alignItems: 'center',
    gap: platformStyles.spacing.md,
    marginVertical: platformStyles.spacing.xl,
  },
  successTitle: {
    marginTop: platformStyles.spacing.lg,
  },
  txidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: platformStyles.spacing.md,
  },
  txid: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'monospace',
    letterSpacing: 0.3,
    lineHeight: 19,
  },
  copiedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  successNote: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: platformStyles.spacing.md,
  },
});

export default TransactionReviewSheet;

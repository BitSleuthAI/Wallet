import { AndroidSafeContainer } from '@/components/AndroidSafeContainer';
import { platformStyles } from '@/constants/themes';
import { useTheme } from '@/hooks/theme-store';
import { Link, Stack } from "expo-router";
import { ArrowLeft, Bot } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function NotFoundScreen() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: false
        }}
      />
      <AndroidSafeContainer style={styles.safeArea}>
        <View style={styles.content}>
          <View style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border
            }
          ]}>
            <View style={[
              styles.iconContainer,
              { backgroundColor: theme.colors.primary }
            ]}>
              <Bot color="#FFFFFF" size={48} strokeWidth={2} />
            </View>

            <Text style={[styles.title, { color: theme.colors.text }]}>
              404 - Page Not Found
            </Text>

            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              Oh sleuth!!! It seems BitSleuth bot got lost in the digital ether. The page you&apos;re looking for might have been moved or never existed.
            </Text>

            <Link href="/" asChild>
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: theme.colors.primary }
                ]}
              >
                <ArrowLeft color="#FFFFFF" size={20} strokeWidth={2.5} />
                <Text style={styles.buttonText}>Return to Dashboard</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </AndroidSafeContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    ...platformStyles.cardShadow,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

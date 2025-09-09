import { AndroidSafeContainer } from '@/components/AndroidSafeContainer';
import { GradientBackground } from '@/components/GradientBackground';
import { useWallet } from '@/hooks/wallet-store';
import { Link, Stack } from "expo-router";
import { Home } from 'lucide-react-native';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function NotFoundScreen() {
  const { theme } = useWallet();
  
  return (
    <GradientBackground theme={theme} variant="primary" direction="vertical">
      <Stack.Screen 
        options={{ 
          title: "Page Not Found",
          headerBackTitle: '',
          headerStyle: {
            backgroundColor: 'transparent',
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            color: theme.colors.text,
          },
        }} 
      />
      <AndroidSafeContainer style={styles.container}>
        <View style={[
          styles.content,
          Platform.OS === 'ios' && { paddingTop: 75 }
        ]}>
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <View style={[
              styles.iconContainer,
              { backgroundColor: theme.colors.primary + '20' }
            ]}>
              <Text style={[styles.errorCode, { color: theme.colors.primary }]}>404</Text>
            </View>
            
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Oops! Page not found
            </Text>
            
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </Text>

            <Link href="/" asChild>
              <TouchableOpacity 
                style={[
                  styles.button,
                  { backgroundColor: theme.colors.primary }
                ]}
              >
                <Home color="white" size={20} />
                <Text style={styles.buttonText}>Go to Home</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </AndroidSafeContainer>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorCode: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

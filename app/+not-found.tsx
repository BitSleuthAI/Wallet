import { AndroidSafeContainer } from '@/components/AndroidSafeContainer';
import { platformStyles } from '@/constants/themes';
import { Link, Stack } from "expo-router";
import { ArrowLeft, Bot } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View, useColorScheme } from "react-native";

export default function NotFoundScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
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
              backgroundColor: isDark ? '#2a2a2a' : '#ffffff',
              borderColor: isDark ? '#3a3a3a' : '#e0e0e0'
            }
          ]}>
            <View style={[
              styles.iconContainer,
              { backgroundColor: '#8B5CF6' }
            ]}>
              <Bot color="#2a2a2a" size={48} strokeWidth={2} />
            </View>
            
            <Text style={[styles.title, { color: isDark ? '#ffffff' : '#1a1a1a' }]}>
              404 - Page Not Found
            </Text>
            
            <Text style={[styles.description, { color: isDark ? '#a0a0a0' : '#666666' }]}>
              Oh sleuth!!! It seems BitSleuth bot got lost in the digital ether. The page you&apos;re looking for might have been moved or never existed.
            </Text>

            <Link href="/" asChild>
              <TouchableOpacity 
                style={[
                  styles.button,
                  { backgroundColor: '#8B5CF6' }
                ]}
              >
                <ArrowLeft color="#2a2a2a" size={20} strokeWidth={2.5} />
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
    color: '#2a2a2a',
  },
});

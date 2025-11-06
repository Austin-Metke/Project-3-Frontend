// pages/Home.tsx
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native'
import { useAuth } from '../auth/AuthProvider'

export default function Home({ navigation }: any) {
  const { user, signOut } = useAuth() // <-- use signOut exposed by provider

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to EcoPoints</Text>
      <Text style={styles.subtitle}>Choose an option to continue</Text>

      {user ? (
        <>
          {user.picture ? <Image source={{ uri: user.picture }} style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 12 }} /> : null}
          <Text style={{ marginBottom: 16 }}>Signed in as {user.name ?? user.email}</Text>
          <TouchableOpacity style={[styles.button, styles.signupButton]} onPress={signOut}>
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.button, styles.loginButton]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.signupButton]}
            onPress={() => navigation.navigate('SignUp')}
          >
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 30 },
  buttons: { gap: 16, width: '100%', maxWidth: 300 },
  button: { paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  loginButton: { backgroundColor: '#007AFF' },
  signupButton: { backgroundColor: '#4CAF50' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
})

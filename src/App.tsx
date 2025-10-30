import { View, StyleSheet } from 'react-native'
import Login from './pages/Login'

function App() {
  return (
    <View style={styles.container}>
      <Login />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})

export default App

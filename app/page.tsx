'use client'

import VoiceRecorder from '@/components/VoiceRecorder'
import AuthForm from '@/components/AuthForm'
import UserProfile from '@/components/UserProfile'
import { useAuth } from '@/lib/context/AuthContext'

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <main style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Laster...</p>
      </main>
    )
  }

  return (
    <main style={styles.main}>
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <h1 style={styles.title}>🎵 Heart-Shaped Box</h1>
          {user && <UserProfile />}
        </header>

        {/* Main content */}
        {user ? (
          <VoiceRecorder />
        ) : (
          <div style={styles.authContainer}>
            <p style={styles.welcomeText}>
              Velkommen til Heart-Shaped Box! Logg inn for å bruke stemmeassistenten.
            </p>
            <AuthForm />
          </div>
        )}
      </div>
    </main>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  main: {
    minHeight: '100vh',
    padding: '20px',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '20px',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #3a3a4e',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#aaaaaa',
    fontSize: '1rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '40px',
    flexWrap: 'wrap',
    gap: '20px',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  authContainer: {
    textAlign: 'center',
    marginTop: '40px',
  },
  welcomeText: {
    fontSize: '1.1rem',
    color: '#aaaaaa',
    marginBottom: '30px',
    lineHeight: '1.6',
  },
}

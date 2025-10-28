'use client'

import { useAuth } from '@/lib/context/AuthContext'

export default function UserProfile() {
  const { user, signOut, loading } = useAuth()

  if (loading) {
    return <div style={styles.loading}>Laster...</div>
  }

  if (!user) {
    return null
  }

  return (
    <div style={styles.container}>
      <span style={styles.email}>
        {user.email}
      </span>
      <button
        onClick={signOut}
        style={styles.logoutButton}
      >
        Logg ut
      </button>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  loading: {
    color: '#aaaaaa',
    fontSize: '0.9rem',
  },
  email: {
    fontSize: '0.9rem',
    color: '#e0e0e0',
  },
  logoutButton: {
    padding: '8px 16px',
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
}

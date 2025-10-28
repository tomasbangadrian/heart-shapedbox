'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/context/AuthContext'

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (isLogin) {
        await signIn(email, password)
        setSuccess('Vellykket innlogging!')
      } else {
        await signUp(email, password)
        setSuccess('Sjekk e-posten din for bekreftelseslenke!')
      }
    } catch (err: any) {
      setError(err.message || 'Noe gikk galt')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>
        {isLogin ? 'Logg inn' : 'Registrer deg'}
      </h2>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputGroup}>
          <label htmlFor="email" style={styles.label}>
            E-post
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
        </div>

        <div style={styles.inputGroup}>
          <label htmlFor="password" style={styles.label}>
            Passord
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={styles.input}
          />
        </div>

        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}

        {success && (
          <div style={styles.successBox}>
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            ...styles.submitButton,
            ...(loading ? styles.submitButtonDisabled : {}),
          }}
        >
          {loading ? 'Laster...' : isLogin ? 'Logg inn' : 'Registrer deg'}
        </button>
      </form>

      <button
        onClick={() => setIsLogin(!isLogin)}
        style={styles.toggleButton}
      >
        {isLogin ? 'Har du ikke konto? Registrer deg' : 'Har du allerede konto? Logg inn'}
      </button>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '400px',
    margin: '0 auto',
    padding: '30px',
    background: '#1a1a2e',
    borderRadius: '16px',
    border: '1px solid #3a3a4e',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    marginBottom: '30px',
    textAlign: 'center',
    color: '#ffffff',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#aaaaaa',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '1rem',
    borderRadius: '8px',
    border: '2px solid #3a3a4e',
    background: '#0f0f23',
    color: 'white',
    outline: 'none',
    transition: 'border-color 0.3s ease',
  },
  errorBox: {
    padding: '12px',
    background: 'rgba(220, 38, 38, 0.1)',
    border: '1px solid rgba(220, 38, 38, 0.5)',
    borderRadius: '8px',
    color: '#fca5a5',
    fontSize: '0.9rem',
  },
  successBox: {
    padding: '12px',
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.5)',
    borderRadius: '8px',
    color: '#86efac',
    fontSize: '0.9rem',
  },
  submitButton: {
    width: '100%',
    padding: '14px',
    fontSize: '1rem',
    fontWeight: 'bold',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
  },
  submitButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  toggleButton: {
    width: '100%',
    marginTop: '16px',
    padding: '10px',
    fontSize: '0.9rem',
    color: '#667eea',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
}

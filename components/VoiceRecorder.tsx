'use client'

import { useState, useRef, useEffect } from 'react'
import SpotifyPlayer from './SpotifyPlayer'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [textInput, setTextInput] = useState('')
  const [spotifyAccessToken, setSpotifyAccessToken] = useState<string | null>(null)
  const [spotifyRefreshToken, setSpotifyRefreshToken] = useState<string | null>(null)
  const [spotifyDeviceId, setSpotifyDeviceId] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Handle Spotify OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const error = params.get('error')

    if (error) {
      alert('Spotify authentication failed: ' + error)
    }

    if (accessToken) {
      setSpotifyAccessToken(accessToken)
      if (refreshToken) {
        setSpotifyRefreshToken(refreshToken)
      }
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await processAudio(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('Could not access microphone. Check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleSpotifyCommand = async (query: string) => {
    if (!spotifyAccessToken) {
      console.log('❌ No Spotify access token')
      return 'You must log in to Spotify first'
    }

    if (!spotifyDeviceId) {
      console.log('❌ No Spotify device ID - player not ready')
      return 'Spotify Web Player is not ready yet. Wait and try again.'
    }

    console.log('🔍 Searching Spotify for:', query)

    try {
      // Search for the track
      const searchResponse = await fetch('/api/spotify/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, accessToken: spotifyAccessToken }),
      })

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text()
        console.error('❌ Search failed:', errorText)
        return 'Could not find the song on Spotify'
      }

      const track = await searchResponse.json()
      console.log('✅ Found track:', track.name, 'by', track.artist)

      // Play the track
      console.log('▶️ Playing track on device:', spotifyDeviceId)
      const playResponse = await fetch('/api/spotify/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uri: track.uri,
          accessToken: spotifyAccessToken,
          deviceId: spotifyDeviceId,
        }),
      })

      if (!playResponse.ok) {
        const errorText = await playResponse.text()
        console.error('❌ Play failed:', errorText)
        return 'Could not play the song. Check that you have Spotify Premium.'
      }

      console.log('✅ Now playing!')
      return `Now playing ${track.name} by ${track.artist} on Spotify`
    } catch (error) {
      console.error('❌ Spotify command error:', error)
      return 'Something went wrong with Spotify'
    }
  }

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true)

    try {
      // Send audio to Whisper API
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const whisperResponse = await fetch('/api/whisper', {
        method: 'POST',
        body: formData,
      })

      if (!whisperResponse.ok) {
        throw new Error('Whisper API feilet')
      }

      const { text } = await whisperResponse.json()

      // Add user message
      const userMessage: Message = {
        role: 'user',
        content: text,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, userMessage])

      // Send to ChatGPT for classification and response
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          hasSpotify: !!spotifyAccessToken
        }),
      })

      if (!chatResponse.ok) {
        throw new Error('Chat API feilet')
      }

      const { response, audioUrl, intent, spotifyQuery } = await chatResponse.json()

      console.log('🤖 ChatGPT Response:', { intent, response, spotifyQuery })

      let finalResponse = response

      // Handle Spotify commands
      if (intent === 'SPOTIFY' && spotifyQuery) {
        console.log('🎵 Spotify command detected, query:', spotifyQuery)
        finalResponse = await handleSpotifyCommand(spotifyQuery)
      } else if (intent === 'SPOTIFY' && !spotifyQuery) {
        console.log('⚠️ Spotify intent but no query extracted')
        finalResponse = 'I didn\'t understand which song you want to play. Try again.'
      }

      // Add assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: finalResponse,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])

      // Play TTS audio (use original response for TTS)
      if (audioUrl) {
        const audio = new Audio(audioUrl)
        audio.play()
      }

    } catch (error) {
      console.error('Error processing audio:', error)
      alert('Something went wrong. Try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const processText = async (text: string) => {
    if (!text.trim()) return

    setIsProcessing(true)

    try {
      console.log('📝 Processing text input:', text)

      // Add user message
      const userMessage: Message = {
        role: 'user',
        content: text,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, userMessage])

      // Send to ChatGPT for classification and response
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          hasSpotify: !!spotifyAccessToken
        }),
      })

      if (!chatResponse.ok) {
        throw new Error('Chat API feilet')
      }

      const { response, audioUrl, intent, spotifyQuery } = await chatResponse.json()

      console.log('🤖 ChatGPT Response:', { intent, response, spotifyQuery })

      let finalResponse = response

      // Handle Spotify commands
      if (intent === 'SPOTIFY' && spotifyQuery) {
        console.log('🎵 Spotify command detected, query:', spotifyQuery)
        finalResponse = await handleSpotifyCommand(spotifyQuery)
      } else if (intent === 'SPOTIFY' && !spotifyQuery) {
        console.log('⚠️ Spotify intent but no query extracted')
        finalResponse = 'I didn\'t understand which song you want to play. Try again.'
      }

      // Add assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: finalResponse,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])

      // Play TTS audio (use original response for TTS)
      if (audioUrl) {
        const audio = new Audio(audioUrl)
        audio.play()
      }

    } catch (error) {
      console.error('Error processing text:', error)
      alert('Something went wrong. Try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (textInput.trim()) {
      processText(textInput)
      setTextInput('')
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🎤 Voice Assistant</h1>
        <p style={styles.subtitle}>Press and hold to speak</p>
      </div>

      {/* Spotify Login/Status */}
      {!spotifyAccessToken ? (
        <div style={styles.spotifyLogin}>
          <p style={styles.spotifyText}>
            Log in to Spotify to play music
          </p>
          <button
            style={styles.spotifyButton}
            onClick={() => window.location.href = '/api/spotify/login'}
          >
            🎵 Log in with Spotify
          </button>
        </div>
      ) : (
        <SpotifyPlayer
          accessToken={spotifyAccessToken}
          onDeviceReady={(deviceId) => setSpotifyDeviceId(deviceId)}
        />
      )}

      <div style={styles.recordingSection}>
        <button
          style={{
            ...styles.recordButton,
            ...(isRecording ? styles.recordButtonActive : {}),
          }}
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <span style={styles.buttonText}>⏳ Processing...</span>
          ) : isRecording ? (
            <span style={styles.buttonText}>🔴 Speaking...</span>
          ) : (
            <span style={styles.buttonText}>🎤 Hold to speak</span>
          )}
        </button>
      </div>

      {/* Text Input Alternative */}
      <div style={styles.textInputSection}>
        <p style={styles.orText}>or type command manually:</p>
        <form onSubmit={handleTextSubmit} style={styles.textForm}>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder='E.g.: "play great day for freedom by pink floyd"'
            style={styles.textInput}
            disabled={isProcessing}
          />
          <button
            type="submit"
            style={styles.textSubmitButton}
            disabled={isProcessing || !textInput.trim()}
          >
            {isProcessing ? '⏳' : '📤 Send'}
          </button>
        </form>
      </div>

      <div style={styles.instructionsBox}>
        <h3 style={styles.instructionsTitle}>💡 How to use</h3>
        <ol style={styles.instructionsList}>
          <li><strong>Hold down</strong> the large button above</li>
          <li><strong>Speak</strong> clearly while holding</li>
          <li><strong>Release</strong> when finished</li>
        </ol>
        <div style={styles.examplesBox}>
          <p style={styles.examplesTitle}><strong>📝 Example commands:</strong></p>
          <ul style={styles.examplesList}>
            <li>"What is the capital of France?"</li>
            <li>"Play Bohemian Rhapsody"</li>
            <li>"Play Aurora on Spotify"</li>
            <li>"Set volume to 50%"</li>
          </ul>
        </div>
      </div>

      <div style={styles.messagesContainer}>
        <h2 style={styles.messagesTitle}>Conversation History</h2>
        <div style={styles.messagesList}>
          {messages.length === 0 ? (
            <p style={styles.emptyState}>
              No messages yet. Start by pressing and holding the button to speak.
            </p>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                style={{
                  ...styles.message,
                  ...(message.role === 'user' ? styles.userMessage : styles.assistantMessage),
                }}
              >
                <div style={styles.messageRole}>
                  {message.role === 'user' ? '👤 You' : '🤖 Assistant'}
                </div>
                <div style={styles.messageContent}>{message.content}</div>
                <div style={styles.messageTime}>
                  {message.timestamp.toLocaleTimeString('en-US')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '10px',
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#aaaaaa',
  },
  spotifyLogin: {
    textAlign: 'center',
    padding: '20px',
    marginBottom: '30px',
    background: '#1a1a2e',
    borderRadius: '12px',
    border: '2px solid #1DB954',
  },
  spotifyText: {
    marginBottom: '15px',
    color: '#aaaaaa',
  },
  spotifyButton: {
    padding: '12px 24px',
    background: '#1DB954',
    color: 'white',
    border: 'none',
    borderRadius: '24px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  recordingSection: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  textInputSection: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  orText: {
    color: '#888',
    marginBottom: '15px',
    fontSize: '0.95rem',
  },
  textForm: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  textInput: {
    flex: 1,
    padding: '12px 20px',
    fontSize: '1rem',
    borderRadius: '8px',
    border: '2px solid #3a3a4e',
    background: '#1a1a2e',
    color: 'white',
    outline: 'none',
    transition: 'border-color 0.3s ease',
  },
  textSubmitButton: {
    padding: '12px 24px',
    fontSize: '1rem',
    fontWeight: 'bold',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    whiteSpace: 'nowrap',
  },
  instructionsBox: {
    background: '#1a1a2e',
    borderRadius: '12px',
    padding: '20px 30px',
    marginBottom: '40px',
    border: '1px solid #3a3a4e',
  },
  instructionsTitle: {
    fontSize: '1.2rem',
    marginBottom: '15px',
    color: '#4a9eff',
  },
  instructionsList: {
    marginLeft: '20px',
    marginBottom: '20px',
    lineHeight: '1.8',
    color: '#e0e0e0',
  },
  examplesBox: {
    background: '#0f0f23',
    borderRadius: '8px',
    padding: '15px',
    marginTop: '15px',
  },
  examplesTitle: {
    marginBottom: '10px',
    color: '#aaaaaa',
  },
  examplesList: {
    listStyleType: 'disc',
    marginLeft: '20px',
    lineHeight: '1.8',
    color: '#cccccc',
  },
  recordButton: {
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    border: '4px solid #4a9eff',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 20px rgba(74, 158, 255, 0.3)',
  },
  recordButtonActive: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    border: '4px solid #f5576c',
    transform: 'scale(1.1)',
    boxShadow: '0 12px 30px rgba(245, 87, 108, 0.5)',
  },
  buttonText: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  messagesContainer: {
    marginTop: '40px',
  },
  messagesTitle: {
    fontSize: '1.5rem',
    marginBottom: '20px',
  },
  messagesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  emptyState: {
    textAlign: 'center',
    color: '#888',
    padding: '40px 20px',
  },
  message: {
    padding: '15px 20px',
    borderRadius: '12px',
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    marginLeft: 'auto',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    background: '#2a2a3e',
    border: '1px solid #3a3a4e',
  },
  messageRole: {
    fontSize: '0.85rem',
    fontWeight: 'bold',
    marginBottom: '5px',
    opacity: 0.8,
  },
  messageContent: {
    fontSize: '1rem',
    lineHeight: '1.5',
    marginBottom: '5px',
  },
  messageTime: {
    fontSize: '0.75rem',
    opacity: 0.6,
    textAlign: 'right',
  },
}

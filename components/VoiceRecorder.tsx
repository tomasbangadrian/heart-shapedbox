'use client'

import { useState, useRef, useEffect } from 'react'
import SpotifyPlayer from './SpotifyPlayer'
import { useAuth } from '@/lib/context/AuthContext'
import { useConversations } from '@/lib/hooks/useConversations'
import { uploadAudio, saveAudioRecord } from '@/lib/utils/audioStorage'
import { saveTranscription } from '@/lib/utils/transcriptionStorage'
import { saveIntentClassification } from '@/lib/utils/intentStorage'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function VoiceRecorder() {
  const { user } = useAuth()
  const { conversations, addConversation } = useConversations()
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
      alert('Spotify authentication feilet: ' + error)
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
    if (!user) {
      alert('Du må være logget inn for å bruke stemmeassistenten')
      return
    }

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
      alert('Kunne ikke få tilgang til mikrofonen. Sjekk tillatelser.')
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
      return 'Du må logge inn på Spotify først'
    }

    if (!spotifyDeviceId) {
      console.log('❌ No Spotify device ID - player not ready')
      return 'Spotify Web Player er ikke klar ennå. Vent litt og prøv igjen.'
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
        return 'Kunne ikke finne låten på Spotify'
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
        return 'Kunne ikke spille låten. Sjekk at du har Spotify Premium.'
      }

      console.log('✅ Now playing!')
      return `Nå spiller jeg ${track.name} av ${track.artist} på Spotify`
    } catch (error) {
      console.error('❌ Spotify command error:', error)
      return 'Noe gikk galt med Spotify'
    }
  }

  const processAudio = async (audioBlob: Blob) => {
    if (!user) return

    setIsProcessing(true)

    try {
      // 1. Last opp lyd til Supabase Storage (hvis tilgjengelig)
      let audioRecordId = null
      try {
        const uploadedAudioUrl = await uploadAudio(audioBlob, user.id)

        if (uploadedAudioUrl) {
          const audioRecord = await saveAudioRecord(
            user.id,
            uploadedAudioUrl,
            0, // duration (kan beregnes hvis nødvendig)
            audioBlob.size
          )
          audioRecordId = audioRecord.id
        }
      } catch (storageError) {
        console.log('⚠️ Could not save audio to storage:', storageError)
        // Continue without audio storage
      }

      // 2. Send audio to Whisper API
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

      // Add user message to UI
      const userMessage: Message = {
        role: 'user',
        content: text,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, userMessage])

      // 3. Lagre transkripsjon
      const transcriptionRecord = await saveTranscription(
        user.id,
        audioRecordId,
        text
      )

      // 4. Send to ChatGPT for classification and response
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

      const { response, audioUrl, intent, spotifyQuery, entities } = await chatResponse.json()

      console.log('🤖 ChatGPT Response:', { intent, response, spotifyQuery, entities })

      let finalResponse = response

      // Handle Spotify commands
      if (intent === 'SPOTIFY' && spotifyQuery) {
        console.log('🎵 Spotify command detected, query:', spotifyQuery)
        finalResponse = await handleSpotifyCommand(spotifyQuery)
      } else if (intent === 'SPOTIFY' && !spotifyQuery) {
        console.log('⚠️ Spotify intent but no query extracted')
        finalResponse = 'Jeg forstod ikke hvilken sang du vil spille. Prøv igjen.'
      }

      // Add assistant message to UI
      const assistantMessage: Message = {
        role: 'assistant',
        content: finalResponse,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])

      // 5. Lagre intent classification
      const intentRecord = await saveIntentClassification(
        user.id,
        transcriptionRecord.id,
        intent || 'OTHER',
        null,
        entities || {},
        response
      )

      // 6. Lagre full conversation
      await addConversation(
        text,
        finalResponse,
        audioUrl,
        transcriptionRecord.id,
        intentRecord.id
      )

      // Play TTS audio (use original response for TTS)
      if (audioUrl) {
        const audio = new Audio(audioUrl)
        audio.play()
      }

    } catch (error) {
      console.error('Error processing audio:', error)
      alert('Noe gikk galt. Prøv igjen.')
    } finally {
      setIsProcessing(false)
    }
  }

  const processText = async (text: string) => {
    if (!text.trim()) return
    if (!user) return

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

      // 1. Lagre transkripsjon (uten lydopptak)
      const transcriptionRecord = await saveTranscription(
        user.id,
        null,
        text
      )

      // 2. Send to ChatGPT for classification and response
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

      const { response, audioUrl, intent, spotifyQuery, entities } = await chatResponse.json()

      console.log('🤖 ChatGPT Response:', { intent, response, spotifyQuery, entities })

      let finalResponse = response

      // Handle Spotify commands
      if (intent === 'SPOTIFY' && spotifyQuery) {
        console.log('🎵 Spotify command detected, query:', spotifyQuery)
        finalResponse = await handleSpotifyCommand(spotifyQuery)
      } else if (intent === 'SPOTIFY' && !spotifyQuery) {
        console.log('⚠️ Spotify intent but no query extracted')
        finalResponse = 'Jeg forstod ikke hvilken sang du vil spille. Prøv igjen.'
      }

      // Add assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: finalResponse,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])

      // 3. Lagre intent classification
      const intentRecord = await saveIntentClassification(
        user.id,
        transcriptionRecord.id,
        intent || 'OTHER',
        null,
        entities || {},
        response
      )

      // 4. Lagre full conversation
      await addConversation(
        text,
        finalResponse,
        audioUrl,
        transcriptionRecord.id,
        intentRecord.id
      )

      // Play TTS audio (use original response for TTS)
      if (audioUrl) {
        const audio = new Audio(audioUrl)
        audio.play()
      }

    } catch (error) {
      console.error('Error processing text:', error)
      alert('Noe gikk galt. Prøv igjen.')
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
        <h1 style={styles.title}>🎤 Stemmeassistent</h1>
        <p style={styles.subtitle}>Trykk og hold for å snakke</p>
      </div>

      {/* Spotify Login/Status */}
      {!spotifyAccessToken ? (
        <div style={styles.spotifyLogin}>
          <p style={styles.spotifyText}>
            Logg inn på Spotify for å spille musikk
          </p>
          <button
            style={styles.spotifyButton}
            onClick={() => window.location.href = '/api/spotify/login'}
          >
            🎵 Logg inn med Spotify
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
            <span style={styles.buttonText}>⏳ Behandler...</span>
          ) : isRecording ? (
            <span style={styles.buttonText}>🔴 Snakker...</span>
          ) : (
            <span style={styles.buttonText}>🎤 Hold for å snakke</span>
          )}
        </button>
      </div>

      {/* Text Input Alternative */}
      <div style={styles.textInputSection}>
        <p style={styles.orText}>eller skriv kommando manuelt:</p>
        <form onSubmit={handleTextSubmit} style={styles.textForm}>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder='F.eks: "spill great day for freedom av pink floyd"'
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
        <h3 style={styles.instructionsTitle}>💡 Hvordan bruke</h3>
        <ol style={styles.instructionsList}>
          <li><strong>Hold inne</strong> den store knappen over</li>
          <li><strong>Snakk</strong> tydelig mens du holder</li>
          <li><strong>Slipp</strong> når du er ferdig</li>
        </ol>
        <div style={styles.examplesBox}>
          <p style={styles.examplesTitle}><strong>📝 Eksempler på kommandoer:</strong></p>
          <ul style={styles.examplesList}>
            <li>"Hva er hovedstaden i Norge?"</li>
            <li>"Spill Bohemian Rhapsody"</li>
            <li>"Spill Aurora på Spotify"</li>
            <li>"Still volum på 50%"</li>
          </ul>
        </div>
      </div>

      <div style={styles.messagesContainer}>
        <h2 style={styles.messagesTitle}>Samtalehistorikk (denne økt)</h2>
        <div style={styles.messagesList}>
          {messages.length === 0 ? (
            <p style={styles.emptyState}>
              Ingen meldinger ennå. Start med å trykke og holde knappen for å snakke.
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
                  {message.role === 'user' ? '👤 Deg' : '🤖 Assistent'}
                </div>
                <div style={styles.messageContent}>{message.content}</div>
                <div style={styles.messageTime}>
                  {message.timestamp.toLocaleTimeString('no-NO')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Samtalehistorikk fra Supabase */}
      {conversations.length > 0 && (
        <div style={styles.conversationsContainer}>
          <h2 style={styles.conversationsTitle}>📚 Lagret samtalehistorikk</h2>
          <div style={styles.conversationsList}>
            {conversations.map((conv) => (
              <div key={conv.id} style={styles.conversationCard}>
                <div style={styles.conversationUser}>
                  <strong style={styles.conversationLabel}>Du:</strong>
                  <p style={styles.conversationText}>{conv.user_input}</p>
                </div>
                <div style={styles.conversationAssistant}>
                  <strong style={styles.conversationLabel}>Assistent:</strong>
                  <p style={styles.conversationText}>{conv.assistant_response}</p>
                </div>
                <div style={styles.conversationTime}>
                  {new Date(conv.created_at).toLocaleString('no-NO')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
  conversationsContainer: {
    marginTop: '60px',
    paddingTop: '40px',
    borderTop: '2px solid #3a3a4e',
  },
  conversationsTitle: {
    fontSize: '1.5rem',
    marginBottom: '20px',
    color: '#4a9eff',
  },
  conversationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  conversationCard: {
    background: '#1a1a2e',
    border: '1px solid #3a3a4e',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  },
  conversationUser: {
    marginBottom: '15px',
  },
  conversationAssistant: {
    marginBottom: '10px',
  },
  conversationLabel: {
    color: '#667eea',
    fontSize: '0.9rem',
  },
  conversationText: {
    color: '#e0e0e0',
    lineHeight: '1.5',
    marginTop: '5px',
  },
  conversationTime: {
    fontSize: '0.75rem',
    color: '#888',
    textAlign: 'right',
  },
}

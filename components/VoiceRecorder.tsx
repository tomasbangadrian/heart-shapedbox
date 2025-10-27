'use client'

import { useState, useRef } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

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
      alert('Kunne ikke få tilgang til mikrofonen. Sjekk tillatelser.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
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
        body: JSON.stringify({ text }),
      })

      if (!chatResponse.ok) {
        throw new Error('Chat API feilet')
      }

      const { response, audioUrl } = await chatResponse.json()

      // Add assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])

      // Play TTS audio
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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🎤 Stemmeassistent</h1>
        <p style={styles.subtitle}>Trykk og hold for å snakke</p>
      </div>

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

      <div style={styles.messagesContainer}>
        <h2 style={styles.messagesTitle}>Samtalehistorikk</h2>
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
  recordingSection: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '40px',
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

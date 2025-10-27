'use client'

import { useEffect, useState } from 'react'

interface SpotifyPlayerProps {
  accessToken: string | null
  onDeviceReady?: (deviceId: string) => void
}

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void
    Spotify: any
  }
}

export default function SpotifyPlayer({ accessToken, onDeviceReady }: SpotifyPlayerProps) {
  const [player, setPlayer] = useState<any>(null)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!accessToken) return

    // Load Spotify Web Playback SDK
    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    document.body.appendChild(script)

    window.onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = new window.Spotify.Player({
        name: 'Voice Assistant Player',
        getOAuthToken: (cb: (token: string) => void) => {
          cb(accessToken)
        },
        volume: 0.5,
      })

      // Error handling
      spotifyPlayer.addListener('initialization_error', ({ message }: any) => {
        console.error('Initialization error:', message)
      })

      spotifyPlayer.addListener('authentication_error', ({ message }: any) => {
        console.error('Authentication error:', message)
      })

      spotifyPlayer.addListener('account_error', ({ message }: any) => {
        console.error('Account error:', message)
      })

      spotifyPlayer.addListener('playback_error', ({ message }: any) => {
        console.error('Playback error:', message)
      })

      // Ready
      spotifyPlayer.addListener('ready', ({ device_id }: any) => {
        console.log('Ready with Device ID', device_id)
        setDeviceId(device_id)
        setIsReady(true)
        if (onDeviceReady) {
          onDeviceReady(device_id)
        }
      })

      // Not Ready
      spotifyPlayer.addListener('not_ready', ({ device_id }: any) => {
        console.log('Device ID has gone offline', device_id)
        setIsReady(false)
      })

      // Connect to the player
      spotifyPlayer.connect()

      setPlayer(spotifyPlayer)
    }

    return () => {
      if (player) {
        player.disconnect()
      }
    }
  }, [accessToken])

  if (!accessToken) {
    return null
  }

  return (
    <div style={styles.container}>
      <div style={styles.status}>
        {isReady ? (
          <span style={styles.statusReady}>🎵 Spotify klar</span>
        ) : (
          <span style={styles.statusLoading}>⏳ Laster Spotify...</span>
        )}
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '10px',
    borderRadius: '8px',
    background: '#1DB954',
    marginBottom: '20px',
    textAlign: 'center',
  },
  status: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: 'white',
  },
  statusReady: {
    color: 'white',
  },
  statusLoading: {
    color: '#e0e0e0',
  },
}

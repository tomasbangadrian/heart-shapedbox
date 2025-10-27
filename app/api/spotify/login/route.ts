import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'https://heart-shapedbox.vercel.app/api/spotify/callback'

  // Scopes needed for Web Playback SDK and controlling playback
  const scopes = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-modify-playback-state',
    'user-read-playback-state',
  ].join(' ')

  const params = new URLSearchParams({
    client_id: clientId!,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes,
  })

  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`)
}

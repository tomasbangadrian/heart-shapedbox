import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://heart-shapedbox.vercel.app'}?error=spotify_auth_failed`)
  }

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://heart-shapedbox.vercel.app'}?error=no_code`)
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID!
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'https://heart-shapedbox.vercel.app/api/spotify/callback'

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token')
    }

    const data = await tokenResponse.json()

    // Redirect back to home with tokens in URL (will be handled by client)
    const params = new URLSearchParams({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in.toString(),
    })

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://heart-shapedbox.vercel.app'}?${params.toString()}`)
  } catch (error) {
    console.error('Spotify callback error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://heart-shapedbox.vercel.app'}?error=token_exchange_failed`)
  }
}

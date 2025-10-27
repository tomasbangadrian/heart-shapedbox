import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { uri, accessToken, deviceId } = await request.json()

    if (!uri || !accessToken) {
      return NextResponse.json(
        { error: 'Missing URI or access token' },
        { status: 400 }
      )
    }

    // Play track on Spotify
    const playResponse = await fetch(
      `https://api.spotify.com/v1/me/player/play${deviceId ? `?device_id=${deviceId}` : ''}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: [uri],
        }),
      }
    )

    if (!playResponse.ok) {
      const errorText = await playResponse.text()
      console.error('Spotify play error:', errorText)
      throw new Error('Failed to play track')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Spotify play error:', error)
    return NextResponse.json(
      { error: 'Failed to play track on Spotify' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json()

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Missing access token' },
        { status: 400 }
      )
    }

    console.log('📚 Fetching user Spotify library...')

    // Fetch user's saved/liked tracks (limit to 50 most recent for context efficiency)
    const savedTracksResponse = await fetch(
      'https://api.spotify.com/v1/me/tracks?limit=50',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!savedTracksResponse.ok) {
      console.error('❌ Failed to fetch saved tracks:', savedTracksResponse.status)
      return NextResponse.json(
        { error: 'Failed to fetch Spotify library' },
        { status: savedTracksResponse.status }
      )
    }

    const savedData = await savedTracksResponse.json()

    // Extract simplified track list for context
    const library = savedData.items.map((item: any) => ({
      track: item.track.name,
      artist: item.track.artists[0].name,
      uri: item.track.uri,
    }))

    console.log(`✅ Fetched ${library.length} tracks from user's library`)

    return NextResponse.json({
      library,
      count: library.length,
    })
  } catch (error: any) {
    console.error('❌ Library API error:', error.message)
    return NextResponse.json(
      { error: 'Failed to fetch library: ' + error.message },
      { status: 500 }
    )
  }
}

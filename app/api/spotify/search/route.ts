import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { query, accessToken } = await request.json()

    if (!query || !accessToken) {
      return NextResponse.json(
        { error: 'Missing query or access token' },
        { status: 400 }
      )
    }

    // Search for tracks on Spotify
    const searchParams = new URLSearchParams({
      q: query,
      type: 'track',
      limit: '1', // Just get the top result
    })

    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?${searchParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!searchResponse.ok) {
      throw new Error('Spotify search failed')
    }

    const data = await searchResponse.json()

    if (data.tracks.items.length === 0) {
      return NextResponse.json({ error: 'No tracks found' }, { status: 404 })
    }

    const track = data.tracks.items[0]

    return NextResponse.json({
      uri: track.uri,
      name: track.name,
      artist: track.artists[0].name,
      album: track.album.name,
      albumArt: track.album.images[0]?.url,
    })
  } catch (error) {
    console.error('Spotify search error:', error)
    return NextResponse.json(
      { error: 'Failed to search Spotify' },
      { status: 500 }
    )
  }
}

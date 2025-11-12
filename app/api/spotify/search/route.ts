import { NextRequest, NextResponse } from 'next/server'
import { buildSpotifyTrackSearch } from '@/lib/spotifySearch'

export async function POST(request: NextRequest) {
  try {
    const { query, track: trackName, artist: artistName, accessToken } = await request.json()

    if (!query || !accessToken) {
      return NextResponse.json(
        { error: 'Missing query or access token' },
        { status: 400 }
      )
    }

    console.log('🔍 Spotify search query:', query)
    console.log('🎵 Track:', trackName, 'Artist:', artistName)

    const { searchQuery, track: parsedTrack, artist } = buildSpotifyTrackSearch({
      query,
      trackName,
      artistName,
    })

    if (parsedTrack && artist) {
      console.log('🎯 Using advanced search with track/artist:', searchQuery)
    } else {
      console.log('🔎 Falling back to broad search:', searchQuery)
    }

    // Search for tracks on Spotify
    const searchParams = new URLSearchParams({
      q: searchQuery,
      type: 'track',
      limit: '5', // Get top 5 results for better matching
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
      console.error('❌ No tracks found for query:', searchQuery)
      return NextResponse.json({ error: 'No tracks found' }, { status: 404 })
    }

    // Log all results for debugging
    console.log(`✅ Found ${data.tracks.items.length} results:`)
    data.tracks.items.forEach((track: any, i: number) => {
      console.log(`  ${i + 1}. "${track.name}" by ${track.artists[0].name}`)
    })

    // Return the first (best) result
    const track = data.tracks.items[0]
    console.log(`🎵 Selected: "${track.name}" by ${track.artists[0].name}`)

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

import { NextRequest, NextResponse } from 'next/server'

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

    let searchQuery = query

    // If we have separate track and artist, use them for better search
    if (trackName && artistName) {
      // Use Spotify's advanced search syntax for precise matching
      // https://developer.spotify.com/documentation/web-api/reference/search
      searchQuery = `track:"${trackName}" artist:"${artistName}"`
      console.log('🎯 Using advanced search with extracted data:', searchQuery)
    } else {
      // Fallback: try to parse query into track and artist
      // Format: "song title artist name" or "song title by artist name"
      const byMatch = query.match(/(.+?)\s+(?:by\s+)?(.+)/)

      if (byMatch && byMatch.length >= 3) {
        const trackName = byMatch[1].trim()
        const artistName = byMatch[2].trim()

        searchQuery = `track:"${trackName}" artist:"${artistName}"`
        console.log('🎯 Using advanced search (parsed):', searchQuery)
      } else {
        // Fallback: try to extract last 2-3 words as artist
        const words = query.split(' ')
        if (words.length >= 3) {
          // Assume last 2-3 words are artist, rest is track
          const trackWords = words.slice(0, -2)
          const artistWords = words.slice(-2)

          searchQuery = `track:"${trackWords.join(' ')}" artist:"${artistWords.join(' ')}"`
          console.log('🎯 Guessing track/artist split:', searchQuery)
        }
      }
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

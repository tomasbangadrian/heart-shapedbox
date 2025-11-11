interface BuildSpotifyTrackSearchArgs {
  query: string
  trackName?: string | null
  artistName?: string | null
}

export interface SpotifyTrackSearchResult {
  searchQuery: string
  track?: string
  artist?: string
}

/**
 * Build a Spotify search query using the most precise information available.
 * Prefers explicit track/artist values but falls back to heuristics to split the query.
 */
export function buildSpotifyTrackSearch({
  query,
  trackName,
  artistName,
}: BuildSpotifyTrackSearchArgs): SpotifyTrackSearchResult {
  const cleanedQuery = normalizeQuery(query)

  const explicitTrack = trackName?.trim()
  const explicitArtist = artistName?.trim()

  if (explicitTrack && explicitArtist) {
    return {
      searchQuery: buildAdvancedSearch(explicitTrack, explicitArtist),
      track: explicitTrack,
      artist: explicitArtist,
    }
  }

  const { track, artist } = splitTrackAndArtist(cleanedQuery)

  if (track && artist) {
    return {
      searchQuery: buildAdvancedSearch(track, artist),
      track,
      artist,
    }
  }

  return {
    searchQuery: cleanedQuery || query.trim(),
    track: track || undefined,
    artist: artist || undefined,
  }
}

function buildAdvancedSearch(track: string, artist: string) {
  return `track:"${track}" artist:"${artist}"`
}

function normalizeQuery(query: string) {
  const collapsed = query.replace(/\s+/g, ' ').trim()
  const withoutPlay = collapsed.replace(/^(?:hey\s+spotify\s+)?(?:please\s+)?play\s+/i, '')

  const withoutPunctuation = withoutPlay.replace(/[.!?,]+$/g, '')

  return withoutPunctuation
    .replace(/\s*(on\s+spotify|please)\s*$/gi, '')
    .trim()
}

function splitTrackAndArtist(query: string): { track?: string; artist?: string } {
  if (!query) {
    return {}
  }

  const byMatch = findKeywordBoundary(query, 'by')
  if (byMatch) {
    const track = query.slice(0, byMatch.index).trim()
    const artist = query.slice(byMatch.index + byMatch.length).trim()
    if (track && artist) {
      return { track, artist }
    }
  }

  const words = query.split(' ')

  // Prefer splitting on last two words as artist (e.g., "great day for freedom pink floyd")
  if (words.length >= 4) {
    const trackWords = words.slice(0, -2)
    const artistWords = words.slice(-2)
    const track = trackWords.join(' ').trim()
    const artist = artistWords.join(' ').trim()
    if (track && artist) {
      return { track, artist }
    }
  }

  if (words.length >= 3) {
    const track = words.slice(0, -1).join(' ').trim()
    const artist = words[words.length - 1].trim()
    if (track && artist) {
      return { track, artist }
    }
  }

  return {}
}

function findKeywordBoundary(input: string, keyword: string): { index: number; length: number } | null {
  const lowered = input.toLowerCase()
  const target = ` ${keyword.toLowerCase()} `
  const index = lowered.lastIndexOf(target)
  if (index === -1) {
    return null
  }
  return { index, length: target.length }
}

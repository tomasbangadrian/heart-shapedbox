import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildSpotifyTrackSearch } from '../lib/spotifySearch'

describe('buildSpotifyTrackSearch', () => {
  it('prefers explicit track and artist arguments when provided', () => {
    const result = buildSpotifyTrackSearch({
      query: 'great day for freedom pink floyd',
      trackName: 'Great Day for Freedom',
      artistName: 'Pink Floyd',
    })

    assert.equal(result.searchQuery, 'track:"Great Day for Freedom" artist:"Pink Floyd"')
    assert.equal(result.track, 'Great Day for Freedom')
    assert.equal(result.artist, 'Pink Floyd')
  })

  it('extracts track and artist using the last "by" occurrence', () => {
    const result = buildSpotifyTrackSearch({
      query: 'great day for freedom by pink floyd',
    })

    assert.equal(result.searchQuery, 'track:"great day for freedom" artist:"pink floyd"')
    assert.equal(result.track, 'great day for freedom')
    assert.equal(result.artist, 'pink floyd')
  })

  it('handles queries without explicit "by" by using trailing words as artist', () => {
    const result = buildSpotifyTrackSearch({
      query: 'bohemian rhapsody queen',
    })

    assert.equal(result.searchQuery, 'track:"bohemian rhapsody" artist:"queen"')
    assert.equal(result.track, 'bohemian rhapsody')
    assert.equal(result.artist, 'queen')
  })

  it('removes trailing phrases like "on spotify" and punctuation', () => {
    const result = buildSpotifyTrackSearch({
      query: 'play great day for freedom by pink floyd on spotify!',
    })

    assert.equal(result.searchQuery, 'track:"great day for freedom" artist:"pink floyd"')
    assert.equal(result.track, 'great day for freedom')
    assert.equal(result.artist, 'pink floyd')
  })

  it('falls back to broad search when artist cannot be determined', () => {
    const result = buildSpotifyTrackSearch({
      query: 'aurora',
    })

    assert.equal(result.searchQuery, 'aurora')
    assert.equal(result.track, undefined)
    assert.equal(result.artist, undefined)
  })
})

import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

const SYSTEM_PROMPT = `You are an intelligent voice assistant that classifies user commands and provides appropriate responses.

Classify the user command as one of the following types:
1. SPOTIFY: Play music (example: "play [song]", "play [artist]", "play [song] by [artist]", "play [song] on spotify")
2. NAVIGATION: Get directions (example: "navigate to [place]", "directions to [address]")
3. VOICE_MESSAGE: Send voice message (example: "send voice message to [person]")
4. PURCHASE: Purchase something at a store (example: "pay [amount] at [store]")
5. DOOR: Open door (example: "open door at [address]")
6. VOLUME: Adjust AirPods volume (example: "set volume to 50%", "set it to 80%", "volume to 10%", "set volume to 100%")
7. QUESTION: Questions about facts or knowledge (example: "what is the capital of France?", "how many people live in Paris?", "who is the president?")
8. OTHER: Other requests

Respond in the following JSON format:
{
  "intent": "INTENT_TYPE",
  "response": "your response here",
  "query": "extracted query/address/data (see intent-specific rules below)"
}

Intent-specific rules for "query" field:

For SPOTIFY intent:
- ALWAYS extract song title and artist from the command
- Remove words like "play", "on spotify", "with", "by", etc.
- Include both song and artist in query
- Examples:
  * "play bohemian rhapsody" -> query: "bohemian rhapsody"
  * "play great day for freedom by pink floyd" -> query: "great day for freedom pink floyd"
  * "play the weeknd" -> query: "the weeknd"
  * "play comfortably numb by pink floyd" -> query: "comfortably numb pink floyd"

For DOOR intent:
- Extract the address exactly as spoken
- DO NOT expand or normalize yet (that will be done later)
- Examples:
  * "open door at Halsesgatet 13" -> query: "Halsesgatet 13"
  * "open the door at dyre halses gate 13" -> query: "dyre halses gate 13"

For NAVIGATION intent:
- Extract the destination address/place exactly as spoken
- Examples:
  * "navigate to Munkegata 5" -> query: "Munkegata 5"
  * "directions to the mall" -> query: "the mall"

Examples of complete responses:
- SPOTIFY: {"intent": "SPOTIFY", "response": "Searching for the song on Spotify", "query": "song artist"}
- NAVIGATION: {"intent": "NAVIGATION", "response": "Navigating to [place]", "query": "[place]"}
- PURCHASE: {"intent": "PURCHASE", "response": "Now paying [amount] at [store]", "query": null}
- DOOR: {"intent": "DOOR", "response": "Now opening the door at [address]", "query": "[address]"}
- VOICE_MESSAGE: {"intent": "VOICE_MESSAGE", "response": "Sending voice message to [person]", "query": null}
- VOLUME: {"intent": "VOLUME", "response": "Volume is now set to [percent]%", "query": null}
- QUESTION: {"intent": "QUESTION", "response": "Fact-based answer here", "query": null}

ALWAYS respond with valid JSON.`

// Normalize query based on intent using web search or reasoning
async function normalizeQuery(intent: string, query: string | null, originalText: string, userLibrary?: any[]): Promise<{ query: string | null; spotifyTrack?: string; spotifyArtist?: string }> {
  if (!query) return { query: null }

  try {
    console.log(`🧹 Normalizing ${intent} query:`, query)

    switch (intent) {
      case 'SPOTIFY': {
        // Fix artist/song name typos and extract track/artist separately
        const result = await normalizeSpotifyQuery(query, userLibrary)
        return {
          query: result.fullQuery,
          spotifyTrack: result.track,
          spotifyArtist: result.artist
        }
      }

      case 'DOOR':
      case 'NAVIGATION': {
        // Normalize Norwegian addresses
        const normalized = await normalizeAddress(query, originalText)
        return { query: normalized }
      }

      default:
        // No normalization needed for other intents
        return { query }
    }
  } catch (error: any) {
    console.error('❌ Normalization error:', error.message)
    // Return original query if normalization fails
    return { query }
  }
}

// Normalize Spotify queries and return structured data
async function normalizeSpotifyQuery(query: string, userLibrary?: any[]): Promise<{ track: string; artist: string; fullQuery: string }> {
  try {
    console.log('🎵 Normalizing Spotify query:', query)
    if (userLibrary && userLibrary.length > 0) {
      console.log(`📚 Using user library with ${userLibrary.length} tracks`)
    }

    // Build library context string
    const libraryContext = userLibrary && userLibrary.length > 0
      ? `\n\nUser's Spotify Library (${userLibrary.length} saved tracks):\n${userLibrary.map((t: any) => `- "${t.track}" by ${t.artist}`).join('\n')}\n`
      : ''

    // Use GPT-4 to extract and correct track and artist separately
    const normalizationPrompt = `You are a music expert. Extract and correct the song title and artist name from this query.
${libraryContext}
Important instructions:
1. If the query matches a song in the user's library, use the EXACT title and artist from the library
2. This resolves ambiguities (e.g., if user has "Thru the Eyes of Ruby" in library, use that exact title)
3. For common artist typos:
   - "pete floyd" → "Pink Floyd"
   - "led zeplin" → "Led Zeppelin"
   - "the weeknd" is CORRECT (not "the weekend")

Query: "${query}"

Return ONLY a JSON object in this exact format, nothing else:
{"track": "Song Title", "artist": "Artist Name"}

Examples:
${userLibrary && userLibrary.length > 0 ? 'User has library - prioritize exact matches from library' : ''}
Input: "through the eyes of ruby smashing pumpkins"
Output: {"track": "Thru the Eyes of Ruby", "artist": "The Smashing Pumpkins"}

Input: "thru the eyes of ruby smashing pumpkins"
Output: {"track": "Thru the Eyes of Ruby", "artist": "The Smashing Pumpkins"}

Input: "eye smashing pumpkins"
Output: {"track": "Eye", "artist": "The Smashing Pumpkins"}`

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: 'You are a music expert. Return ONLY valid JSON with track and artist. No explanations.' },
        { role: 'user', content: normalizationPrompt }
      ],
      max_tokens: 150,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })

    const result = completion.choices[0].message.content?.trim() || '{}'
    console.log('🤖 GPT result:', result)

    const parsed = JSON.parse(result)
    const track = parsed.track || ''
    const artist = parsed.artist || ''

    if (!track || !artist) {
      console.log('⚠️ Could not extract track/artist, using original query')
      return {
        track: query,
        artist: '',
        fullQuery: query
      }
    }

    const fullQuery = `${track} ${artist}`
    console.log(`✅ Normalized: Track="${track}", Artist="${artist}"`)

    return { track, artist, fullQuery }
  } catch (error: any) {
    console.error('❌ Spotify normalization error:', error.message)
    console.error('Full error:', error)
    return {
      track: query,
      artist: '',
      fullQuery: query
    }
  }
}

// Normalize Norwegian addresses using GPT-4 reasoning
async function normalizeAddress(address: string, originalText: string): Promise<string> {
  try {
    console.log('🏠 Normalizing address:', address)

    const normalizationPrompt = `You are an expert on Norwegian addresses in Trondheim. Your task is to normalize and correct Norwegian street addresses.

IMPORTANT: Handle common transcription errors:
- "Stockbacken" (Swedish-like) → "Stokkbekken" (correct Norwegian)
- "Halsesgatet" → "Dyre Halses gate"
- Foreign-sounding spellings might be Norwegian streets with different spelling

Known Trondheim addresses (since 2012+):
- Stokkbekken (not "Stockbacken" or "Stockbakken")
- Dyre Halses gate (not "Halsesgatet")
- Munkegata
- Elgeseter gate

Original command: "${originalText}"
Extracted address: "${address}"

Your task:
1. If address sounds Norwegian but spelled wrong, correct it (e.g., "Stockbacken" → "Stokkbekken")
2. Expand abbreviations
3. Add city "Trondheim" if missing
4. Add postal code if you know it
5. If address is completely unknown/invalid, return: "UNKNOWN: ${address}"

Return ONLY the normalized address, nothing else. No explanations.

Examples:
- "Halsesgatet 13" → "Dyre Halses gate 13, 7045 Trondheim"
- "Stockbacken 32" → "Stokkbekken 32, Trondheim"
- "Munkegata 5" → "Munkegata 5, 7013 Trondheim"

Normalized address:`

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: 'You are a Norwegian address expert for Trondheim. Return ONLY the corrected address. No explanations or notes.' },
        { role: 'user', content: normalizationPrompt }
      ],
      max_tokens: 150,
      temperature: 0.1, // Very low for consistent corrections
    })

    const gptResult = completion.choices[0].message.content?.trim() || address
    console.log('🤖 GPT normalized address:', gptResult)

    // Clean up response - remove any explanation text
    const cleanedResult = gptResult
      .replace(/^(normalized address:|address:|result:)/i, '')
      .trim()
      .replace(/^["']|["']$/g, '') // Remove quotes

    // If GPT says UNKNOWN, return just the address without explanation
    if (cleanedResult.startsWith('UNKNOWN:')) {
      console.log('⚠️ Address not recognized by GPT')
      return address // Return original rather than error message
    }

    console.log('✅ Final normalized address:', cleanedResult)
    return cleanedResult
  } catch (error: any) {
    console.error('❌ Address normalization error:', error.message)
    console.error('Full error:', error)
    return address
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text, hasSpotify, userLibrary } = await request.json()

    console.log('📝 User text:', text)

    if (!text) {
      return NextResponse.json(
        { error: 'No text received' },
        { status: 400 }
      )
    }

    // Check if Groq API key is configured
    if (!process.env.GROQ_API_KEY) {
      console.error('❌ GROQ_API_KEY is not set!')
      return NextResponse.json(
        { error: 'Groq API key is not configured' },
        { status: 500 }
      )
    }

    let parsedResponse: any
    let originalQuery: string | null = null

    try {
      // STEP 1: Classification - Get Groq response
      console.log('🤖 STEP 1: Calling Groq for classification with model: openai/gpt-oss-120b')
      const completion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text }
        ],
        max_tokens: 500,
        response_format: { type: 'json_object' },
      })

      const responseText = completion.choices[0].message.content || '{"intent": "OTHER", "response": "Sorry, I didn\'t understand that.", "query": null}'

      console.log('🤖 Raw Groq response:', responseText)

      // Parse JSON response
      try {
        parsedResponse = JSON.parse(responseText)
        console.log('✅ Parsed response:', parsedResponse)

        // Ensure all required fields exist
        if (!parsedResponse.intent) parsedResponse.intent = 'OTHER'
        if (!parsedResponse.response) parsedResponse.response = 'Sorry, I didn\'t understand that.'
        if (!parsedResponse.query) parsedResponse.query = null

      } catch (e) {
        console.error('❌ Failed to parse JSON:', e)
        console.error('Raw response was:', responseText)

        parsedResponse = {
          intent: 'OTHER',
          response: responseText || 'Sorry, I didn\'t understand that.',
          query: null
        }
      }

      // STEP 2: Normalization - Clean up query based on intent
      console.log('🧹 STEP 2: Normalizing query...')
      console.log('Intent:', parsedResponse.intent)
      console.log('Original query:', parsedResponse.query)

      originalQuery = parsedResponse.query
      const normalizeResult = await normalizeQuery(parsedResponse.intent, parsedResponse.query, text, userLibrary)

      parsedResponse.query = normalizeResult.query

      // Store Spotify track/artist for advanced search
      if (normalizeResult.spotifyTrack && normalizeResult.spotifyArtist) {
        parsedResponse.spotifyTrack = normalizeResult.spotifyTrack
        parsedResponse.spotifyArtist = normalizeResult.spotifyArtist
        console.log(`🎵 Extracted: Track="${normalizeResult.spotifyTrack}", Artist="${normalizeResult.spotifyArtist}"`)
      }

      console.log('After normalization:', parsedResponse.query)
      console.log('Was normalized?', originalQuery !== parsedResponse.query)

      if (originalQuery !== parsedResponse.query) {
        console.log(`✨ Query normalized: "${originalQuery}" → "${parsedResponse.query}"`)

        // Update response to reflect normalized query
        if (parsedResponse.intent === 'DOOR') {
          parsedResponse.response = `Now opening the door at ${parsedResponse.query}`
        } else if (parsedResponse.intent === 'NAVIGATION') {
          parsedResponse.response = `Navigating to ${parsedResponse.query}`
        }
      } else {
        console.log('⚠️ Query was NOT normalized (returned unchanged)')
      }

      // Check if Spotify login is needed
      if (parsedResponse.intent === 'SPOTIFY' && !hasSpotify) {
        parsedResponse.response = 'You must log in to Spotify first to play music'
      }
    } catch (chatError: any) {
      console.error('❌ Groq API error:', chatError)
      console.error('Error details:', {
        message: chatError.message,
        status: chatError.status,
        type: chatError.type,
        code: chatError.code
      })

      // Fallback response if Groq fails
      parsedResponse = {
        intent: 'OTHER',
        response: `Error with Groq: ${chatError.message || 'Unknown error'}. Check console for details.`,
        query: null
      }
    }

    // Generate TTS audio
    try {
      console.log('🔊 Generating TTS audio...')
      // @ts-ignore - Groq SDK type issue with audio.speech
      const ttsResponse = await groq.audio.speech.create({
        model: 'playai-tts',
        voice: 'Aaliyah-PlayAI',
        response_format: 'wav',
        input: parsedResponse.response,
      })

      // Convert audio to base64 data URL
      const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer())
      const audioBase64 = audioBuffer.toString('base64')
      const audioUrl = `data:audio/wav;base64,${audioBase64}`

      console.log('✅ Response ready')

      return NextResponse.json({
        response: parsedResponse.response,
        audioUrl: audioUrl,
        intent: parsedResponse.intent,
        spotifyQuery: parsedResponse.query,
        spotifyTrack: parsedResponse.spotifyTrack,
        spotifyArtist: parsedResponse.spotifyArtist,
        // Pipeline details for debugging
        pipelineDetails: {
          step1_transcription: text,
          step2_classification: {
            intent: parsedResponse.intent,
            rawQuery: originalQuery || parsedResponse.query,
          },
          step3_normalization: {
            originalQuery: originalQuery,
            normalizedQuery: parsedResponse.query,
            spotifyTrack: parsedResponse.spotifyTrack,
            spotifyArtist: parsedResponse.spotifyArtist,
            wasNormalized: originalQuery !== parsedResponse.query,
          },
          step4_finalResponse: parsedResponse.response,
        },
      })
    } catch (ttsError: any) {
      console.error('❌ TTS error:', ttsError.message)
      // Return response without audio if TTS fails
      return NextResponse.json({
        response: parsedResponse.response,
        audioUrl: null,
        intent: parsedResponse.intent,
        spotifyQuery: parsedResponse.query,
        spotifyTrack: parsedResponse.spotifyTrack,
        spotifyArtist: parsedResponse.spotifyArtist,
        // Pipeline details for debugging
        pipelineDetails: {
          step1_transcription: text,
          step2_classification: {
            intent: parsedResponse.intent,
            rawQuery: originalQuery || parsedResponse.query,
          },
          step3_normalization: {
            originalQuery: originalQuery,
            normalizedQuery: parsedResponse.query,
            spotifyTrack: parsedResponse.spotifyTrack,
            spotifyArtist: parsedResponse.spotifyArtist,
            wasNormalized: originalQuery !== parsedResponse.query,
          },
          step4_finalResponse: parsedResponse.response,
        },
      })
    }
  } catch (error: any) {
    console.error('❌ Chat API error:', error.message, error.stack)
    return NextResponse.json(
      { error: 'Error processing request: ' + error.message },
      { status: 500 }
    )
  }
}

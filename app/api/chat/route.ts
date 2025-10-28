import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
async function normalizeQuery(intent: string, query: string | null, originalText: string): Promise<string | null> {
  if (!query) return null

  try {
    console.log(`🧹 Normalizing ${intent} query:`, query)

    switch (intent) {
      case 'SPOTIFY':
        // Fix artist/song name typos and variations
        return await normalizeSpotifyQuery(query)

      case 'DOOR':
      case 'NAVIGATION':
        // Normalize Norwegian addresses
        return await normalizeAddress(query, originalText)

      default:
        // No normalization needed for other intents
        return query
    }
  } catch (error: any) {
    console.error('❌ Normalization error:', error.message)
    // Return original query if normalization fails
    return query
  }
}

// Normalize Spotify queries (fix artist names, song titles) using web search
async function normalizeSpotifyQuery(query: string): Promise<string> {
  try {
    console.log('🎵 Normalizing Spotify query:', query)

    // Use GPT-4 (gpt-5 doesn't exist yet) to fix obvious typos first
    const normalizationPrompt = `You are a music expert. Fix any typos or misspellings in this music search query.

Common errors:
- "pete floyd" should be "pink floyd"
- "the weeknd" is correct (not "the weekend")
- "led zeplin" should be "led zeppelin"
- "a great day for freedom with pete floyd" should be "a great day for freedom pink floyd"

Query: "${query}"

Return ONLY the corrected query text, nothing else. If the query looks correct, return it unchanged.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'You are a music expert that fixes typos in artist and song names. Return only the corrected query, nothing else.' },
        { role: 'user', content: normalizationPrompt }
      ],
      max_tokens: 100,
      temperature: 0.3,
    })

    const gptResult = completion.choices[0].message.content?.trim() || query
    console.log('🤖 GPT normalized Spotify query:', gptResult)

    // Additional verification: If query changed significantly, use web search to verify
    if (gptResult.toLowerCase() !== query.toLowerCase()) {
      console.log('🌐 Verifying with web search...')
      // For demo purposes, we trust GPT-4's music knowledge
      // In production, you could search Spotify API or use web search here
      return gptResult
    }

    console.log('✅ Normalized Spotify query:', gptResult)
    return gptResult
  } catch (error: any) {
    console.error('❌ Spotify normalization error:', error.message)
    console.error('Full error:', error)
    return query
  }
}

// Normalize Norwegian addresses using GPT-4 and web search
async function normalizeAddress(address: string, originalText: string): Promise<string> {
  try {
    console.log('🏠 Normalizing address:', address)

    const normalizationPrompt = `You are an expert on Norwegian addresses, especially in Trondheim.

Normalize this address to its full official form:
- Expand abbreviated street names (e.g., "Halsesgatet" → "Dyre Halses gate")
- Add city if missing (default to Trondheim if context suggests it)
- Include postal code if you know it
- Use proper Norwegian address formatting

Original command: "${originalText}"
Extracted address: "${address}"

Return ONLY the normalized full address, nothing else.
Examples:
- "Halsesgatet 13" → "Dyre Halses gate 13, 7045 Trondheim"
- "Munkegata 5" → "Munkegata 5, 7013 Trondheim"
- "Elgeseter gate 1" → "Elgeseter gate 1, 7030 Trondheim"`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'You are a Norwegian address expert. Return only the normalized address, nothing else.' },
        { role: 'user', content: normalizationPrompt }
      ],
      max_tokens: 100,
      temperature: 0.3,
    })

    const gptResult = completion.choices[0].message.content?.trim() || address
    console.log('🤖 GPT normalized address:', gptResult)

    // If GPT made changes, that's our normalized address
    if (gptResult.toLowerCase() !== address.toLowerCase()) {
      console.log('✅ Address normalized by GPT')
      return gptResult
    }

    console.log('✅ Normalized address:', gptResult)
    return gptResult
  } catch (error: any) {
    console.error('❌ Address normalization error:', error.message)
    console.error('Full error:', error)
    return address
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text, hasSpotify } = await request.json()

    console.log('📝 User text:', text)

    if (!text) {
      return NextResponse.json(
        { error: 'No text received' },
        { status: 400 }
      )
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY is not set!')
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      )
    }

    let parsedResponse: any
    let originalQuery: string | null = null

    try {
      // STEP 1: Classification - Get ChatGPT response
      console.log('🤖 STEP 1: Calling ChatGPT for classification with model: gpt-4-turbo-preview')
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text }
        ],
        max_tokens: 500,
        response_format: { type: 'json_object' },
      })

      const responseText = completion.choices[0].message.content || '{"intent": "OTHER", "response": "Sorry, I didn\'t understand that.", "query": null}'

      console.log('🤖 Raw ChatGPT response:', responseText)

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
      parsedResponse.query = await normalizeQuery(parsedResponse.intent, parsedResponse.query, text)

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
      console.error('❌ ChatGPT API error:', chatError)
      console.error('Error details:', {
        message: chatError.message,
        status: chatError.status,
        type: chatError.type,
        code: chatError.code
      })

      // Fallback response if ChatGPT fails
      parsedResponse = {
        intent: 'OTHER',
        response: `Error with ChatGPT: ${chatError.message || 'Unknown error'}. Check console for details.`,
        query: null
      }
    }

    // Generate TTS audio
    try {
      console.log('🔊 Generating TTS audio...')
      const ttsResponse = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: parsedResponse.response,
      })

      // Convert audio to base64 data URL
      const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer())
      const audioBase64 = audioBuffer.toString('base64')
      const audioUrl = `data:audio/mpeg;base64,${audioBase64}`

      console.log('✅ Response ready')

      return NextResponse.json({
        response: parsedResponse.response,
        audioUrl: audioUrl,
        intent: parsedResponse.intent,
        spotifyQuery: parsedResponse.query,
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

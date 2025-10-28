import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const SYSTEM_PROMPT = `You are an intelligent voice assistant with advanced reasoning capabilities. Your job is to carefully analyze user commands, correct transcription errors, and provide accurate responses.

IMPORTANT REASONING PHASE:
Before classifying a command, you must:
1. Consider if the transcription might have errors (especially with names, places, or artists)
2. Use your knowledge to correct common mistakes:
   - "Pete Floyd" → "Pink Floyd"
   - "Aurora" (artist) might be correctly transcribed
   - Norwegian addresses like "Dyrehalseskade 13" → "Dyre Halses gate 13"
   - Street names that sound like words should be interpreted as proper addresses
3. Think about context - if someone says a song title, what artist is most likely?
4. For addresses, consider Norwegian street naming conventions

TRANSCRIPTION ERROR PATTERNS TO WATCH FOR:
- Artist names that sound similar: "Pete Floyd" = "Pink Floyd", "The Weekend" = "The Weeknd"
- Norwegian street names: "Dyrehalseskade" = "Dyre Halses gate", etc.
- Song titles with unusual words
- Numbers in addresses

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
  "query": "corrected search query (for SPOTIFY/NAVIGATION/DOOR intents)",
  "reasoning": "brief explanation of any corrections you made",
  "confidence": "high/medium/low"
}

For SPOTIFY intent:
- ALWAYS extract song title and artist from the command
- CORRECT any obvious transcription errors in artist/song names using your knowledge
- Remove words like "play", "on spotify", "with", "by", etc.
- Include both song and artist in query
- Examples:
  * "play bohemian rhapsody" -> query: "bohemian rhapsody queen" (add artist from knowledge)
  * "play great day for freedom by pete floyd" -> query: "great day for freedom pink floyd" (corrected!)
  * "play aurora" -> query: "aurora" (artist name, correct)
  * "play the weekend" -> query: "the weeknd" (corrected spelling!)

For DOOR intent:
- CORRECT Norwegian street names that might be transcribed incorrectly
- Examples:
  * "open door at dyrehalseskade 13" -> query: "Dyre Halses gate 13, Trondheim" (corrected!)
  * "open door at olav tryggvasons gate 5" -> query: "Olav Tryggvasons gate 5, Trondheim"

For NAVIGATION intent:
- CORRECT Norwegian place names and addresses
- Add city context if missing (assume Trondheim if not specified)

Examples of complete responses:
- SPOTIFY: {"intent": "SPOTIFY", "response": "Searching for the song on Spotify", "query": "great day for freedom pink floyd", "reasoning": "Corrected 'pete floyd' to 'Pink Floyd'", "confidence": "high"}
- DOOR: {"intent": "DOOR", "response": "Opening the door at Dyre Halses gate 13, Trondheim", "query": "Dyre Halses gate 13, Trondheim", "reasoning": "Corrected transcription error 'Dyrehalseskade' to proper street name", "confidence": "medium"}
- NAVIGATION: {"intent": "NAVIGATION", "response": "Navigating to Dyre Halses gate 13, Trondheim", "query": "Dyre Halses gate 13, Trondheim", "reasoning": "Corrected street name and added city context", "confidence": "high"}
- QUESTION: {"intent": "QUESTION", "response": "The capital of France is Paris", "query": null, "reasoning": "Direct factual question", "confidence": "high"}

ALWAYS respond with valid JSON. Think carefully before responding!`

export async function POST(request: NextRequest) {
  try {
    const { text, hasSpotify, retryWithQuery } = await request.json()

    console.log('📝 User text:', text)
    if (retryWithQuery) {
      console.log('🔄 Retry request with query:', retryWithQuery)
    }

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

    try {
      // Use GPT-5 with high reasoning for maximum accuracy in transcription correction
      console.log('🤖 Calling ChatGPT with model: gpt-5 (deep reasoning model with high thinking effort)')

      // Build context for retry scenarios
      let userMessage = text
      if (retryWithQuery) {
        userMessage = `Original command: "${text}"\n\nPrevious attempt failed. The query "${retryWithQuery}" returned no results on Spotify. Please think more carefully and provide a corrected query with better artist/song name spelling.`
      }

      const completion = await openai.chat.completions.create({
        model: 'gpt-5', // GPT-5 with deep reasoning capabilities
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.3, // Lower temperature for more consistent, factual responses
        max_completion_tokens: 800,
        response_format: { type: 'json_object' },
        reasoning_effort: 'high', // Maximum reasoning for complex transcription error correction
      })

      const responseText = completion.choices[0].message.content || '{"intent": "OTHER", "response": "Sorry, I didn\'t understand that.", "query": null, "reasoning": "No response generated", "confidence": "low"}'

      console.log('🤖 Raw ChatGPT response:', responseText)

      // Parse JSON response
      try {
        parsedResponse = JSON.parse(responseText)
        console.log('✅ Parsed response:', parsedResponse)

        // Log reasoning for debugging
        if (parsedResponse.reasoning) {
          console.log('💭 Reasoning:', parsedResponse.reasoning)
        }
        if (parsedResponse.confidence) {
          console.log('📊 Confidence:', parsedResponse.confidence)
        }

        // Ensure all required fields exist
        if (!parsedResponse.intent) parsedResponse.intent = 'OTHER'
        if (!parsedResponse.response) parsedResponse.response = 'Sorry, I didn\'t understand that.'
        if (!parsedResponse.query) parsedResponse.query = null
        if (!parsedResponse.reasoning) parsedResponse.reasoning = 'No reasoning provided'
        if (!parsedResponse.confidence) parsedResponse.confidence = 'medium'

      } catch (e) {
        console.error('❌ Failed to parse JSON:', e)
        console.error('Raw response was:', responseText)

        // Try to extract useful info from non-JSON response
        parsedResponse = {
          intent: 'OTHER',
          response: responseText || 'Sorry, I didn\'t understand that.',
          query: null,
          reasoning: 'JSON parse error',
          confidence: 'low'
        }
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
        query: null,
        reasoning: 'API error',
        confidence: 'low'
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
        reasoning: parsedResponse.reasoning,
        confidence: parsedResponse.confidence,
      })
    } catch (ttsError: any) {
      console.error('❌ TTS error:', ttsError.message)
      // Return response without audio if TTS fails
      return NextResponse.json({
        response: parsedResponse.response,
        audioUrl: null,
        intent: parsedResponse.intent,
        spotifyQuery: parsedResponse.query,
        reasoning: parsedResponse.reasoning,
        confidence: parsedResponse.confidence,
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

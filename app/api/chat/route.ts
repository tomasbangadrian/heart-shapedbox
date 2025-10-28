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
  "query": "search terms for Spotify (only for SPOTIFY intent)"
}

For SPOTIFY intent:
- ALWAYS extract song title and artist from the command
- Remove words like "play", "on spotify", "with", "by", etc.
- Include both song and artist in query
- Examples:
  * "play bohemian rhapsody" -> query: "bohemian rhapsody"
  * "play great day for freedom by pink floyd" -> query: "great day for freedom pink floyd"
  * "play great day for freedom by pink floyd on spotify" -> query: "great day for freedom pink floyd"
  * "play the weeknd" -> query: "the weeknd"
  * "play comfortably numb by pink floyd" -> query: "comfortably numb pink floyd"

Examples of complete responses:
- SPOTIFY: {"intent": "SPOTIFY", "response": "Searching for the song on Spotify", "query": "song artist"}
- NAVIGATION: {"intent": "NAVIGATION", "response": "You are at [place]. Go [direction]", "query": null}
- PURCHASE: {"intent": "PURCHASE", "response": "Now paying [amount] at [store]", "query": null}
- DOOR: {"intent": "DOOR", "response": "Now opening the door at [address]", "query": null}
- VOICE_MESSAGE: {"intent": "VOICE_MESSAGE", "response": "Sending voice message to [person]", "query": null}
- VOLUME: {"intent": "VOLUME", "response": "Volume is now set to [percent]%", "query": null}
- QUESTION: {"intent": "QUESTION", "response": "Fact-based answer here", "query": null}

ALWAYS respond with valid JSON.`

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

    try {
      // Get ChatGPT response (without JSON mode for better compatibility)
      console.log('🤖 Calling ChatGPT with model: gpt-5')
      const completion = await openai.chat.completions.create({
        model: 'gpt-5', // More widely available than GPT-4
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text }
        ],
        max_completion_tokens: 500,
        response_format: { type: 'json_object' }, // This model supports JSON mode
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

        // Try to extract useful info from non-JSON response
        parsedResponse = {
          intent: 'OTHER',
          response: responseText || 'Sorry, I didn\'t understand that.',
          query: null
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
      })
    } catch (ttsError: any) {
      console.error('❌ TTS error:', ttsError.message)
      // Return response without audio if TTS fails
      return NextResponse.json({
        response: parsedResponse.response,
        audioUrl: null,
        intent: parsedResponse.intent,
        spotifyQuery: parsedResponse.query,
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

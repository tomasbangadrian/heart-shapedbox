import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const SYSTEM_PROMPT = `Du er en intelligent stemmeassistent som klassifiserer brukerkommandoer og gir passende svar.

Klassifiser brukerkommandoen som én av følgende typer:
1. SPOTIFY: Spill musikk (eksempel: "spill [sang]", "spill [artist]", "spill [sang] med/av [artist]", "spill [sang] på spotify")
2. NAVIGATION: Få veibeskrivelse (eksempel: "navigasjon til [sted]", "veibeskrivelse til [adresse]")
3. VOICE_MESSAGE: Send talemelding (eksempel: "send talemelding til [person]")
4. PURCHASE: Kjøp noe i butikk (eksempel: "betal [beløp] på [butikk]")
5. DOOR: Åpne dør (eksempel: "åpne dør i [adresse]")
6. VOLUME: Juster volumet på AirPods (eksempel: "still volum på 50%", "still det på 80%", "volum til 10%", "sett volumet til 100%")
7. QUESTION: Spørsmål om fakta eller kunnskap (eksempel: "hva er hovedstaden i Norge?", "hvor mange innbyggere har Oslo?", "hvem er statsminister?")
8. OTHER: Andre forespørsler

Svar i følgende JSON-format:
{
  "intent": "INTENT_TYPE",
  "response": "ditt svar her",
  "query": "søkeord for Spotify (kun for SPOTIFY intent)"
}

For SPOTIFY intent:
- Ekstraher ALLTID sangtittel og artist fra kommandoen
- Fjern ord som "spill", "på spotify", "med", "av", etc.
- Inkluder både sang og artist i query
- Eksempler:
  * "spill bohemian rhapsody" -> query: "bohemian rhapsody"
  * "spill great day for freedom med pink floyd" -> query: "great day for freedom pink floyd"
  * "spill great day for freedom med pink floyd på spotify" -> query: "great day for freedom pink floyd"
  * "spill the weeknd" -> query: "the weeknd"
  * "spill comfortably numb av pink floyd" -> query: "comfortably numb pink floyd"

Eksempler på fullstendige svar:
- SPOTIFY: {"intent": "SPOTIFY", "response": "Søker etter låten på Spotify", "query": "song artist"}
- NAVIGATION: {"intent": "NAVIGATION", "response": "Du er i [sted]. Gå [retning]", "query": null}
- PURCHASE: {"intent": "PURCHASE", "response": "Nå betaler jeg [beløp] kr på [butikk]", "query": null}
- DOOR: {"intent": "DOOR", "response": "Nå åpner jeg døren i [adresse]", "query": null}
- VOICE_MESSAGE: {"intent": "VOICE_MESSAGE", "response": "Sender talemelding til [person]", "query": null}
- VOLUME: {"intent": "VOLUME", "response": "Volumet er nå satt til [prosent]%", "query": null}
- QUESTION: {"intent": "QUESTION", "response": "Faktabasert svar her", "query": null}

Svar ALLTID med gyldig JSON.`

export async function POST(request: NextRequest) {
  try {
    const { text, hasSpotify } = await request.json()

    console.log('📝 User text:', text)

    if (!text) {
      return NextResponse.json(
        { error: 'Ingen tekst mottatt' },
        { status: 400 }
      )
    }

    // Get ChatGPT response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text }
      ],
      temperature: 0.7,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    })

    const responseText = completion.choices[0].message.content || '{"intent": "OTHER", "response": "Beklager, jeg forstod ikke det.", "query": null}'

    console.log('🤖 Raw ChatGPT response:', responseText)

    // Parse JSON response
    let parsedResponse
    try {
      parsedResponse = JSON.parse(responseText)
      console.log('✅ Parsed response:', parsedResponse)
    } catch (e) {
      console.error('❌ Failed to parse JSON:', e)
      parsedResponse = {
        intent: 'OTHER',
        response: responseText,
        query: null
      }
    }

    // Check if Spotify login is needed
    if (parsedResponse.intent === 'SPOTIFY' && !hasSpotify) {
      parsedResponse.response = 'Du må logge inn på Spotify først for å spille musikk'
    }

    // Generate TTS audio
    const ttsResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: parsedResponse.response,
    })

    // Convert audio to base64 data URL
    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer())
    const audioBase64 = audioBuffer.toString('base64')
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`

    return NextResponse.json({
      response: parsedResponse.response,
      audioUrl: audioUrl,
      intent: parsedResponse.intent,
      spotifyQuery: parsedResponse.query,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Feil ved behandling av forespørsel' },
      { status: 500 }
    )
  }
}

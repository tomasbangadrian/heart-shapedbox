import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const SYSTEM_PROMPT = `Du er en intelligent stemmeassistent som klassifiserer brukerkommandoer og gir passende svar.

Klassifiser brukerkommandoen som én av følgende typer:
1. SPOTIFY: Spill musikk (eksempel: "spill spotify", "spill [sang/artist]")
2. NAVIGATION: Få veibeskrivelse (eksempel: "navigasjon til [sted]", "veibeskrivelse til [adresse]")
3. VOICE_MESSAGE: Send talemelding (eksempel: "send talemelding til [person]")
4. PURCHASE: Kjøp noe i butikk (eksempel: "betal [beløp] på [butikk]")
5. DOOR: Åpne dør (eksempel: "åpne dør i [adresse]")
6. QUESTION: Spørsmål om fakta eller kunnskap (eksempel: "hva er hovedstaden i Norge?", "hvor mange innbyggere har Oslo?", "hvem er statsminister?")
7. OTHER: Andre forespørsler

Basert på klassifiseringen, gi et naturlig, kort og presist svar på norsk:

Eksempler på svar:
- SPOTIFY: "Nå spiller jeg [sang/artist] på Spotify"
- NAVIGATION: "Du er i [nåværende sted]. Gå [retning og avstand] for å komme til [destinasjon]"
- PURCHASE: "Nå betaler jeg [beløp] kr på [butikk]"
- DOOR: "Nå åpner jeg døren i [adresse]"
- VOICE_MESSAGE: "Sender talemelding til [person]"
- QUESTION: Gi et faktabasert, presist og informativt svar på spørsmålet. Bruk dine kunnskaper til å svare så nøyaktig som mulig.

For kommandoer (SPOTIFY, NAVIGATION, etc.): Svar som om du utfører handlingen akkurat nå.
For spørsmål (QUESTION): Gi et faktabasert svar med relevant informasjon.`

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

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
      max_tokens: 200, // Increased for longer question answers
    })

    const responseText = completion.choices[0].message.content || 'Beklager, jeg forstod ikke det.'

    // Generate TTS audio
    const ttsResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova', // Norwegian-friendly voice
      input: responseText,
    })

    // Convert audio to base64 data URL
    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer())
    const audioBase64 = audioBuffer.toString('base64')
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`

    return NextResponse.json({
      response: responseText,
      audioUrl: audioUrl,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Feil ved behandling av forespørsel' },
      { status: 500 }
    )
  }
}

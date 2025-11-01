import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file received' },
        { status: 400 }
      )
    }

    // Convert File to format Groq expects
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',
      temperature: 0,
      language: 'en', // English
    })

    return NextResponse.json({ text: transcription.text })
  } catch (error) {
    console.error('Whisper API error:', error)
    return NextResponse.json(
      { error: 'Error transcribing audio' },
      { status: 500 }
    )
  }
}

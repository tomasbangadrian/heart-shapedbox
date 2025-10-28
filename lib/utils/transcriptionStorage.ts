import { createClient } from '@/lib/supabase/client'

export const saveTranscription = async (
  userId: string,
  audioRecordingId: string | null,
  transcribedText: string,
  language: string = 'no',
  confidence: number | null = null
) => {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('transcriptions')
      .insert({
        user_id: userId,
        audio_recording_id: audioRecordingId,
        transcribed_text: transcribedText,
        language,
        confidence,
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Feil ved lagring av transkripsjon:', error)
    throw error
  }
}

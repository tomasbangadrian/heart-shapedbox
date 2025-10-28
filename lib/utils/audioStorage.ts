import { createClient } from '@/lib/supabase/client'

export const uploadAudio = async (audioBlob: Blob, userId: string): Promise<string | null> => {
  const supabase = createClient()

  // Opprett en unik filnavn
  const fileName = `${userId}/${Date.now()}.webm`

  try {
    // Last opp til Supabase Storage
    const { data, error } = await supabase.storage
      .from('audio-recordings')
      .upload(fileName, audioBlob, {
        contentType: 'audio/webm',
        upsert: false,
      })

    if (error) throw error

    // Få offentlig URL
    const { data: urlData } = supabase.storage
      .from('audio-recordings')
      .getPublicUrl(fileName)

    return urlData.publicUrl
  } catch (error) {
    console.error('Feil ved opplasting av lyd:', error)
    return null
  }
}

export const saveAudioRecord = async (
  userId: string,
  audioUrl: string,
  durationSeconds: number,
  fileSizeBytes: number
) => {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('audio_recordings')
      .insert({
        user_id: userId,
        audio_url: audioUrl,
        duration_seconds: durationSeconds,
        file_size_bytes: fileSizeBytes,
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Feil ved lagring av lydopptak:', error)
    throw error
  }
}

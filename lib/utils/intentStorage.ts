import { createClient } from '@/lib/supabase/client'

export const saveIntentClassification = async (
  userId: string,
  transcriptionId: string,
  intentCategory: string,
  confidence: number | null = null,
  extractedEntities: any = {},
  gptResponse: string
) => {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('intent_classifications')
      .insert({
        user_id: userId,
        transcription_id: transcriptionId,
        intent_category: intentCategory,
        confidence,
        extracted_entities: extractedEntities,
        gpt_response: gptResponse,
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Feil ved lagring av intent:', error)
    throw error
  }
}

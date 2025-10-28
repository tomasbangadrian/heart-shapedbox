'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/context/AuthContext'

interface Conversation {
  id: string
  user_input: string
  assistant_response: string
  audio_response_url: string | null
  created_at: string
}

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (!user) {
      setConversations([])
      setLoading(false)
      return
    }

    fetchConversations()
  }, [user])

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setConversations(data || [])
    } catch (error) {
      console.error('Feil ved henting av samtaler:', error)
    } finally {
      setLoading(false)
    }
  }

  const addConversation = async (
    userInput: string,
    assistantResponse: string,
    audioResponseUrl: string | null = null,
    transcriptionId: string | null = null,
    intentClassificationId: string | null = null
  ) => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          user_input: userInput,
          assistant_response: assistantResponse,
          audio_response_url: audioResponseUrl,
          transcription_id: transcriptionId,
          intent_classification_id: intentClassificationId,
        })
        .select()
        .single()

      if (error) throw error

      // Legg til i local state
      setConversations((prev) => [data, ...prev])

      return data
    } catch (error) {
      console.error('Feil ved lagring av samtale:', error)
      throw error
    }
  }

  const deleteConversation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id)

      if (error) throw error

      setConversations((prev) => prev.filter((conv) => conv.id !== id))
    } catch (error) {
      console.error('Feil ved sletting av samtale:', error)
      throw error
    }
  }

  return {
    conversations,
    loading,
    addConversation,
    deleteConversation,
    refetch: fetchConversations,
  }
}

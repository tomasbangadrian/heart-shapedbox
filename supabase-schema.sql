-- Heart-Shaped Box - Supabase Database Schema
-- Kjør dette skriptet i Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- 1. Profiler (utvider Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Lydopptak (lagrer audio blobs)
CREATE TABLE IF NOT EXISTS audio_recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  audio_url TEXT NOT NULL,
  duration_seconds NUMERIC,
  file_size_bytes BIGINT,
  mime_type TEXT DEFAULT 'audio/webm',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Transkripsjoner (Whisper resultater)
CREATE TABLE IF NOT EXISTS transcriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  audio_recording_id UUID REFERENCES audio_recordings(id) ON DELETE CASCADE,
  transcribed_text TEXT NOT NULL,
  language TEXT,
  confidence NUMERIC,
  whisper_model TEXT DEFAULT 'whisper-1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Intent klassifiseringer
CREATE TABLE IF NOT EXISTS intent_classifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transcription_id UUID REFERENCES transcriptions(id) ON DELETE CASCADE,
  intent_category TEXT NOT NULL, -- 'spotify', 'navigation', 'purchase', 'door_open', 'voice_message', 'other'
  confidence NUMERIC,
  extracted_entities JSONB, -- JSON med entities som artist, song, location, etc.
  gpt_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Samtalehistorikk (full konversasjon)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transcription_id UUID REFERENCES transcriptions(id) ON DELETE CASCADE,
  intent_classification_id UUID REFERENCES intent_classifications(id) ON DELETE CASCADE,
  user_input TEXT NOT NULL,
  assistant_response TEXT NOT NULL,
  audio_response_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indekser for bedre ytelse
CREATE INDEX IF NOT EXISTS idx_audio_recordings_user_id ON audio_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id ON transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_intent_classifications_user_id ON intent_classifications(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);

-- Row Level Security (RLS) Policies
-- Brukere kan bare se og endre sine egne data

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Audio recordings policies
DROP POLICY IF EXISTS "Users can view own recordings" ON audio_recordings;
CREATE POLICY "Users can view own recordings" ON audio_recordings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own recordings" ON audio_recordings;
CREATE POLICY "Users can insert own recordings" ON audio_recordings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own recordings" ON audio_recordings;
CREATE POLICY "Users can delete own recordings" ON audio_recordings
  FOR DELETE USING (auth.uid() = user_id);

-- Transcriptions policies
DROP POLICY IF EXISTS "Users can view own transcriptions" ON transcriptions;
CREATE POLICY "Users can view own transcriptions" ON transcriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transcriptions" ON transcriptions;
CREATE POLICY "Users can insert own transcriptions" ON transcriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Intent classifications policies
DROP POLICY IF EXISTS "Users can view own intents" ON intent_classifications;
CREATE POLICY "Users can view own intents" ON intent_classifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own intents" ON intent_classifications;
CREATE POLICY "Users can insert own intents" ON intent_classifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Conversations policies
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
CREATE POLICY "Users can insert own conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;
CREATE POLICY "Users can delete own conversations" ON conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Funksjon for å automatisk oppdatere updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Ferdig! Du kan nå bruke databasen i applikasjonen.

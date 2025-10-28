# Supabase Setup Guide for Heart-Shaped Box 🎵

## Oversikt

Dette prosjektet bruker Supabase for:
- ✅ Brukerautentisering (sign up, sign in, sign out)
- ✅ Database for samtalehistorikk, transkripsjoner og intent-analyser
- ✅ Storage for lydopptak
- ✅ Row Level Security (RLS) for brukerisolering

## 🚀 Hurtigstart

Din Supabase-konfigrasjon er allerede satt opp:
- **Project URL**: `https://gramsodqfojvimlkxgzh.supabase.co`
- **Anon Key**: Allerede konfigurert i `.env.local`

### Steg 1: Opprett Database Tabeller

1. Gå til [Supabase Dashboard](https://supabase.com/dashboard)
2. Velg ditt prosjekt: **gramsodqfojvimlkxgzh**
3. Klikk på **SQL Editor** i venstremenyen
4. Klikk **New Query**
5. Kopier innholdet fra `supabase-schema.sql` filen
6. Lim inn i SQL-editoren
7. Klikk **Run** (eller trykk Ctrl/Cmd + Enter)

Dette oppretter alle nødvendige tabeller:
- `profiles` - Brukerprofilene
- `audio_recordings` - Lydopptak
- `transcriptions` - Transkripsjoner fra Whisper
- `intent_classifications` - Intent-analyser fra GPT
- `conversations` - Full samtalehistorikk

### Steg 2: Opprett Storage Bucket

1. I Supabase Dashboard, klikk på **Storage** i venstremenyen
2. Klikk **New bucket**
3. Fyll inn:
   - **Name**: `audio-recordings`
   - **Public bucket**: ✅ Ja (huk av)
4. Klikk **Create bucket**

### Steg 3: Konfigurer Storage Policies (Valgfritt, men anbefalt)

For å sikre at kun innloggede brukere kan laste opp lyd:

1. Gå til **Storage** → **Policies**
2. Velg `audio-recordings` bucket
3. Klikk **New Policy**
4. Velg **Create a custom policy**
5. Fyll inn:

**Policy for INSERT (opplasting):**
```sql
CREATE POLICY "Users can upload own audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audio-recordings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy for SELECT (nedlasting/visning):**
```sql
CREATE POLICY "Users can view own audio"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'audio-recordings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy for DELETE (sletting):**
```sql
CREATE POLICY "Users can delete own audio"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'audio-recordings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Steg 4: Test Applikasjonen

1. Sørg for at du har alle miljøvariabler i `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://gramsodqfojvimlkxgzh.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[din-key]
   OPENAI_API_KEY=[din-openai-key]
   ```

2. Start dev-serveren:
   ```bash
   npm run dev
   ```

3. Åpne [http://localhost:3000](http://localhost:3000)

4. Registrer en ny bruker

5. Test stemmeassistenten!

## 📊 Database Struktur

### Tabeller

#### profiles
- `id` (UUID) - Primærnøkkel, referanse til auth.users
- `email` (TEXT) - Brukerens e-post
- `full_name` (TEXT) - Fullt navn
- `avatar_url` (TEXT) - Profilbilde URL
- `created_at` (TIMESTAMP) - Opprettelsestidspunkt
- `updated_at` (TIMESTAMP) - Sist oppdatert

#### audio_recordings
- `id` (UUID) - Primærnøkkel
- `user_id` (UUID) - Eier av opptaket
- `audio_url` (TEXT) - URL til lydopptak i Storage
- `duration_seconds` (NUMERIC) - Varighet i sekunder
- `file_size_bytes` (BIGINT) - Filstørrelse
- `mime_type` (TEXT) - MIME-type (audio/webm)
- `created_at` (TIMESTAMP) - Opprettelsestidspunkt

#### transcriptions
- `id` (UUID) - Primærnøkkel
- `user_id` (UUID) - Eier
- `audio_recording_id` (UUID) - Referanse til lydopptak
- `transcribed_text` (TEXT) - Transkribert tekst fra Whisper
- `language` (TEXT) - Språk
- `confidence` (NUMERIC) - Konfidensverdi
- `whisper_model` (TEXT) - Modell brukt (whisper-1)
- `created_at` (TIMESTAMP) - Opprettelsestidspunkt

#### intent_classifications
- `id` (UUID) - Primærnøkkel
- `user_id` (UUID) - Eier
- `transcription_id` (UUID) - Referanse til transkripsjon
- `intent_category` (TEXT) - Intent-type (spotify, navigation, etc.)
- `confidence` (NUMERIC) - Konfidensverdi
- `extracted_entities` (JSONB) - Ekstraherte entities
- `gpt_response` (TEXT) - GPT-respons
- `created_at` (TIMESTAMP) - Opprettelsestidspunkt

#### conversations
- `id` (UUID) - Primærnøkkel
- `user_id` (UUID) - Eier
- `transcription_id` (UUID) - Referanse til transkripsjon
- `intent_classification_id` (UUID) - Referanse til intent
- `user_input` (TEXT) - Brukerens input
- `assistant_response` (TEXT) - Assistentens svar
- `audio_response_url` (TEXT) - URL til TTS-respons
- `created_at` (TIMESTAMP) - Opprettelsestidspunkt

## 🔒 Sikkerhet

### Row Level Security (RLS)

Alle tabeller har RLS aktivert med følgende policyer:
- Brukere kan bare se sine egne data
- Brukere kan bare opprette data knyttet til seg selv
- Brukere kan slette sine egne data

### Storage Security

Storage bucket `audio-recordings` er konfigurert med policyer som:
- Kun autentiserte brukere kan laste opp
- Brukere kan bare se sine egne filer
- Filer organiseres i mapper basert på bruker-ID

## 🧪 Testing

For å teste at alt fungerer:

1. **Test autentisering:**
   - Registrer en ny bruker
   - Logg ut
   - Logg inn igjen

2. **Test stemmeopptak:**
   - Klikk og hold for å snakke
   - Sjekk at transkripsjon vises
   - Sjekk at respons kommer tilbake

3. **Test datalagring:**
   - Gå til Supabase Dashboard → Table Editor
   - Sjekk at data vises i tabellene

4. **Test samtalehistorikk:**
   - Refresh siden
   - Sjekk at historikken vises nederst

## 🚀 Deploy til Vercel

Når du deployer til Vercel:

1. Legg til miljøvariabler i Vercel Dashboard:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://gramsodqfojvimlkxgzh.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[din-key]
   OPENAI_API_KEY=[din-key]
   SPOTIFY_CLIENT_ID=[din-id]
   SPOTIFY_CLIENT_SECRET=[din-secret]
   SPOTIFY_REDIRECT_URI=https://din-app.vercel.app/api/spotify/callback
   NEXT_PUBLIC_BASE_URL=https://din-app.vercel.app
   ```

2. Deploy:
   ```bash
   vercel --prod
   ```

## 📝 Viktige Notater

- ⚠️ **IKKE commit** `.env.local` til Git (allerede i .gitignore)
- ⚠️ **IKKE del** Supabase ANON key offentlig (men den er OK å bruke i frontend)
- ⚠️ **ALDRI del** Supabase SERVICE_ROLE key
- ✅ Supabase ANON key er trygg å bruke i frontend-kode
- ✅ RLS policyer beskytter mot uautorisert tilgang

## 🐛 Feilsøking

### "User not found" error
- Sjekk at du er logget inn
- Verifiser at `auth.uid()` returnerer bruker-ID i RLS policyer

### RLS policies blokkerer data
- Sjekk at RLS policies er aktivert
- Test policies i SQL Editor med `SELECT * FROM [table]`

### Audio upload feiler
- Sjekk at Storage bucket `audio-recordings` eksisterer
- Verifiser at bucket er public
- Kontroller storage policies

### Ingen data vises
- Åpne Developer Console (F12) og sjekk for feil
- Verifiser at API-kall lykkes
- Sjekk database i Supabase Table Editor

## 📚 Ressurser

- [Supabase Dokumentasjon](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Storage](https://supabase.com/docs/guides/storage)

## 🆘 Support

Hvis du har problemer:
1. Sjekk Supabase Dashboard → Logs for feilmeldinger
2. Sjekk browser console for feil
3. Verifiser at alle miljøvariabler er korrekt satt
4. Se dokumentasjonen ovenfor

Lykke til med Heart-Shaped Box! 🎵🚀

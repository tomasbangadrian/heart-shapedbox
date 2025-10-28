# Vercel Deploy Guide 🚀

## ✅ Hva du MÅ legge til i Vercel

Gå til [Vercel Dashboard](https://vercel.com/dashboard) → Ditt prosjekt → Settings → Environment Variables

### Legg til disse variablene:

```bash
# OpenAI API Key (du har allerede lagt til denne ✅)
OPENAI_API_KEY=sk-din-openai-api-key-her

# Supabase Credentials (VIKTIG - må legges til!)
NEXT_PUBLIC_SUPABASE_URL=https://gramsodqfojvimlkxgzh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyYW1zb2RxZm9qdmltbGt4Z3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1ODIxNDYsImV4cCI6MjA3NzE1ODE0Nn0.DWjxEGZoOD3M25KSy1vkwB2V_LibGV_68BoYBnKMXIs

# Base URL (erstatt med din Vercel URL)
NEXT_PUBLIC_BASE_URL=https://din-app.vercel.app

# Spotify (valgfritt - hvis du vil bruke Spotify-funksjonalitet)
SPOTIFY_CLIENT_ID=din-spotify-client-id
SPOTIFY_CLIENT_SECRET=din-spotify-client-secret
SPOTIFY_REDIRECT_URI=https://din-app.vercel.app/api/spotify/callback
```

## 📋 Steg-for-steg:

### 1. Åpne Vercel Dashboard
```
https://vercel.com/dashboard
```

### 2. Velg prosjektet ditt
Klikk på "heart-shapedbox" (eller navnet på prosjektet ditt)

### 3. Gå til Settings → Environment Variables
```
Settings (øverst) → Environment Variables (i sidemenyen)
```

### 4. Legg til hver variabel
For hver variabel:
1. Klikk **Add New**
2. **Key**: (navn på variabelen, f.eks. `NEXT_PUBLIC_SUPABASE_URL`)
3. **Value**: (verdien fra over)
4. **Environment**: Velg alle (Production, Preview, Development)
5. Klikk **Save**

### Viktige variabler du MUST legge til:

#### ✅ Supabase URL
```
Key: NEXT_PUBLIC_SUPABASE_URL
Value: https://gramsodqfojvimlkxgzh.supabase.co
```

#### ✅ Supabase Anon Key
```
Key: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyYW1zb2RxZm9qdmltbGt4Z3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1ODIxNDYsImV4cCI6MjA3NzE1ODE0Nn0.DWjxEGZoOD3M25KSy1vkwB2V_LibGV_68BoYBnKMXIs
```

#### ✅ Base URL (oppdater med din faktiske Vercel URL)
```
Key: NEXT_PUBLIC_BASE_URL
Value: https://din-app.vercel.app
```

### 5. Redeploy etter å ha lagt til variabler
Etter at alle variabler er lagt til:
1. Gå til **Deployments**
2. Klikk på **...** (tre prikker) på siste deployment
3. Klikk **Redeploy**

Eller push en ny commit:
```bash
git commit --allow-empty -m "Trigger redeploy"
git push
```

## 🎯 Hvorfor Supabase variabler MÅ være i Vercel?

Supabase-integrasjonen bruker disse variablene for:
- ✅ Brukerautentisering (login/logout)
- ✅ Database tilkobling
- ✅ Storage for lydopptak
- ✅ Row Level Security (RLS)

**Uten disse vil applikasjonen ikke fungere i produksjon!**

## ⚠️ Viktig om sikkerhet:

### ✅ TRYGT å dele (brukes i frontend):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BASE_URL`

Disse er prefixet med `NEXT_PUBLIC_` og er designet for å være synlige i frontend-koden.

### 🔒 ALDRI DEL (backend-only):
- `OPENAI_API_KEY`
- `SPOTIFY_CLIENT_SECRET`
- Supabase `SERVICE_ROLE` key (hvis du får en)

## 📱 Hva skjer med .env.local?

### ❌ IKKE commit til GitHub:
`.env.local` er allerede i `.gitignore` og skal IKKE pushes til GitHub.

### ✅ Brukes kun lokalt:
`.env.local` er for **lokal utvikling** og blir ikke brukt i Vercel.

### ✅ Vercel bruker Environment Variables:
Vercel leser miljøvariabler fra **Settings → Environment Variables**, IKKE fra `.env.local`.

## 🧪 Test deployment:

1. **Deploy til Vercel:**
   ```bash
   git push
   ```

2. **Åpne produksjons-URL:**
   ```
   https://din-app.vercel.app
   ```

3. **Test:**
   - Kan du se login-skjemaet?
   - Kan du registrere en bruker?
   - Kan du logge inn?
   - Kan du bruke stemmeassistenten?

## 🐛 Feilsøking:

### "Supabase is not defined" eller lignende feil:
- ✅ Sjekk at `NEXT_PUBLIC_SUPABASE_URL` er lagt til i Vercel
- ✅ Sjekk at `NEXT_PUBLIC_SUPABASE_ANON_KEY` er lagt til i Vercel
- ✅ Redeploy etter å ha lagt til variabler

### "User not authenticated" eller lignende:
- ✅ Sjekk at Supabase SQL-skjemaet er kjørt
- ✅ Sjekk at RLS policies er aktivert
- ✅ Test at login fungerer lokalt først

### Applikasjonen fungerer lokalt men ikke i Vercel:
- ✅ Sammenlign miljøvariabler i `.env.local` vs Vercel
- ✅ Sjekk Vercel Function Logs for feilmeldinger
- ✅ Sjekk browser console for feil

## 📊 Sjekkliste før deploy:

- [ ] Kjørt SQL-skjema i Supabase
- [ ] Opprettet `audio-recordings` storage bucket i Supabase
- [ ] Lagt til `NEXT_PUBLIC_SUPABASE_URL` i Vercel
- [ ] Lagt til `NEXT_PUBLIC_SUPABASE_ANON_KEY` i Vercel
- [ ] Lagt til `OPENAI_API_KEY` i Vercel (allerede gjort ✅)
- [ ] Oppdatert `NEXT_PUBLIC_BASE_URL` med faktisk Vercel URL
- [ ] Redeployed etter å ha lagt til variabler
- [ ] Testet at login fungerer i produksjon
- [ ] Testet at stemmeassistent fungerer i produksjon

## 🎉 Ferdig!

Når alle miljøvariabler er lagt til og du har redeployed, skal alt fungere! 🚀

**Husk:** Vercel trenger Supabase-variablene for at autentisering og database skal fungere!

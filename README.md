# 🎤 Stemmeassistent - Voice Assistant

En intelligent stemmeassistent bygget med Next.js, OpenAI Whisper, og ChatGPT. Appen lar deg gi stemmekommandoer som blir transkribert, klassifisert og besvart med både tekst og tale.

## ✨ Funksjoner

- 🎙️ **Stemmeopptag**: Hold inne knappen for å snakke
- 🗣️ **Speech-to-Text**: Bruker OpenAI Whisper for å konvertere tale til tekst
- 🤖 **Intent Classification**: ChatGPT klassifiserer kommandoen din (Spotify, navigasjon, kjøp, døråpning, volumkontroll, spørsmål, etc.)
- 🔊 **Text-to-Speech**: Får lydsvar tilbake med OpenAI TTS
- 🎵 **Spotify Integration**: Ekte Spotify Web Playback - spill musikk direkte i nettleseren!
- 💬 **Samtalehistorikk**: Se alle dine tidligere kommandoer og svar

## 🎯 Støttede Kommandoer

Assistenten kan håndtere:

- **Spotify**: "Spill [sang/artist] på Spotify"
- **Navigasjon**: "Navigasjon til [sted]", "Veibeskrivelse til [adresse]"
- **Kjøp**: "Betal [beløp] på [butikk]"
- **Døråpning**: "Åpne dør i [adresse]"
- **Talemelding**: "Send talemelding til [person]"
- **Volumkontroll**: "Still volum på 50%", "Still det på 80%", "Sett volumet til 10%"
- **Spørsmål**: "Hva er hovedstaden i Norge?", "Hvor mange innbyggere har Oslo?", "Hvem er statsminister?"
- Og mer!

## 🚀 Kom i gang

### Forutsetninger

- Node.js 18+ installert
- En OpenAI API-nøkkel ([få den her](https://platform.openai.com/api-keys))

### Installasjon

1. **Klon prosjektet** (hvis ikke allerede gjort):
   ```bash
   git clone <repository-url>
   cd heart-shapedbox
   ```

2. **Installer avhengigheter**:
   ```bash
   npm install
   ```

3. **Sett opp miljøvariabler**:
   ```bash
   cp .env.example .env.local
   ```

   Rediger `.env.local` og legg inn dine API-nøkler:
   ```
   OPENAI_API_KEY=sk-din-api-nøkkel-her
   SPOTIFY_CLIENT_ID=din-spotify-client-id
   SPOTIFY_CLIENT_SECRET=din-spotify-client-secret
   SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

4. **Start utviklingsserveren**:
   ```bash
   npm run dev
   ```

5. **Åpne appen**:
   Gå til [http://localhost:3000](http://localhost:3000) i nettleseren din

## 🎵 Spotify Setup

For å få Spotify-integrasjon til å fungere, må du sette opp en Spotify Developer App:

### Steg 1: Opprett Spotify App

1. Gå til [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Logg inn med din Spotify-konto
3. Klikk "Create app"
4. Fyll inn:
   - **App name**: `Voice Assistant` (eller hva du vil)
   - **App description**: En beskrivelse
   - **Website**: Din Vercel URL (f.eks. `https://heart-shapedbox.vercel.app`)
   - **Redirect URIs**: Legg til:
     - For produksjon: `https://your-app.vercel.app/api/spotify/callback`
     - For lokal testing: `http://localhost:3000/api/spotify/callback`
   - **APIs used**: Velg begge:
     - ✅ Web API
     - ✅ Web Playback SDK
5. Aksepter Spotify's Terms of Service
6. Klikk "Save"

### Steg 2: Få API Credentials

1. Klikk på appen du nettopp opprettet
2. Gå til "Settings"
3. Kopier **Client ID** og **Client Secret**
4. Legg disse inn i `.env.local` filen din

### Steg 3: Bruk Spotify

1. Start appen
2. Klikk på "🎵 Logg inn med Spotify" knappen
3. Godkjenn tilgangene Spotify ber om
4. Nå kan du si ting som:
   - "Spill Bohemian Rhapsody"
   - "Spill Aurora"
   - "Spill The Weeknd"

**Viktig**: Spotify Web Playback SDK krever at du har **Spotify Premium**!

## 📦 Deploy til Vercel

### Metode 1: Via Vercel Dashboard (Anbefalt)

1. Gå til [vercel.com](https://vercel.com)
2. Klikk "Add New..." → "Project"
3. Importer ditt GitHub/GitLab/Bitbucket repository
4. Vercel vil automatisk detektere Next.js-prosjektet
5. Legg til miljøvariabler:
   - `OPENAI_API_KEY`: Din OpenAI API-nøkkel
   - `SPOTIFY_CLIENT_ID`: Din Spotify Client ID
   - `SPOTIFY_CLIENT_SECRET`: Din Spotify Client Secret
   - `SPOTIFY_REDIRECT_URI`: `https://your-app.vercel.app/api/spotify/callback`
   - `NEXT_PUBLIC_BASE_URL`: `https://your-app.vercel.app`
6. Klikk "Deploy"

### Metode 2: Via Vercel CLI

1. **Installer Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Logg inn**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Legg til miljøvariabel**:
   ```bash
   vercel env add OPENAI_API_KEY
   ```
   Lim inn din OpenAI API-nøkkel når du blir spurt.

5. **Deploy til produksjon**:
   ```bash
   vercel --prod
   ```

### Etter Deployment

- Appen din vil være tilgjengelig på en URL som `https://your-app.vercel.app`
- Gi nettleseren tilgang til mikrofonen når du blir spurt
- Start å snakke!

## 🛠️ Prosjektstruktur

```
heart-shapedbox/
├── app/
│   ├── api/
│   │   ├── whisper/        # Whisper API endpoint (STT)
│   │   │   └── route.ts
│   │   └── chat/           # ChatGPT API endpoint (classification + TTS)
│   │       └── route.ts
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Hovedside
│   └── globals.css         # Globale stiler
├── components/
│   └── VoiceRecorder.tsx   # Hovedkomponent for stemmeopptak
├── public/                 # Statiske filer
├── .env.example           # Eksempel på miljøvariabler
├── next.config.js         # Next.js konfigurasjon
├── package.json           # Avhengigheter
└── tsconfig.json          # TypeScript konfigurasjon
```

## 🔧 Tilpasning

### Endre Systemprompten

For å endre hvordan assistenten oppfører seg, rediger `SYSTEM_PROMPT` i `app/api/chat/route.ts`.

### Legge til nye Intent-typer

1. Oppdater `SYSTEM_PROMPT` i `app/api/chat/route.ts`
2. Legg til eksempler for hvordan assistenten skal svare

### Endre TTS-stemme

I `app/api/chat/route.ts`, endre `voice` parameteren:
- Tilgjengelige stemmer: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`

## 📝 API Endepunkter

### POST /api/whisper
Konverterer lydfil til tekst.

**Request**: FormData med `audio` fil
**Response**: `{ text: string }`

### POST /api/chat
Klassifiserer tekst og returnerer svar med lyd.

**Request**: `{ text: string }`
**Response**: `{ response: string, audioUrl: string }`

## 🔐 Sikkerhet

- **VIKTIG**: Ikke commit `.env.local` til git
- API-nøklene dine er kun tilgjengelige på serversiden
- Alle API-kall går gjennom Next.js API routes (ikke direkte fra klienten)

## 🐛 Feilsøking

### "Kunne ikke få tilgang til mikrofonen"
- Sjekk at nettleseren har tillatelse til å bruke mikrofonen
- Forsikre deg om at du bruker HTTPS (eller localhost)

### "Whisper API feilet"
- Sjekk at `OPENAI_API_KEY` er riktig satt
- Verifiser at API-nøkkelen har tilgang til Whisper API

### Build feiler
- Kjør `npm install` på nytt
- Slett `node_modules` og `.next` mapper og installer på nytt

## 📚 Teknologier

- [Next.js 14](https://nextjs.org/) - React framework
- [OpenAI API](https://platform.openai.com/) - Whisper, GPT-4, TTS
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vercel](https://vercel.com/) - Deployment platform

## 📄 Lisens

Dette prosjektet er åpen kildekode og tilgjengelig for bruk.

## 🤝 Bidra

Føl deg fri til å åpne issues eller pull requests for forbedringer!

---

**Laget med ❤️ og AI**

# 🎤 Stemmeassistent - Voice Assistant

En intelligent stemmeassistent bygget med Next.js, OpenAI Whisper, og ChatGPT. Appen lar deg gi stemmekommandoer som blir transkribert, klassifisert og besvart med både tekst og tale.

## ✨ Funksjoner

- 🎙️ **Stemmeopptag**: Hold inne knappen for å snakke
- 🗣️ **Speech-to-Text**: Bruker OpenAI Whisper for å konvertere tale til tekst
- 🤖 **Intent Classification**: ChatGPT klassifiserer kommandoen din (Spotify, navigasjon, kjøp, døråpning, etc.)
- 🔊 **Text-to-Speech**: Får lydsvar tilbake med OpenAI TTS
- 💬 **Samtalehistorikk**: Se alle dine tidligere kommandoer og svar

## 🎯 Støttede Kommandoer

Assistenten kan håndtere:

- **Spotify**: "Spill [sang/artist] på Spotify"
- **Navigasjon**: "Navigasjon til [sted]", "Veibeskrivelse til [adresse]"
- **Kjøp**: "Betal [beløp] på [butikk]"
- **Døråpning**: "Åpne dør i [adresse]"
- **Talemelding**: "Send talemelding til [person]"
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

   Rediger `.env.local` og legg inn din OpenAI API-nøkkel:
   ```
   OPENAI_API_KEY=sk-din-api-nøkkel-her
   ```

4. **Start utviklingsserveren**:
   ```bash
   npm run dev
   ```

5. **Åpne appen**:
   Gå til [http://localhost:3000](http://localhost:3000) i nettleseren din

## 📦 Deploy til Vercel

### Metode 1: Via Vercel Dashboard (Anbefalt)

1. Gå til [vercel.com](https://vercel.com)
2. Klikk "Add New..." → "Project"
3. Importer ditt GitHub/GitLab/Bitbucket repository
4. Vercel vil automatisk detektere Next.js-prosjektet
5. Legg til miljøvariabel:
   - Navn: `OPENAI_API_KEY`
   - Verdi: Din OpenAI API-nøkkel
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

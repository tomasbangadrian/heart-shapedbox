# 🎤 Voice Assistant

An intelligent voice assistant built with Next.js, Groq Whisper, and Groq LLM. The app lets you give voice commands that are transcribed, classified, and answered with both text and speech.

## ✨ Features

- 🎙️ **Voice Recording**: Press and hold the button to speak
- 🗣️ **Speech-to-Text**: Uses Groq Whisper Large V3 for ultra-fast speech to text conversion
- 🤖 **Intent Classification**: Groq's openai/gpt-oss-120b classifies your command (Spotify, navigation, purchase, door opening, volume control, questions, etc.)
- 🌐 **Web Search Integration**: Real-time web search via Serper.dev for factual questions and validation
- 🔊 **Text-to-Speech**: Get audio responses back with Groq PlayAI TTS
- 🎵 **Spotify Integration**: Real Spotify Web Playback - play music directly in your browser!
- 💬 **Conversation History**: See all your previous commands and responses
- 📊 **Confidence Scoring**: Multi-source validation for higher accuracy

## 🎯 Supported Commands

The assistant can handle:

- **Spotify**: "Play [song/artist] on Spotify"
- **Navigation**: "Navigate to [place]", "Directions to [address]"
- **Purchase**: "Pay [amount] at [store]"
- **Door Opening**: "Open door at [address]"
- **Voice Message**: "Send voice message to [person]"
- **Volume Control**: "Set volume to 50%", "Set it to 80%", "Set volume to 10%"
- **Questions**: "What is the capital of France?", "How many people live in Paris?", "Who is the president?"
- And more!

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- A Groq API key ([get it here](https://console.groq.com/keys))

### Installation

1. **Clone the project** (if not already done):
   ```bash
   git clone <repository-url>
   cd heart-shapedbox
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your API keys:
   ```
   GROQ_API_KEY=gsk-your-api-key-here
   SPOTIFY_CLIENT_ID=your-spotify-client-id
   SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
   SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   SERPER_API_KEY=your-serper-api-key-here  # Optional: for web search
   ```

   **Note**: Web search is optional. Get a free Serper API key (50 searches/month) at [serper.dev](https://serper.dev)

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open the app**:
   Go to [http://localhost:3000](http://localhost:3000) in your browser

## 🎵 Spotify Setup

To get Spotify integration working, you need to set up a Spotify Developer App:

### Step 1: Create Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create app"
4. Fill in:
   - **App name**: `Voice Assistant` (or whatever you want)
   - **App description**: A description
   - **Website**: Your Vercel URL (e.g. `https://heart-shapedbox.vercel.app`)
   - **Redirect URIs**: Add:
     - For production: `https://your-app.vercel.app/api/spotify/callback`
     - For local testing: `http://localhost:3000/api/spotify/callback`
   - **APIs used**: Select both:
     - ✅ Web API
     - ✅ Web Playback SDK
5. Accept Spotify's Terms of Service
6. Click "Save"

### Step 2: Get API Credentials

1. Click on the app you just created
2. Go to "Settings"
3. Copy **Client ID** and **Client Secret**
4. Add these to your `.env.local` file

### Step 3: Use Spotify

1. Start the app
2. Click on the "🎵 Log in with Spotify" button
3. Approve the permissions Spotify requests
4. Now you can say things like:
   - "Play Bohemian Rhapsody"
   - "Play Aurora"
   - "Play The Weeknd"

**Important**: Spotify Web Playback SDK requires you to have **Spotify Premium**!

## 🌐 Web Search Setup (Optional)

The assistant can answer factual questions using real-time web search via Serper.dev:

### Step 1: Get Serper API Key

1. Go to [serper.dev](https://serper.dev)
2. Sign up (no credit card required)
3. Get your API key from the dashboard
4. Free tier: 50 searches per month

### Step 2: Add to Environment

Add to your `.env.local`:
```
SERPER_API_KEY=your-api-key-here
```

For Vercel deployment, add `SERPER_API_KEY` to environment variables in Vercel dashboard.

### Step 3: Test Web Search

Try asking:
- "What is the population of Paris?"
- "Who won the Super Bowl in 2024?"
- "What is the weather in Trondheim?"

The assistant will:
1. Search the web in real-time
2. Return the answer with source
3. Show confidence score in logs

**Benefits:**
- ✅ Validates Spotify queries (confirms artist/song exists)
- ✅ Answers factual questions with current data
- ✅ Confidence scoring for result quality
- ✅ Graceful fallback if web search fails

See [WEB_SEARCH_SETUP.md](./WEB_SEARCH_SETUP.md) for detailed setup guide.

## 📦 Deploy to Vercel

### Method 1: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New..." → "Project"
3. Import your GitHub/GitLab/Bitbucket repository
4. Vercel will automatically detect the Next.js project
5. Add environment variables:
   - `GROQ_API_KEY`: Your Groq API key
   - `SPOTIFY_CLIENT_ID`: Your Spotify Client ID
   - `SPOTIFY_CLIENT_SECRET`: Your Spotify Client Secret
   - `SPOTIFY_REDIRECT_URI`: `https://your-app.vercel.app/api/spotify/callback`
   - `NEXT_PUBLIC_BASE_URL`: `https://your-app.vercel.app`
   - `SERPER_API_KEY`: Your Serper API key (optional, for web search)
6. Click "Deploy"

### Method 2: Via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Log in**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Add environment variable**:
   ```bash
   vercel env add GROQ_API_KEY
   ```
   Paste your Groq API key when prompted.

5. **Deploy to production**:
   ```bash
   vercel --prod
   ```

### After Deployment

- Your app will be available at a URL like `https://your-app.vercel.app`
- Give the browser access to the microphone when prompted
- Start speaking!

## 🛠️ Project Structure

```
heart-shapedbox/
├── app/
│   ├── api/
│   │   ├── whisper/        # Whisper API endpoint (STT)
│   │   │   └── route.ts
│   │   ├── chat/           # LLM API endpoint (classification + normalization + TTS)
│   │   │   └── route.ts
│   │   ├── search/
│   │   │   └── web/        # Web search API endpoint (Serper)
│   │   │       └── route.ts
│   │   └── spotify/        # Spotify API endpoints
│   │       ├── login/
│   │       ├── callback/
│   │       ├── search/
│   │       ├── play/
│   │       └── library/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page
│   └── globals.css         # Global styles
├── components/
│   ├── VoiceRecorder.tsx   # Main voice recording component
│   └── SpotifyPlayer.tsx   # Spotify Web Playback SDK component
├── public/                 # Static files
├── .env.example            # Example environment variables
├── WEB_SEARCH_SETUP.md     # Web search integration guide
├── IMPLEMENTATION_GAP_ANALYSIS.md  # Architecture analysis
├── next.config.js          # Next.js configuration
├── package.json            # Dependencies
└── tsconfig.json           # TypeScript configuration
```

## 🔧 Customization

### Change the System Prompt

To change how the assistant behaves, edit `SYSTEM_PROMPT` in `app/api/chat/route.ts`.

### Add New Intent Types

1. Update `SYSTEM_PROMPT` in `app/api/chat/route.ts`
2. Add examples for how the assistant should respond

### Change TTS Voice

In `app/api/chat/route.ts`, change the `voice` parameter:
- Available voices: Check [Groq PlayAI documentation](https://console.groq.com/docs/speech-text) for available voices
- Default: `Aaliyah-PlayAI`

## 📝 API Endpoints

### POST /api/whisper
Converts audio file to text.

**Request**: FormData with `audio` file
**Response**: `{ text: string }`

### POST /api/chat
Classifies text and returns response with audio.

**Request**: `{ text: string }`
**Response**: `{ response: string, audioUrl: string }`

## 🔐 Security

- **IMPORTANT**: Don't commit `.env.local` to git
- Your API keys are only available on the server side
- All API calls go through Next.js API routes (not directly from the client)

## 🐛 Troubleshooting

### "Could not access microphone"
- Check that the browser has permission to use the microphone
- Make sure you're using HTTPS (or localhost)

### "Whisper API failed"
- Check that `GROQ_API_KEY` is correctly set
- Verify that the API key has access to Groq API

### Build fails
- Run `npm install` again
- Delete `node_modules` and `.next` folders and reinstall

## 📚 Technologies

- [Next.js 14](https://nextjs.org/) - React framework
- [Groq API](https://console.groq.com/) - Ultra-fast inference for Whisper Large V3, openai/gpt-oss-120b, and PlayAI TTS
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vercel](https://vercel.com/) - Deployment platform

## 📄 License

This project is open source and available for use.

## 🤝 Contributing

Feel free to open issues or pull requests for improvements!

---

**Made with ❤️ and AI**

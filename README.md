# 🎤 Voice Assistant

An intelligent voice assistant built with Next.js, OpenAI Whisper, and ChatGPT. The app lets you give voice commands that are transcribed, classified, and answered with both text and speech.

## ✨ Features

- 🎙️ **Voice Recording**: Press and hold the button to speak
- 🗣️ **Speech-to-Text**: Uses OpenAI Whisper to convert speech to text
- 🤖 **Intent Classification**: ChatGPT classifies your command (Spotify, navigation, purchase, door opening, volume control, questions, etc.)
- 🔊 **Text-to-Speech**: Get audio responses back with OpenAI TTS
- 🎵 **Spotify Integration**: Real Spotify Web Playback - play music directly in your browser!
- 💬 **Conversation History**: See all your previous commands and responses

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
- An OpenAI API key ([get it here](https://platform.openai.com/api-keys))

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
   OPENAI_API_KEY=sk-your-api-key-here
   SPOTIFY_CLIENT_ID=your-spotify-client-id
   SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
   SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

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

## 📦 Deploy to Vercel

### Method 1: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New..." → "Project"
3. Import your GitHub/GitLab/Bitbucket repository
4. Vercel will automatically detect the Next.js project
5. Add environment variables:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `SPOTIFY_CLIENT_ID`: Your Spotify Client ID
   - `SPOTIFY_CLIENT_SECRET`: Your Spotify Client Secret
   - `SPOTIFY_REDIRECT_URI`: `https://your-app.vercel.app/api/spotify/callback`
   - `NEXT_PUBLIC_BASE_URL`: `https://your-app.vercel.app`
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
   vercel env add OPENAI_API_KEY
   ```
   Paste your OpenAI API key when prompted.

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
│   │   └── chat/           # ChatGPT API endpoint (classification + TTS)
│   │       └── route.ts
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page
│   └── globals.css         # Global styles
├── components/
│   └── VoiceRecorder.tsx   # Main component for voice recording
├── public/                 # Static files
├── .env.example           # Example environment variables
├── next.config.js         # Next.js configuration
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript configuration
```

## 🔧 Customization

### Change the System Prompt

To change how the assistant behaves, edit `SYSTEM_PROMPT` in `app/api/chat/route.ts`.

### Add New Intent Types

1. Update `SYSTEM_PROMPT` in `app/api/chat/route.ts`
2. Add examples for how the assistant should respond

### Change TTS Voice

In `app/api/chat/route.ts`, change the `voice` parameter:
- Available voices: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`

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
- Check that `OPENAI_API_KEY` is correctly set
- Verify that the API key has access to Whisper API

### Build fails
- Run `npm install` again
- Delete `node_modules` and `.next` folders and reinstall

## 📚 Technologies

- [Next.js 14](https://nextjs.org/) - React framework
- [OpenAI API](https://platform.openai.com/) - Whisper, GPT-4, TTS
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vercel](https://vercel.com/) - Deployment platform

## 📄 License

This project is open source and available for use.

## 🤝 Contributing

Feel free to open issues or pull requests for improvements!

---

**Made with ❤️ and AI**

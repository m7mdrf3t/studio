# Firebase Studio (Frontend)

This is the frontend for the Firebase Studio project, built with Next.js.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file with the following variables:
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_voice_id
GEMINI_API_KEY=your_gemini_api_key
```

3. Start the development server:
```bash
npm run dev
```

## Project Architecture

This project uses a separated frontend/backend architecture:

- **Frontend**: Next.js application (this repository)
- **Backend**: Express API server (in the `studio-backend` directory)

### Frontend Structure

```
src/
├── ai/             # AI-related type definitions
├── app/            # Next.js app directory with pages and layouts
├── components/     # React components
├── hooks/          # Custom React hooks
└── lib/            # Utility functions and API client
```

### API Communication

All API calls to the backend are handled through the API client in `src/lib/api-client.ts`. The frontend communicates with the backend through RESTful API endpoints.

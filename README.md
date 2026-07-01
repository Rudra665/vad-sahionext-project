# VAD Avatar Project

A simple voice-driven avatar demo:

- `capture_audio.py` listens to microphone audio
- `server.py` broadcasts transcription and keywords over WebSocket
- `index.html` shows the avatar UI in the browser

## Requirements

- Python 3.10 or newer
- A working microphone
- A browser
- API keys for:
    - Gemini (`GENAI_API_KEY`)
    - Groq (`GROQ_API_KEY`)

## Setup

1. Clone the repository.
2. Open the project folder in VS Code or your terminal.
3. Create and activate a virtual environment.
4. Install the Python dependencies used by the scripts:

    ```bash
    pip install numpy sounddevice websockets python-dotenv google-generativeai groq
    ```

5. Make sure your `.env` file contains these variables:
    - `GENAI_API_KEY=your_gemini_key`
    - `GROQ_API_KEY=your_groq_key`

## Run the project

1. Start the audio / WebSocket backend:
    - `python capture_audio.py`
2. Start a local static server for the frontend:
    - for example, use VS Code Live Server, or any local HTTP server
3. Open `index.html` in the browser through that local server.
4. Speak into the microphone and watch the avatar, transcription, and keywords update.

## Project files

- `index.html` — browser UI and avatar rendering
- `capture_audio.py` — microphone capture and voice activity detection
- `server.py` — WebSocket server
- `gemini_client.py` — Gemini keyword extraction
- `ai_clinet.py` — Groq transcription and keyword extraction helper
- `tts.py` — text-to-speech helper
- `state.py` — shared speaking state
- `avatar/Suyo.vrm` — avatar model

## Notes

- The frontend connects to `ws://localhost:8765`.
- If the avatar does not load, the page falls back to a simple animated placeholder.
- If microphone capture fails, check your audio device settings and permissions.

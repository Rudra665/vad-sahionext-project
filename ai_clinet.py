import os
import io
import wave
import numpy as np
from dotenv import load_dotenv
from groq import Groq
import json


load_dotenv()
client= Groq(api_key=os.getenv("GROQ_API_KEY"))

def chunk_to_wave_bytes(chunk:np.ndarray, sample_rate:int=16000) ->bytes:
    """Convert a numpy arr of audio samples to a Wave file in bytes."""
    buffer=io.BytesIO()
    with wave.open(buffer, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  
        wf.setframerate(sample_rate)
        wf.writeframes(chunk.tobytes())
    buffer.seek(0)
    return buffer


def get_keywords(chunk:np.ndarray) -> list:
    wave_file=chunk_to_wave_bytes(chunk)

    transcription=client.audio.transcriptions.create(
        file=('audio.wav', wave_file, 'audio/wav'),
        model='whisper-large-v3',
        response_format='json'
    )

    text = transcription.strip() if isinstance(transcription, str) else transcription.text.strip()
    print(f"Transcription: {text}")

    response=client.chat.completions.create(
        model='llama-3.1-8b-instant',
        messages=[
            {
                "role": "system",
                "content": "You are a keyword extractor. Always respond with ONLY a JSON array of strings, nothing else."
            },
            {
                "role": "user",
                "content": f"Extract all keywords from: '{text}'"
            }
        ]
    )

    raw = response.choices[0].message.content.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()
    print(f"Raw keywords response: {raw}")

    try:
        keywords = json.loads(raw)
    except json.JSONDecodeError:
        keywords = text.split()[:5]
        # fallback: just split words if JSON fails
    return text, keywords
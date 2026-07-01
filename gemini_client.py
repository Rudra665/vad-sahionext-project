import google.generativeai as genai
import numpy as np
import io 
import wave
import os
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GENAI_API_KEY"))
model = genai.GenerativeModel("gemini-3.5-flash")

def chunk_to_wave_bytes(chunk:np.ndarray, sample_rate:int=16000) ->bytes:
    """Convert a numpy arr of audio samples to a Wave file in bytes."""
    buffer=io.BytesIO()
    with wave.open(buffer, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  
        wf.setframerate(sample_rate)
        wf.writeframes(chunk.tobytes())
    return buffer.getvalue()

def get_keywords(chunk:np.ndarray) -> list:
    """Sending audio chunk to Gemini to retrieve keywords."""
    buffer=chunk_to_wave_bytes(chunk)
    response= model.generate_content([
        {
            "inline_data":{
                'mime_type':'audio/wav',
                "data": buffer
            }
        },
        "Extract keywords from the audio and return them as a list. Return ONLY a JSON array of strings, no explanation, no markdown."
    ])

    import json
    print(f'Gemini response: {response.candidates[0].content.parts[0].text}')
    text=response.candidates[0].content.parts[0].text
    text=text.replace("```json","").replace("```","").strip()
    return json.loads(text)
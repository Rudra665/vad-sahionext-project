import asyncio
import threading
import sounddevice as sd
import numpy as np
import queue
import time
from ai_clinet import get_keywords
from tts import start_speak
from state import is_speaking
from server import start_server, transmition


Sample=16000
device=1
frameDuration=30
frameSize=int(Sample*frameDuration/1000)
energyThreshold=150
silenceChunk=800

audio_q =queue.Queue()

def callBack(data, frames, time, status):
    audio_q.put(data.copy())

def is_voice_frame(frame):
    energy = np.abs(frame).mean()
    return energy > energyThreshold

def run_server():
    # asyncio.run(start_server())
    global server_loop
    server_loop = asyncio.new_event_loop()
    asyncio.set_event_loop(server_loop)
    server_loop.run_until_complete(start_server())

def stream_vad():
    print('Listening ...')
    speech_buffer = []
    count_silence=0

    with sd.InputStream(samplerate=Sample,device=device, channels=1, callback=callBack, blocksize=frameSize, dtype='int16'):
        while True:
            frame=audio_q.get()

            if is_speaking.is_set():
                continue 

            frame=frame.flatten()
            # print(f'Frame energy: {energy:.1f}')

            if is_voice_frame(frame):
                speech_buffer.append(frame)
                count_silence=0
            else:
                if speech_buffer:
                    count_silence+= frameDuration
                    speech_buffer.append(frame)
                    if count_silence>silenceChunk:
                        chunk= np.concatenate(speech_buffer)
                        print(f'Captured {len(chunk)} samples of speech')
                        yield chunk
                        speech_buffer=[]
                        count_silence=0

if __name__ == '__main__':
    t=threading.Thread(target=run_server, daemon=True)
    t.start()
    print('WebSocket server started')

    for chunk in stream_vad():
        print('Sending chunk to Gemini ...')
        text, keywords = get_keywords(chunk)
        print(f'Keywords: {keywords}')
        if text:
            # start_speak(text)  # Call the start_speak function to vocalize the text
            asyncio.run_coroutine_threadsafe(
                transmition(keywords, text),
                server_loop
            )
            start_speak(text)
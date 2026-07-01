import pyttsx3
from state import is_speaking

  # Set the volume level

def start_speak(text:str):
    is_speaking.set()
    # for word in text:

    engine = pyttsx3.init()
    engine.setProperty('rate', 200)  # Set the speech rate 
    engine.setProperty('volume', 1.0)


    print(f"Speaking: {text}")
    engine.say(text)
    engine.runAndWait()
    engine.stop()  # Stop the engine after speaking each word

    is_speaking.clear()
        
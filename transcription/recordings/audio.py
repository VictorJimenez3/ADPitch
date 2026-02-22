import sounddevice as sd
from scipy.io.wavfile import write as wav_write

def record_wav(path: str, seconds: int = (15*3600), sample_rate: int = 16000, channels: int = 1):
    print(f"[audio] Recording {seconds}s @ {sample_rate}Hz ...")
    audio = sd.rec(int(seconds * sample_rate), samplerate=sample_rate, channels=channels, dtype="int16")
    sd.wait()
    wav_write(path, sample_rate, audio)
    print(f"[audio] Saved {path}")
    return path
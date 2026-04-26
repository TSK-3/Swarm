import os
from itertools import cycle
from dotenv import load_dotenv

load_dotenv()

GROQ_KEYS = [k for k in [
    os.getenv("GROQ_KEY_1"),
    os.getenv("GROQ_KEY_2"),
    os.getenv("GROQ_KEY_3"),
] if k]

GEMINI_KEYS = [k for k in [
    os.getenv("GEMINI_KEY_1"),
] if k]

groq_pool      = cycle(GROQ_KEYS)      if GROQ_KEYS      else None
gemini_pool = cycle(GEMINI_KEYS) if GEMINI_KEYS else None

def next_groq():
    if not groq_pool: raise ValueError("No Groq keys in .env")
    return next(groq_pool)

def next_gemini():
    if not GEMINI_KEYS: raise ValueError("No GEMINI keys in .env")
    return next(gemini_pool)
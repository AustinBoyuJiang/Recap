import os
import json
import re
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

history = [
    {
        "role": "system",
        "content":
            """You are an English tutor helping students practice English. Rules:
            1. ALWAYS speak in English only
            2. Keep responses under 15 words
            3. Focus on vocabulary building and conversation
            4. If user seems confused, use simpler words
            5. Be encouraging and friendly
            6. Ask questions to keep conversation flowing
            7. Correct mistakes gently when needed
            8. Always use new English speaker-friendly language
            
            Start with a warm greeting and ask what they'd like to practice."""
    }
]


def judge(ai_message: str, user_reply: str) -> dict:
    prompt = f"""
You are an English language evaluator helping assess a student's English ability based on their interaction with an AI \
assistant.

Given an English conversation between the AI and the user, please evaluate the user's language from two perspectives:

1. "user_quality" (1-5): Grammar, vocabulary, fluency of the user's reply. In most cases (80%) it should be 5 unless \
the user doesn't understand what he is typing at all.
2. "ai_understanding" (1-4): How well the user understood the AI's message.

Only return this JSON format, nothing else:
{{"user_quality": <1-5>, "ai_understanding": <1-4>}}

AI said:
\"\"\"{ai_message}\"\"\"
User replied:
\"\"\"{user_reply}\"\"\"
"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )

    raw = response.choices[0].message.content.strip()
    return extract_json(raw)


def extract_json(raw_text):
    match = re.search(r'\{.*?\}', raw_text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    else:
        raise ValueError("No valid JSON object found.")

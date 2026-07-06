import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

EXPLAINER_PROMPT = """You are a friendly medical translator. A patient has received an MRI
report full of technical radiology language, and needs a short, clear, reassuring
explanation of what it means — without using jargon.

Rules:
- Write 3-5 sentences, plain everyday English, no medical jargon (avoid terms like
  "tendinosis", "effusion", "grade II" unless you immediately explain them in simple words)
- Do not diagnose or give treatment advice — only explain what the finding means
- Be calm and factual, not alarming, even for serious findings
- End with a brief, gentle note that they should discuss this with their doctor

Extracted finding:
Body part: {body_part}
Structure affected: {structure}
Injury type: {injury_type}
Severity: {severity_tier} ({severity_raw})

Original report excerpt:
{report_text}

Write the plain-language explanation now (no headers, just the explanation text):"""


def generate_explanation(extraction: dict, report_text: str) -> str:
    prompt = EXPLAINER_PROMPT.format(
        body_part=extraction.get("body_part", "unknown"),
        structure=extraction.get("structure", "unknown"),
        injury_type=extraction.get("injury_type", "unknown"),
        severity_tier=extraction.get("severity_tier", "unknown"),
        severity_raw=extraction.get("severity_raw", "unknown"),
        report_text=report_text[:1500],  # keep prompt reasonably sized
    )

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,  # a little natural variation is fine for prose explanations
    )

    return response.choices[0].message.content.strip()


if __name__ == "__main__":
    sample_extraction = {
        "body_part": "knee",
        "structure": "ACL",
        "injury_type": "partial tear",
        "severity_tier": "mild",
        "severity_raw": "Grade II",
    }
    sample_report = """The anterior cruciate ligament shows increased T2 signal with
    partial disruption of fibers involving approximately 50% of the ligament substance,
    consistent with a partial tear."""

    print(generate_explanation(sample_extraction, sample_report))
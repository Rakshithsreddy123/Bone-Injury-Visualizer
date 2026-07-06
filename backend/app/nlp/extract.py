import os
import json
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

EXTRACTION_PROMPT = """You are a medical NLP system that extracts structured data from radiology/MRI reports.

Read the report below and return ONLY a JSON object (no markdown, no code fences, no explanation) with these exact fields:

{{
  "body_part": "the main joint/region, e.g. knee, shoulder, wrist, spine, hip, ankle, hand",
  "laterality": "left, right, or bilateral (use null if not applicable, e.g. spine)",
  "structure": "the specific anatomical structure most affected, e.g. ACL, supraspinatus tendon, scaphoid, L4-L5 disc",
  "injury_type": "short description, e.g. partial tear, fracture, sprain, disc herniation",
  "severity_raw": "the exact severity language used in the report, e.g. 'Grade II', 'mild', 'severe'",
  "severity_tier": "normalize to exactly one of: low, mild, high"
}}

Severity normalization guide:
- low: mild sprain/strain, Grade I, small/mild findings, low-grade, stress reaction without fracture, mild bulge/tendinosis
- mild: partial tears, Grade II, moderate findings, moderate stenosis/bursitis
- high: complete/full-thickness tears, Grade III, severe findings, displaced fractures, large herniation, high-grade

If the report mentions multiple structures, pick the most clinically significant one as the primary finding.

Report:
{report_text}

Return ONLY the JSON object."""


def extract_from_report(report_text: str) -> dict:
    prompt = EXTRACTION_PROMPT.format(report_text=report_text)

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,  # deterministic output for consistent extraction
    )

    raw_output = response.choices[0].message.content.strip()

    # strip markdown code fences if the model adds them anyway
    if raw_output.startswith("```"):
        raw_output = raw_output.strip("`")
        if raw_output.startswith("json"):
            raw_output = raw_output[4:]
        raw_output = raw_output.strip()

    try:
        return json.loads(raw_output)
    except json.JSONDecodeError as e:
        print(f"Failed to parse JSON. Raw output was:\n{raw_output}")
        raise e


if __name__ == "__main__":
    # quick manual test
    sample = """
    MRI KNEE - LEFT (WITHOUT CONTRAST)
    CLINICAL HISTORY: 29-year-old female, basketball injury with pop sensation.
    FINDINGS: The anterior cruciate ligament shows increased T2 signal with partial
    disruption of fibers involving approximately 50% of the ligament substance,
    consistent with a partial tear.
    IMPRESSION: Partial (Grade II) tear of the anterior cruciate ligament.
    """
    result = extract_from_report(sample)
    print(json.dumps(result, indent=2))
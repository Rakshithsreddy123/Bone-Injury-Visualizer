import os
import json
from extract import extract_from_report
from mapping.bone_lookup import build_viewer_payload

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPORTS_DIR = os.path.join(SCRIPT_DIR, "..", "..", "data", "sample_reports")
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "pipeline_results.json")


def run_full_pipeline(report_text: str) -> dict:
    """
    Takes raw report text, returns everything the frontend needs:
    extraction data + bones to highlight + color.
    """
    extraction = extract_from_report(report_text)
    viewer_payload = build_viewer_payload(extraction)

    return {
        "extraction": extraction,
        "viewer": viewer_payload,
    }


def run_batch():
    results = {}

    for filename in sorted(os.listdir(REPORTS_DIR)):
        if not filename.endswith(".txt"):
            continue

        filepath = os.path.join(REPORTS_DIR, filename)
        with open(filepath, "r") as f:
            report_text = f.read()

        print(f"Processing: {filename}...")
        try:
            result = run_full_pipeline(report_text)
            results[filename] = result
            print(f"  bones: {result['viewer']['bones']}")
            print(f"  color: {result['viewer']['color']} (severity: {result['viewer']['severity_tier']})")
        except Exception as e:
            print(f"  FAILED: {e}")
            results[filename] = {"error": str(e)}

    with open(OUTPUT_FILE, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\nDone. Results saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    run_batch()
import os
import json
from extract import extract_from_report

# build path relative to this script's own location, so it works
# no matter what folder you run "python batch_test.py" from
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPORTS_DIR = os.path.join(SCRIPT_DIR, "..", "..", "data", "sample_reports")
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "extraction_results.json")

def run_batch_test():
    results = {}

    for filename in sorted(os.listdir(REPORTS_DIR)):
        if not filename.endswith(".txt"):
            continue

        filepath = os.path.join(REPORTS_DIR, filename)
        with open(filepath, "r") as f:
            report_text = f.read()

        print(f"Processing: {filename}...")
        try:
            extracted = extract_from_report(report_text)
            results[filename] = extracted
            print(f"  -> {extracted}")
        except Exception as e:
            print(f"  -> FAILED: {e}")
            results[filename] = {"error": str(e)}

    with open(OUTPUT_FILE, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\nDone. Results saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    run_batch_test()
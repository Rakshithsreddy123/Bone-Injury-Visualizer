"""
Maps extracted report data (body_part, laterality, structure) to actual
bone node names in the 3D skeleton model.

Bone names here are the ones confirmed in Blender during Day 1.
"""

# Structure keyword -> bone name(s), organized by body_part and laterality.
# Keys under each laterality are lowercase substrings to search for in the
# extracted "structure" field. "_default" is used when no keyword matches.
BONE_MAP = {
    "knee": {
        "right": {
            "acl": ["r_femur__0", "r_tibia__0"],
            "meniscus": ["r_femur__0", "r_tibia__0"],
            "patella": ["r_patella__0", "r_femur__0"],
            "_default": ["r_femur__0", "r_tibia__0"],
        },
        "left": {
            "acl": ["l_femur__0", "l_tibia__0"],
            "meniscus": ["l_femur__0", "l_tibia__0"],
            "patella": ["l_patella__0", "l_femur__0"],
            "_default": ["l_femur__0", "l_tibia__0"],
        },
    },
    "spine": {
        "null": {  # spine reports usually have laterality: null
            "c5": ["c5__0"],
            "c6": ["c6__0"],
            "l3": ["l3__0"],
            "l4": ["l4__0"],
            "l5": ["l5__0"],
            "s1": ["Sacrum__0"],
            "sacrum": ["Sacrum__0"],
            "_default": ["l4__0"],
        }
    },
    "shoulder": {
        "right": {
            "labrum": ["r_humerus___0", "r_scapula__0"],
            "rotator": ["r_humerus__0", "r_scapula__0"],
            "supraspinatus": ["r_humerus__0", "r_scapula__0"],
            "_default": ["r_humerus__0", "r_scapula__0"],
        },
        "left": {
            "labrum": ["l_humerus__0", "l_scapula__0"],
            "rotator": ["l_humerus__0", "l_scapula__0"],
            "supraspinatus": ["l_humerus__0", "l_scapula__0"],
            "_default": ["l_humerus__0", "l_scapula__0"],
        },
    },
    "wrist": {
        "right": {
            "scaphoid": ["r_scaphoid__0"],
            "tfcc": ["r_ulna__0", "r_radius__0"],
            "_default": ["r_radius__0", "r_ulna__0"],
        },
        "left": {
            "scaphoid": ["l_scaphoid__0"],
            "tfcc": ["l_ulna__0", "l_radius__0"],
            "_default": ["l_radius__0", "l_ulna__0"],
        },
    },
    "hand": {
        "right": {
            "metacarpal": ["r_metacarpal5_0"],
            "_default": ["r_metacarpal5_0"],
        },
        "left": {
            "metacarpal": ["l_metacarpal3__0"],
            "_default": ["l_metacarpal3__0"],
        },
    },
    "hip": {
        "right": {
            "labral": ["r_oscoxa__0", "r_femur__0"],
            "stress": ["r_femur__0"],
            "_default": ["r_oscoxa__0", "r_femur__0"],
        },
        "left": {
            "labral": ["l_oscoxa__0", "l_femur__0"],
            "stress": ["l_femur__0"],
            "_default": ["l_oscoxa__0", "l_femur__0"],
        },
    },
    "ankle": {
        "right": {
            "ligament": ["r_fibula__0", "r_talus__0"],
            "fracture": ["r_fibula__0", "r_tibia__0", "r_talus__0"],
            "_default": ["r_fibula__0", "r_talus__0"],
        },
        "left": {
            "ligament": ["l_fibula__0", "l_talus__0"],
            "fracture": ["l_fibula__0", "l_tibia__0", "l_talus__0"],
            "_default": ["l_fibula__0", "l_talus__0"],
        },
    },
}

# severity_tier -> highlight color for the 3D viewer
SEVERITY_COLOR_MAP = {
    "low": "#4CAF50",    # green
    "mild": "#FFA726",   # amber
    "high": "#E53935",   # red
}


def get_bones_for_extraction(extraction: dict) -> list:
    """
    Given an extraction dict (from extract.py), return the list of
    bone node names that should be highlighted in the 3D viewer.
    """
    body_part = (extraction.get("body_part") or "").strip().lower()
    laterality = (extraction.get("laterality") or "null")
    if laterality is None:
        laterality = "null"
    laterality = str(laterality).strip().lower()
    structure = (extraction.get("structure") or "").strip().lower()

    body_part_map = BONE_MAP.get(body_part)
    if not body_part_map:
        return []  # unknown body part, nothing to highlight

    laterality_map = body_part_map.get(laterality)
    if not laterality_map:
        # fall back to any available laterality if exact one is missing
        laterality_map = next(iter(body_part_map.values()), {})

    matched_bones = []
    for keyword, bones in laterality_map.items():
        if keyword == "_default":
            continue
        if keyword in structure:
            for bone in bones:
                if bone not in matched_bones:
                    matched_bones.append(bone)

    if matched_bones:
        return matched_bones

    return laterality_map.get("_default", [])


def get_color_for_severity(severity_tier: str) -> str:
    return SEVERITY_COLOR_MAP.get((severity_tier or "").strip().lower(), "#FFA726")


FRACTURE_KEYWORDS = ["fracture", "break", "broken"]
SWELLING_KEYWORDS = ["edema", "effusion", "swelling", "bruise", "contusion", "bursitis", "hemarthrosis"]

# words that, when found shortly before a keyword, negate that occurrence
# (e.g. "no fracture", "without a fracture line", "no discrete fracture")
NEGATION_WORDS = ["no", "not", "without", "negative", "denies", "absence of", "rules out", "ruled out"]
NEGATION_WINDOW = 4  # how many words before the keyword to check for negation


def _keyword_present_unnegated(text: str, keyword: str) -> bool:
    """
    Returns True only if `keyword` appears in `text` at least once WITHOUT
    a negation word shortly before it. This avoids false positives like
    treating "no discrete fracture line identified" as a real fracture.
    """
    words = text.split()
    for i, word in enumerate(words):
        if keyword in word:
            window_start = max(0, i - NEGATION_WINDOW)
            preceding_words = words[window_start:i]
            if not any(neg in " ".join(preceding_words) for neg in NEGATION_WORDS):
                return True  # found an occurrence with no negation nearby
    return False


def detect_visual_flags(extraction: dict, report_text: str = "") -> dict:
    """
    Looks at injury_type, severity_raw, structure, AND the full original
    report text to decide which stylized visual overlays to show (fracture
    split, swelling glow). We check the full report text too because the
    LLM's condensed injury_type often drops secondary details like
    "associated edema" that still matter for these visual cues.
    Negation-aware: "no fracture identified" will NOT trigger has_fracture.
    This is a keyword-based heuristic, not a medical determination.
    """
    text_to_check = " ".join([
        str(extraction.get("injury_type", "")),
        str(extraction.get("severity_raw", "")),
        str(extraction.get("structure", "")),
        str(report_text or ""),
    ]).lower()

    return {
        "has_fracture": any(_keyword_present_unnegated(text_to_check, kw) for kw in FRACTURE_KEYWORDS),
        "has_swelling": any(_keyword_present_unnegated(text_to_check, kw) for kw in SWELLING_KEYWORDS),
    }


def build_viewer_payload(extraction: dict, report_text: str = "") -> dict:
    """
    Combines bone lookup + severity color + visual flags into the final
    payload the frontend SkeletonViewer component needs.
    """
    bones = get_bones_for_extraction(extraction)
    color = get_color_for_severity(extraction.get("severity_tier"))
    flags = detect_visual_flags(extraction, report_text)

    return {
        "bones": bones,
        "color": color,
        "severity_tier": extraction.get("severity_tier"),
        "body_part": extraction.get("body_part"),
        "structure": extraction.get("structure"),
        **flags,
    }
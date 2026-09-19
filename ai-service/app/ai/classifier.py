# ============================================================
#  classifier/engine.py  --  SentinelDMS AI Pipeline
#  Layer 2: Document Classification + Entity Extraction
# ============================================================
#
#  What this does:
#    Takes the raw text from the OCR engine and:
#    1. Labels it as FIR / CHARGESHEET / WITNESS_STATEMENT / etc.
#    2. Extracts key entities: IPC sections, case numbers, names, dates
#
#  Model: facebook/bart-large-mnli
#    BART = Bidirectional and Auto-Regressive Transformer
#    mnli = trained on Multi-Genre Natural Language Inference
#    Zero-shot means we do NOT need to train it on police documents.
#    We just describe the labels in plain English and it figures it out.
# ============================================================

import re
from typing import Optional
from transformers import pipeline as hf_pipeline


# -- LABEL DEFINITIONS ----------------------------------------
#
# These are the candidate labels we give BART.
# They must be written in natural English -- BART understands
# meaning, not just keywords. "First Information Report" works
# better than "FIR" because BART was trained on English prose.
#
CANDIDATE_LABELS = [
    "First Information Report",
    "Charge Sheet",
    "Witness Statement",
    "Forensic Report",
    "Court Filing",
    "Medical Report",
    "Arrest Warrant",
    "Other Document",
]

# Map the natural English label back to the short code we use
# everywhere in the system (database, API responses, FAISS metadata).
LABEL_TO_CODE = {
    "First Information Report": "FIR",
    "Charge Sheet":             "CHARGESHEET",
    "Witness Statement":        "WITNESS_STATEMENT",
    "Forensic Report":          "FORENSIC_REPORT",
    "Court Filing":             "COURT_FILING",
    "Medical Report":           "MEDICAL_REPORT",
    "Arrest Warrant":           "ARREST_WARRANT",
    "Other Document":           "OTHER",
}

# IPC -> BNS mapping (Bharatiya Nyaya Sanhita 2023 renamed IPC sections)
# We keep both so old FIRs (IPC) and new FIRs (BNS) are both handled.
IPC_PATTERN = re.compile(
    r"[Ss]ection\s+(\d+[A-Z]?(?:\s*[A-Za-z]+)?)\s+(?:of\s+)?"
    r"(?:IPC|I\.P\.C\.?|CrPC|BNS|POCSO|IT\s*Act)",
    re.IGNORECASE,
)

CASE_NUM_PATTERN = re.compile(
    r"(?:Case\s+No\.?|FIR\s+No\.?|CR\s+No\.?|RC\s+No\.?)\s*:?\s*([\w/\-]+)",
    re.IGNORECASE,
)

DATE_PATTERN = re.compile(
    r"\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b"
    r"|\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)"
    r"[a-z]*\.?\s+\d{4}\b",
    re.IGNORECASE,
)

# Heuristic: two or more capitalized words in sequence = likely a name.
# We skip known false positives like "Police Station", "Case No", etc.
NAME_SKIP = {
    "First Information", "Police Station", "Case No", "Court Filing",
    "Charge Sheet", "Witness Statement", "Forensic Report", "Medical Report",
    "Arrest Warrant", "Other Document", "Investigating Officer",
}
NAME_PATTERN = re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b")


class ClassificationEngine:
    """
    Zero-shot document classifier using BART-MNLI.

    Lazy-loads the model on first call (model is ~1.6GB).
    After that it stays in memory for the process lifetime.

    Usage:
        engine = ClassificationEngine()
        result = engine.classify("FIRST INFORMATION REPORT Case No 404/2024...")
        print(result["documentType"])   # "FIR"
        print(result["confidence"])     # 0.94
        print(result["entities"])       # {"ipcSections": [...], ...}
    """

    def __init__(self):
        self._pipe = None   # Loaded lazily on first call

    # -- PRIVATE: _load -------------------------------------------
    def _load(self):
        """Load the BART model into memory (only once)."""
        if self._pipe is not None:
            return  # Already loaded

        # hf_pipeline() downloads the model on first run, then caches it.
        # device=-1 means CPU. Use device=0 for first GPU.
        # multi_label=False in the call below means pick exactly ONE label.
        self._pipe = hf_pipeline(
            task="zero-shot-classification",
            model="facebook/bart-large-mnli",
            device=-1,
        )

    # -- PRIVATE: _extract_entities -------------------------------
    def _extract_entities(self, text: str) -> dict:
        """
        Regex-based entity extraction.

        Why regex and not a Named Entity Recognition (NER) model?
        Because police document entities follow strict, predictable
        patterns (IPC sections, case numbers, dates). Regex is faster,
        more reliable, and explainable for these specific patterns.
        A generic NER model would miss IPC section references.
        """
        ipc      = list(set(IPC_PATTERN.findall(text)))[:10]
        case_nos = list(set(CASE_NUM_PATTERN.findall(text)))[:5]
        dates    = list(set(DATE_PATTERN.findall(text)))[:10]

        # Names: filter out known false positives and very common phrases
        raw_names = NAME_PATTERN.findall(text)
        names = [
            n for n in raw_names
            if len(n.split()) >= 2
            and n not in NAME_SKIP
            and not any(skip in n for skip in NAME_SKIP)
        ]
        names = list(dict.fromkeys(names))[:10]   # deduplicate, keep order

        return {
            "ipcSections": ipc,
            "caseNumbers": case_nos,
            "dates":       dates,
            "names":       names,
        }

    # -- PUBLIC: classify -----------------------------------------
    def classify(self, text: str) -> dict:
        """
        Classify a document and extract entities.

        Args:
            text: plain text (typically from OCREngine.extract())

        Returns:
            {
              "documentType": "FIR",          <- short code
              "confidence":   0.93,           <- 0.0 to 1.0
              "allScores":    {"FIR": 0.93, "CHARGESHEET": 0.04, ...},
              "entities": {
                "ipcSections": ["302", "34"],
                "caseNumbers": ["404/2024"],
                "dates":       ["15-08-2024"],
                "names":       ["Vikram Singh", "Anil Desai"],
              }
            }
        """
        self._load()

        # Truncate to first 512 words for speed.
        # BART's attention window is 1024 tokens, but 512 words is enough
        # to classify -- the document type is usually clear from the header.
        sample = " ".join(text.split()[:512])

        result = self._pipe(
            sample,
            candidate_labels=CANDIDATE_LABELS,
            multi_label=False,  # Pick exactly one label
        )
        # result = {
        #   "labels":  ["First Information Report", "Charge Sheet", ...],
        #   "scores":  [0.93, 0.04, ...],   <- in descending order
        #   "sequence": <original text>
        # }

        top_label = result["labels"][0]
        top_score = result["scores"][0]

        all_scores = {
            LABEL_TO_CODE.get(label, "OTHER"): round(score, 3)
            for label, score in zip(result["labels"], result["scores"])
        }

        entities = self._extract_entities(text)

        return {
            "documentType": LABEL_TO_CODE.get(top_label, "OTHER"),
            "confidence":   round(top_score, 3),
            "allScores":    all_scores,
            "entities":     entities,
        }

    def process(self, text: str) -> dict:
        """Alias kept for backward compatibility with main.py."""
        return self.classify(text)

# backend/app/ai/classifier.py
# Zero-shot document classifier (BART-MNLI) + regex entity extraction
import re
from transformers import pipeline as hf_pipeline

CANDIDATE_LABELS = [
    "First Information Report", "Charge Sheet", "Witness Statement",
    "Forensic Report", "Court Filing", "Medical Report",
    "Arrest Warrant", "Other Document",
]
LABEL_CODE = {
    "First Information Report": "FIR",
    "Charge Sheet":             "CHARGESHEET",
    "Witness Statement":        "WITNESS_STATEMENT",
    "Forensic Report":          "FORENSIC_REPORT",
    "Court Filing":             "COURT_FILING",
    "Medical Report":           "MEDICAL_REPORT",
    "Arrest Warrant":           "ARREST_WARRANT",
    "Other Document":           "OTHER",
}

_RE_IPC  = re.compile(r"[Ss]ection\s+(\d+[A-Z]?(?:\s*[A-Za-z]+)?)\s+(?:of\s+)?(?:IPC|I\.P\.C\.?|CrPC|BNS|POCSO|IT\s*Act)", re.I)
_RE_CASE = re.compile(r"(?:Case\s+No\.?|FIR\s+No\.?|CR\s+No\.?)\s*:?\s*([\w/\-]+)", re.I)
_RE_DATE = re.compile(r"\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b|\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\b", re.I)
_RE_NAME = re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b")
_SKIP    = {"First Information","Police Station","Case No","Charge Sheet","Witness Statement","Investigating Officer"}

_pipe = None

def _get_pipe():
    global _pipe
    if _pipe is None:
        _pipe = hf_pipeline("zero-shot-classification", model="facebook/bart-large-mnli", device=-1)
    return _pipe


def classify(text: str) -> dict:
    """
    Classify document type and extract entities.

    Args:
        text: plain text (from OCR extract())

    Returns:
        {
          "documentType": "FIR",
          "confidence":   0.93,
          "allScores":    {"FIR": 0.93, ...},
          "entities":     {"ipcSections": [...], "caseNumbers": [...], "dates": [...], "names": [...]}
        }
    """
    sample = " ".join(text.split()[:512])
    result = _get_pipe()(sample, candidate_labels=CANDIDATE_LABELS, multi_label=False)
    names  = [n for n in _RE_NAME.findall(text) if len(n.split())>=2 and not any(s in n for s in _SKIP)]
    return {
        "documentType": LABEL_CODE.get(result["labels"][0], "OTHER"),
        "confidence":   round(result["scores"][0], 3),
        "allScores":    {LABEL_CODE.get(l,"OTHER"): round(s,3) for l,s in zip(result["labels"],result["scores"])},
        "entities": {
            "ipcSections": list(set(_RE_IPC.findall(text)))[:10],
            "caseNumbers": list(set(_RE_CASE.findall(text)))[:5],
            "dates":       list(set(_RE_DATE.findall(text)))[:10],
            "names":       list(dict.fromkeys(names))[:10],
        },
    }

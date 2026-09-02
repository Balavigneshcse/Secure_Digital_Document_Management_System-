import re
import spacy
from typing import Dict, Any

try:
    from transformers import pipeline
    HF_AVAILABLE = True
except ImportError:
    HF_AVAILABLE = False


# --- Document Type Labels ---
DOC_LABELS = ["FIR", "chargesheet", "witness_statement", "forensic_report", "court_filing", "other"]

# --- Keyword patterns for fallback rule-based classification ---
KEYWORD_RULES = {
    "FIR": ["first information report", "section 154 cr.p.c", "fir no"],
    "chargesheet": ["final report", "chargesheet", "section 173 cr.p.c"],
    "witness_statement": ["statement under section 161", "statement of witness"],
    "forensic_report": ["forensic science laboratory", "report of analysis", "fsl reference"],
    "court_filing": ["in the court of", "bail application", "remand order"],
}


class ClassificationEngine:
    """
    Upgraded AI Classification Engine.
    
    Strategy:
    - Primary:  Zero-shot HuggingFace classification (facebook/bart-large-mnli)
                Works without any fine-tuning. Just label the categories and it figures it out.
    - Fallback: Rule-based keyword matching (always available, no GPU needed)
    
    Entity Extraction: spaCy en_core_web_sm + custom regex for Indian legal formats.
    """

    def __init__(self):
        # Load spaCy for NER
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            import subprocess, sys
            subprocess.check_call([sys.executable, "-m", "spacy", "download", "en_core_web_sm"])
            self.nlp = spacy.load("en_core_web_sm")

        # Load HuggingFace zero-shot classifier
        self.hf_classifier = None
        if HF_AVAILABLE:
            try:
                self.hf_classifier = pipeline(
                    "zero-shot-classification",
                    model="facebook/bart-large-mnli",
                )
                print("[AI Upgrade] HuggingFace zero-shot classifier loaded.")
            except Exception as e:
                print(f"[AI Upgrade] HuggingFace model unavailable, using rule-based fallback: {e}")

    # ─── Classification ──────────────────────────────────────────────────────

    def _classify_with_hf(self, text: str) -> tuple[str, float]:
        """Uses HuggingFace BART zero-shot classification."""
        candidate_labels = [
            "First Information Report (FIR)",
            "Police Chargesheet or Final Report",
            "Witness Statement or Testimony",
            "Forensic Science Laboratory Report",
            "Court Filing or Bail Application",
            "Other Legal Document",
        ]
        result = self.hf_classifier(
            text[:1024],  # BART has a 1024-token limit
            candidate_labels=candidate_labels,
        )
        # Map back to our short labels
        label_map = {
            "First Information Report (FIR)": "FIR",
            "Police Chargesheet or Final Report": "chargesheet",
            "Witness Statement or Testimony": "witness_statement",
            "Forensic Science Laboratory Report": "forensic_report",
            "Court Filing or Bail Application": "court_filing",
            "Other Legal Document": "other",
        }
        top_label = result["labels"][0]
        top_score = result["scores"][0]
        return label_map.get(top_label, "other"), round(top_score, 3)

    def _classify_with_rules(self, text: str) -> tuple[str, float]:
        """Simple keyword fallback classifier."""
        text_lower = text.lower()
        for doc_type, keywords in KEYWORD_RULES.items():
            if any(kw in text_lower for kw in keywords):
                return doc_type, 0.85
        return "other", 0.50

    def classify_text(self, text: str) -> tuple[str, float]:
        """Try HuggingFace first, fall back to rules."""
        if self.hf_classifier:
            return self._classify_with_hf(text)
        return self._classify_with_rules(text)

    # ─── Entity Extraction ────────────────────────────────────────────────────

    def extract_entities(self, text: str) -> Dict[str, list]:
        """
        Extract entities using spaCy NER + Indian legal document-aware regex.
        Filters out known false positives common in Indian police docs.
        """
        doc = self.nlp(text)
        FALSE_POSITIVE_NAMES = {"Complainant Name", "P.C.", "Cr.P.C"}
        FALSE_POSITIVE_LOCS = {"P.C.", "Cr.P.C", "IPC"}

        names = set()
        dates = set()
        locations = set()

        for ent in doc.ents:
            if ent.label_ == "PERSON":
                cleaned = re.sub(r'\n\d+$', '', ent.text).strip()
                if cleaned and cleaned not in FALSE_POSITIVE_NAMES and len(cleaned.split()) <= 4:
                    names.add(cleaned)
            elif ent.label_ == "DATE":
                dates.add(ent.text.strip())
            elif ent.label_ in ["GPE", "LOC", "FAC"]:
                cleaned = ent.text.strip()
                if cleaned not in FALSE_POSITIVE_LOCS:
                    locations.add(cleaned)

        # Indian FIR/Case number pattern: e.g. 493/2021, CR-123/2023, Crime No. 45/2022
        case_numbers = set(re.findall(
            r'\b(?:CR[-\s]?)?\d{1,4}/\d{4}\b',
            text
        ))

        # IPC / BNS Section pattern
        ipc_sections = set(re.findall(
            r'Section\s+\d+[A-Z]?\s+(?:IPC|Cr\.P\.C|IT\s+Act|BNS)',
            text, re.IGNORECASE
        ))

        return {
            "names": sorted(names),
            "dates": sorted(dates),
            "caseNumbers": sorted(case_numbers),
            "locations": sorted(locations),
            "ipcSections": sorted(ipc_sections),
        }

    # ─── Main Entry Point ─────────────────────────────────────────────────────

    def process(self, text: str) -> dict:
        doc_type, confidence = self.classify_text(text)
        entities = self.extract_entities(text)
        return {
            "documentType": doc_type,
            "confidence": confidence,
            "entities": entities,
        }

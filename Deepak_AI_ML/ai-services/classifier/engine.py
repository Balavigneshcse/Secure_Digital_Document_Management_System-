import spacy
from typing import Dict, Any

class ClassificationEngine:
    """
    Rule-based classification and entity extraction using spaCy.
    To be upgraded to HuggingFace Transformers in Week 3.
    """
    def __init__(self):
        # Load small english model. Ensure `python -m spacy download en_core_web_sm` is run.
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            import subprocess
            import sys
            subprocess.check_call([sys.executable, "-m", "spacy", "download", "en_core_web_sm"])
            self.nlp = spacy.load("en_core_web_sm")

    def classify_text(self, text: str) -> str:
        """Simple keyword-based document classification."""
        text_lower = text.lower()
        if "first information report" in text_lower or "section 154 cr.p.c" in text_lower or "fir no" in text_lower:
            return "FIR"
        elif "final report" in text_lower or "chargesheet" in text_lower or "section 173 cr.p.c" in text_lower:
            return "chargesheet"
        elif "statement under section 161" in text_lower or "statement of witness" in text_lower:
            return "witness_statement"
        elif "forensic science laboratory" in text_lower or "report of analysis" in text_lower or "fsl reference" in text_lower:
            return "forensic_report"
        elif "in the court of" in text_lower or "bail application" in text_lower or "remand order" in text_lower:
            return "court_filing"
        return "other"

    def extract_entities(self, text: str) -> Dict[str, list]:
        """Extract basic entities (Names, Dates, Locations)."""
        doc = self.nlp(text)
        names = set()
        dates = set()
        locations = set()
        
        for ent in doc.ents:
            if ent.label_ == "PERSON":
                names.add(ent.text.strip())
            elif ent.label_ == "DATE":
                dates.add(ent.text.strip())
            elif ent.label_ in ["GPE", "LOC", "FAC"]:
                locations.add(ent.text.strip())

        # Simple regex for Case/FIR Numbers (e.g. 123/2023)
        import re
        case_numbers = set(re.findall(r'\b\d{1,4}/\d{4}\b', text))

        return {
            "names": list(names),
            "dates": list(dates),
            "caseNumbers": list(case_numbers),
            "locations": list(locations)
        }

    def process(self, text: str) -> dict:
        doc_type = self.classify_text(text)
        entities = self.extract_entities(text)
        return {
            "documentType": doc_type,
            "confidence": 0.85, # Hardcoded for rule-based, will be dynamic in HF version
            "entities": entities
        }

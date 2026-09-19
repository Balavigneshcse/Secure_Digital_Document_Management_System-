# ============================================================
#  summarizer/engine.py  --  SentinelDMS AI Pipeline
#  Layer 4: Case Summarization
# ============================================================
#
#  What this does:
#    Takes the text from one or more police documents and
#    produces a concise summary.
#    Two modes:
#      1. Single document summary  -- summarize one FIR / chargesheet
#      2. Case summary             -- summarize ALL documents in a case
#
#  Model: sshleifer/distilbart-cnn-12-6
#    A distilled (smaller) version of BART fine-tuned on CNN/DailyMail
#    news summarization. Works excellently for formal documents.
#    Size: ~300MB (vs 1.6GB for bart-large) -- fast on CPU.
#
#  Alternative: facebook/bart-large-cnn (bigger, slower, more accurate)
#    Change MODEL_NAME below to switch.
# ============================================================

from transformers import pipeline as hf_pipeline
from typing import List


# -- CONSTANTS ------------------------------------------------
MODEL_NAME = "sshleifer/distilbart-cnn-12-6"
# Change to "facebook/bart-large-cnn" for higher quality (slower)

MAX_INPUT_WORDS   = 900   # Model handles ~1024 tokens. 900 words is safe.
DEFAULT_MAX_LEN   = 200   # Max words in output summary
DEFAULT_MIN_LEN   = 50    # Min words in output summary (forces real summary)


class SummarizerEngine:
    """
    Document and case summarization using distilBART.

    Summarize a single document:
        engine = SummarizerEngine()
        result = engine.summarize(text)
        print(result["summary"])

    Summarize an entire case (multiple documents):
        result = engine.summarize_case([
            {"text": "...", "documentType": "FIR"},
            {"text": "...", "documentType": "CHARGESHEET"},
        ])
        print(result["overallSummary"])
        print(result["byDocumentType"]["FIR"])
    """

    def __init__(self):
        self._pipe = None   # Lazy-loaded on first call

    # -- PRIVATE: _load -------------------------------------------
    def _load(self):
        """Load the distilBART summarization model (once)."""
        if self._pipe is not None:
            return

        self._pipe = hf_pipeline(
            task="summarization",
            model=MODEL_NAME,
            device=-1,    # CPU. Use device=0 for GPU.
            # truncation=True tells the tokenizer to silently cut off
            # input that exceeds the model's context window.
            truncation=True,
        )

    # -- PRIVATE: _truncate ---------------------------------------
    @staticmethod
    def _truncate(text: str, max_words: int = MAX_INPUT_WORDS) -> str:
        """
        Truncate text to max_words words.

        Why not truncate by characters?
        Because the model's limit is in TOKENS (roughly = words for English).
        Word-level truncation is a safe approximation.
        """
        words = text.split()
        if len(words) > max_words:
            return " ".join(words[:max_words])
        return text

    # -- PUBLIC: summarize ----------------------------------------
    def summarize(
        self,
        text: str,
        max_length: int = DEFAULT_MAX_LEN,
        min_length: int = DEFAULT_MIN_LEN,
    ) -> dict:
        """
        Summarize a single document.

        Args:
            text:       the document text (from OCR or database)
            max_length: maximum number of tokens in the summary
            min_length: minimum number of tokens (prevents 1-sentence summaries)

        Returns:
            {
              "summary":           "The complainant reported...",
              "original_length":   342,   <- word count of input
              "summary_length":    67,    <- word count of summary
              "compression_ratio": 0.20   <- summary is 20% of original
            }
        """
        self._load()

        text = text.strip()

        # Guard: if text is too short, just return it as-is
        if len(text.split()) < 30:
            return {
                "summary":           text,
                "original_length":   len(text.split()),
                "summary_length":    len(text.split()),
                "compression_ratio": 1.0,
            }

        truncated = self._truncate(text)

        # The model returns a list with one dict per input.
        # We always pass one text, so result[0] is our summary.
        result = self._pipe(
            truncated,
            max_length=max_length,
            min_length=min_length,
            do_sample=False,    # Greedy decoding -- deterministic output
            # do_sample=True would give slightly different summaries
            # each time. False is better for legal documents.
        )

        summary = result[0]["summary_text"].strip()

        original_wc = len(text.split())
        summary_wc  = len(summary.split())

        return {
            "summary":           summary,
            "original_length":   original_wc,
            "summary_length":    summary_wc,
            "compression_ratio": round(summary_wc / max(original_wc, 1), 2),
        }

    # -- PUBLIC: summarize_case -----------------------------------
    def summarize_case(self, documents: List[dict]) -> dict:
        """
        Summarize an entire case from multiple documents.

        Strategy:
          1. Group documents by type (FIR, CHARGESHEET, etc.)
          2. Summarize each group separately (avoids mixing contexts)
          3. Combine all per-type summaries into a final case summary

        Args:
            documents: list of dicts, each with:
                       "text"         -- document text (required)
                       "documentType" -- e.g. "FIR" (optional, default OTHER)

        Returns:
            {
              "overallSummary":  "Vikram Singh was accused of...",
              "byDocumentType": {
                "FIR":           "The complainant reported...",
                "CHARGESHEET":   "The accused was charged under...",
              },
              "totalDocuments":  3,
            }
        """
        if not documents:
            return {
                "overallSummary":  "No documents provided.",
                "byDocumentType": {},
                "totalDocuments":  0,
            }

        # -- Step 1: group by document type -----------------------
        by_type: dict[str, list[str]] = {}
        for doc in documents:
            dtype = doc.get("documentType", "OTHER")
            text  = doc.get("text", "").strip()
            if text:
                by_type.setdefault(dtype, []).append(text)

        # -- Step 2: summarize each type --------------------------
        per_type_summaries: dict[str, str] = {}
        all_type_summaries: list[str]      = []

        for dtype, texts in by_type.items():
            # Combine all docs of this type, then truncate
            combined = "\n\n".join(texts)
            truncated = self._truncate(combined, max_words=MAX_INPUT_WORDS // 2)
            # Use shorter max for per-type so the rollup summary has room
            result = self.summarize(truncated, max_length=130, min_length=20)
            per_type_summaries[dtype] = result["summary"]
            all_type_summaries.append(f"{dtype}: {result['summary']}")

        # -- Step 3: roll-up overall summary ----------------------
        if len(all_type_summaries) == 1:
            # Only one type -- no need for a second-level summary
            overall_summary = list(per_type_summaries.values())[0]
        else:
            # Combine per-type summaries and summarize again
            combined_for_rollup = " ".join(all_type_summaries)
            truncated_rollup = self._truncate(combined_for_rollup)
            rollup = self.summarize(
                truncated_rollup,
                max_length=DEFAULT_MAX_LEN,
                min_length=DEFAULT_MIN_LEN,
            )
            overall_summary = rollup["summary"]

        return {
            "overallSummary":  overall_summary,
            "byDocumentType":  per_type_summaries,
            "totalDocuments":  len(documents),
        }

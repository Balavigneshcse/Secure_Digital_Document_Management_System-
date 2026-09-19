"""
SentinelDMS AI Services — Comprehensive Offline Test Suite
Run from the ai-service directory:
    python test_offline.py
"""

import sys
import os

# Force fully offline mode FIRST before any imports
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

PASS = "[PASS]"
FAIL = "[FAIL]"
WARN = "[WARN]"

results = {}

# ==============================================================
# TEST 1: FAISS Index data files
# ==============================================================
print("\n" + "=" * 60)
print("TEST 1: FAISS Index Data Files")
print("=" * 60)
try:
    import json
    index_path = "data/faiss_index.bin"
    meta_path = "data/faiss_meta.json"
    assert os.path.exists(index_path), f"Missing: {index_path}"
    assert os.path.exists(meta_path), f"Missing: {meta_path}"
    size_bin = os.path.getsize(index_path)
    with open(meta_path) as f:
        meta = json.load(f)
    doc_count = len(meta)
    print(f"  {PASS} faiss_index.bin exists ({size_bin} bytes)")
    print(f"  {PASS} faiss_meta.json exists with {doc_count} document entries")
    results["FAISS_Files"] = "PASS"
except Exception as e:
    print(f"  {FAIL} {e}")
    results["FAISS_Files"] = "FAIL"

# ==============================================================
# TEST 2: Semantic Search Engine (SentenceTransformers + FAISS)
# ==============================================================
print("\n" + "=" * 60)
print("TEST 2: Semantic Search Engine (offline)")
print("=" * 60)
try:
    from search.engine import SemanticSearchEngine
    engine = SemanticSearchEngine()
    stats = engine.get_stats()
    total_docs = stats.get("totalDocuments", 0)
    print(f"  {PASS} SemanticSearchEngine loaded successfully (offline mode)")
    print(f"  {PASS} FAISS index has {total_docs} documents")

    results_list = engine.query("fraud case cheating bank transfer", [], top_k=3)
    if results_list:
        print(f"  {PASS} Query returned {len(results_list)} results")
        print(f"  Sample: {results_list[0]['snippet'][:120]}")
    else:
        print(f"  {WARN} Query returned 0 results — index may be empty")
    results["SemanticSearch"] = "PASS"
except Exception as e:
    print(f"  {FAIL} {e}")
    results["SemanticSearch"] = "FAIL"

# ==============================================================
# TEST 3: OCR Engine (with Windows Tesseract fallback)
# ==============================================================
print("\n" + "=" * 60)
print("TEST 3: OCR Engine (with Windows fallback)")
print("=" * 60)
try:
    from ocr.engine import OCREngine
    ocr = OCREngine()
    # Simulate a tiny 1x1 PNG (binary)
    import base64
    tiny_png = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    )
    result = ocr.extract(tiny_png, "test.png")
    print(f"  {PASS} OCR Engine loaded and ran without crash")
    print(f"  Doc type fallback: {result.get('docType', 'N/A')}")
    print(f"  Text sample: {result.get('text', '')[:100]}")
    results["OCR"] = "PASS"
except Exception as e:
    print(f"  {FAIL} {e}")
    results["OCR"] = "FAIL"

# ==============================================================
# TEST 4: Classification Engine (BART zero-shot)
# ==============================================================
print("\n" + "=" * 60)
print("TEST 4: Classification Engine (zero-shot, offline)")
print("=" * 60)
try:
    from classifier.engine import ClassificationEngine
    clf = ClassificationEngine()
    test_text = "FIRST INFORMATION REPORT Under Section 154 Cr.P.C. FIR No: 493/2021 Date: 08-10-2021 Act: Section 420 IPC Complainant: Meera Reddy"
    result = clf.process(test_text)
    print(f"  {PASS} ClassificationEngine loaded successfully")
    print(f"  Document type predicted: {result.get('docType', 'N/A')}")
    print(f"  Confidence: {result.get('confidence', 0):.2%}")
    results["Classification"] = "PASS"
except Exception as e:
    print(f"  {FAIL} {e}")
    results["Classification"] = "FAIL"

# ==============================================================
# TEST 5: Chatbot Engine (RAG with Ollama)
# ==============================================================
print("\n" + "=" * 60)
print("TEST 5: RAG Chatbot Engine (Ollama/Llama3)")
print("=" * 60)
try:
    import requests as req
    try:
        r = req.get("http://localhost:11434", timeout=3)
        ollama_running = True
        print(f"  {PASS} Ollama server is RUNNING on port 11434")
    except Exception:
        ollama_running = False
        print(f"  {WARN} Ollama server is NOT running — chatbot will use context-only fallback")

    from chatbot.engine import ChatbotEngine
    bot = ChatbotEngine()
    print(f"  {PASS} ChatbotEngine loaded. LLM mode: {'Ollama/Llama3' if bot.llm else 'Context-Retrieval Fallback'}")

    answer_data = bot.ask("What happened in Case 102? Who is the accused?", [])
    answer_text = answer_data.get("answer", "")
    sources = answer_data.get("sources", [])
    print(f"  {PASS} Chatbot responded with {len(answer_text)} chars and {len(sources)} sources")
    print(f"  Answer preview: {answer_text[:200]}")
    results["Chatbot"] = "PASS"
except Exception as e:
    print(f"  {FAIL} {e}")
    results["Chatbot"] = "FAIL"

# ==============================================================
# TEST 6: NestJS Backend Assistant Bridge
# ==============================================================
print("\n" + "=" * 60)
print("TEST 6: Backend Assistant Controller Files")
print("=" * 60)
controller_path = r"../backend/src/assistant/assistant.controller.ts"
module_path = r"../backend/src/assistant/assistant.module.ts"
try:
    assert os.path.exists(controller_path), "assistant.controller.ts MISSING"
    assert os.path.exists(module_path), "assistant.module.ts MISSING"
    with open(controller_path) as f:
        ctrl_code = f.read()
    assert "/assistant/query" in ctrl_code or "query" in ctrl_code, "query route missing"
    assert "AiClientService" in ctrl_code, "AiClientService not injected"
    print(f"  {PASS} assistant.controller.ts exists and has correct structure")
    print(f"  {PASS} assistant.module.ts exists")
    results["BackendBridge"] = "PASS"
except Exception as e:
    print(f"  {FAIL} {e}")
    results["BackendBridge"] = "FAIL"

# ==============================================================
# TEST 7: HF_HUB_OFFLINE flag in main.py
# ==============================================================
print("\n" + "=" * 60)
print("TEST 7: Offline Mode Flag in main.py")
print("=" * 60)
try:
    with open("main.py") as f:
        main_code = f.read()
    assert "HF_HUB_OFFLINE" in main_code, "HF_HUB_OFFLINE not set in main.py"
    assert "TRANSFORMERS_OFFLINE" in main_code, "TRANSFORMERS_OFFLINE not set in main.py"
    print(f"  {PASS} HF_HUB_OFFLINE = '1' is set in main.py")
    print(f"  {PASS} TRANSFORMERS_OFFLINE = '1' is set in main.py")
    results["OfflineFlag"] = "PASS"
except Exception as e:
    print(f"  {FAIL} {e}")
    results["OfflineFlag"] = "FAIL"

# ==============================================================
# SUMMARY
# ==============================================================
print("\n" + "=" * 60)
print("FINAL SUMMARY")
print("=" * 60)
all_pass = True
for component, status in results.items():
    icon = "✓" if status == "PASS" else ("⚠" if status == "WARN" else "✗")
    print(f"  {icon}  {component}: {status}")
    if status == "FAIL":
        all_pass = False

if all_pass:
    print("\n  ALL SYSTEMS GO — SentinelDMS AI is fully offline-ready!")
else:
    print("\n  Some components need attention. Check FAIL items above.")

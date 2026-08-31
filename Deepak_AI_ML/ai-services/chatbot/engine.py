from typing import List, Dict, Any
from search.engine import SemanticSearchEngine

OLLAMA_AVAILABLE = False

try:
    from langchain_community.llms import Ollama
    import requests as _req
    # Quick connectivity check — Ollama runs on port 11434
    _resp = _req.get("http://localhost:11434", timeout=2)
    OLLAMA_AVAILABLE = True
    print("[Chatbot] Ollama is running — full RAG mode enabled.")
except Exception:
    print("[Chatbot] Ollama not found — running in context-retrieval fallback mode.")


class ChatbotEngine:
    """
    RAG Chatbot using LangChain + local Ollama LLM.

    Modes:
      - Full RAG (Ollama running): Retrieves docs via FAISS, sends prompt to Llama3
      - Fallback (Ollama absent): Returns top matching document snippets as the answer
        with a clear note. This keeps the service live during demo/dev without Ollama.
    """

    def __init__(self, model_name="llama3"):
        self.search_engine = SemanticSearchEngine()
        self.llm = None
        if OLLAMA_AVAILABLE:
            try:
                from langchain_community.llms import Ollama
                self.llm = Ollama(model=model_name)
            except Exception as e:
                print(f"[Chatbot] Ollama init failed: {e}")

    def ask(self, question: str, allowed_case_ids: List[str]) -> Dict[str, Any]:
        # 1. Retrieve relevant documents via Semantic Search
        search_results = self.search_engine.query(question, allowed_case_ids, top_k=3)

        sources = []
        context_parts = []
        for res in search_results:
            sources.append({"documentId": res["documentId"], "snippet": res["snippet"]})
            context_parts.append(f"[{res['documentId']}]: {res['snippet']}")

        context_str = "\n\n".join(context_parts)

        if not context_str.strip():
            return {
                "answer": "No authorized documents found that answer this question.",
                "sources": []
            }

        # 2. If Ollama is available, use full RAG
        if self.llm:
            prompt = f"""You are SentinelDMS, an AI assistant for investigating officers.
Answer the question strictly based on the context documents below.
If the answer is not in the context, say "I cannot find this in the authorized documents."

Context:
{context_str}

Question: {question}
Answer:"""
            try:
                answer = self.llm.invoke(prompt).strip()
                return {"answer": answer, "sources": sources}
            except Exception as e:
                # Ollama crashed mid-run — fall through to fallback
                print(f"[Chatbot] Ollama invoke failed: {e}")

        # 3. Fallback — return retrieved context directly
        fallback_answer = (
            f"[Ollama not running — showing retrieved context]\n\n"
            f"{context_str}\n\n"
            f"To enable AI-generated answers, install Ollama from https://ollama.com "
            f"and run: ollama pull llama3"
        )
        return {"answer": fallback_answer, "sources": sources}


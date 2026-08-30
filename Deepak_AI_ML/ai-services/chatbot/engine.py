from langchain_community.llms import Ollama
from typing import List, Dict, Any
from search.engine import SemanticSearchEngine

class ChatbotEngine:
    """
    RAG Chatbot using LangChain and local Ollama model.
    Retrieves context from FAISS via SemanticSearchEngine.
    """
    def __init__(self, model_name="llama3"):
        try:
            # Assumes Ollama is running locally on default port 11434
            self.llm = Ollama(model=model_name)
        except Exception as e:
            print(f"Warning: Failed to initialize Ollama. Is it running? {e}")
            self.llm = None
            
        self.search_engine = SemanticSearchEngine()

    def ask(self, question: str, allowed_case_ids: List[str]) -> Dict[str, Any]:
        # 1. Retrieve relevant documents
        search_results = self.search_engine.query(question, allowed_case_ids, top_k=3)
        
        sources = []
        context_parts = []
        for i, res in enumerate(search_results):
            doc_id = res["documentId"]
            snippet = res["snippet"]
            sources.append({"documentId": doc_id, "snippet": snippet})
            context_parts.append(f"Document [{doc_id}]: {snippet}")
            
        context_str = "\n\n".join(context_parts)
        
        if not context_str.strip():
            return {
                "answer": "I don't have access to any documents that answer this question based on your current permissions.",
                "sources": []
            }
            
        # 2. Build Prompt
        prompt = f"""
You are SentinelDMS, an AI assistant for investigating officers and legal professionals.
Answer the user's question based strictly on the following context documents. 
Do not make up information. If the answer is not in the context, say "I cannot find the answer in the authorized documents."

Context Documents:
{context_str}

Question: {question}
Answer:"""

        # 3. Generate Answer
        if self.llm:
            try:
                answer = self.llm.invoke(prompt)
            except Exception as e:
                answer = f"Error generating answer with Ollama (ensure `ollama serve` is running): {e}"
        else:
            answer = "Ollama is not initialized. Please install Ollama and pull the llama3 model."

        return {
            "answer": answer.strip(),
            "sources": sources
        }

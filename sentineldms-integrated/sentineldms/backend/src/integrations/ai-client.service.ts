import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

// ── Deepak's AI Service Contract (finalized Week 1) ───────────────────────────
//
// Base URL configured via AI_SERVICE_URL env var (default: http://localhost:8001)
//
// Endpoints wired up here:
//   POST /ocr-classify     — upload pipeline (this service)
//   POST /search/index     — index a doc into FAISS (called after upload)
//   POST /search/query     — semantic search (called from search endpoint)
//   POST /assistant/ask    — RAG chatbot (called from assistant endpoint)
// ─────────────────────────────────────────────────────────────────────────────

export interface OcrClassifyResult {
  ocrText: string;
  docType:
    | 'FIR'
    | 'CHARGESHEET'
    | 'WITNESS_STATEMENT'
    | 'FORENSIC_REPORT'
    | 'COURT_FILING'
    | 'OTHER';
  entities: {
    names: string[];
    dates: string[];
    caseNumbers: string[];
    locations: string[];
    ipcSections: string[];
  };
  confidence: number;
}

export interface SemanticSearchResult {
  results: {
    documentId: string;
    caseId: string;
    documentType: string;
    score: number;
    snippet: string;
  }[];
}

export interface ChatbotResult {
  answer: string;
  sources: { documentId: string; snippet: string }[];
}

@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('AI_SERVICE_URL', 'http://localhost:8001');
  }

  // ── 1. OCR + Classify ───────────────────────────────────────────────────────
  async ocrAndClassify(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<OcrClassifyResult> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<OcrClassifyResult>(
          `${this.baseUrl}/ocr-classify`,
          {
            fileName,
            mimeType,
            fileBase64: fileBuffer.toString('base64'),
          },
          { timeout: 30000 }, // OCR + HuggingFace can take ~10-15s
        ),
      );
      return data;
    } catch (err) {
      this.logger.warn(
        `AI /ocr-classify unreachable (${(err as Error).message}) — using mock fallback.`,
      );
      return {
        ocrText: '[AI service not connected — start FastAPI server on port 8001]',
        docType: 'OTHER',
        entities: { names: [], dates: [], caseNumbers: [], locations: [], ipcSections: [] },
        confidence: 0,
      };
    }
  }

  // ── 2. Index a Document into FAISS Semantic Search ──────────────────────────
  async indexDocument(
    documentId: string,
    text: string,
    caseId: string,
    documentType: string,
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(
          `${this.baseUrl}/search/index`,
          { documentId, text, caseId, documentType },
          { timeout: 15000 },
        ),
      );
    } catch (err) {
      this.logger.warn(`AI /search/index failed: ${(err as Error).message}`);
    }
  }

  // ── 3. Semantic Search ───────────────────────────────────────────────────────
  async semanticSearch(
    query: string,
    userId: string,
    allowedCaseIds: string[],
    documentTypeFilter?: string,
  ): Promise<SemanticSearchResult> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<SemanticSearchResult>(
          `${this.baseUrl}/search/query`,
          { query, userId, allowedCaseIds, documentTypeFilter },
          { timeout: 10000 },
        ),
      );
      return data;
    } catch (err) {
      this.logger.warn(`AI /search/query failed: ${(err as Error).message}`);
      return { results: [] };
    }
  }

  // ── 4. RAG Chatbot ──────────────────────────────────────────────────────────
  async askChatbot(
    question: string,
    userId: string,
    allowedCaseIds: string[],
  ): Promise<ChatbotResult> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<ChatbotResult>(
          `${this.baseUrl}/assistant/ask`,
          { question, userId, allowedCaseIds },
          { timeout: 60000 }, // Llama3 can take up to 60s for long answers
        ),
      );
      return data;
    } catch (err) {
      this.logger.warn(`AI /assistant/ask failed: ${(err as Error).message}`);
      return {
        answer: 'AI assistant is currently unavailable. Please try again later.',
        sources: [],
      };
    }
  }
}

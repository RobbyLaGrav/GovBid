// =============================================================================
// GovBid Pro - AI Services Configuration
// =============================================================================
// Configuration for Claude, OpenAI, and vector database services
// =============================================================================

import Anthropic from '@anthropic-ai/sdk';

// =============================================================================
// AI CONFIGURATION INTERFACES
// =============================================================================

export interface ClaudeConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  timeout: number;
  maxRetries: number;
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  timeout: number;
  maxRetries: number;
}

export interface PineconeConfig {
  apiKey: string;
  environment: string;
  indexName: string;
  dimension: number;
  metric: 'cosine' | 'euclidean' | 'dotproduct';
}

export interface AIConfig {
  claude: ClaudeConfig;
  openai: OpenAIConfig;
  pinecone: PineconeConfig;
  defaultProvider: 'claude' | 'openai';
  enableFallback: boolean;
  enableCaching: boolean;
  cacheTtlSeconds: number;
}

// =============================================================================
// CONFIGURATION VALUES
// =============================================================================

export const claudeConfig: ClaudeConfig = {
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
  maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '4096', 10),
  temperature: parseFloat(process.env.CLAUDE_TEMPERATURE || '0.7'),
  topP: parseFloat(process.env.CLAUDE_TOP_P || '0.9'),
  timeout: parseInt(process.env.CLAUDE_TIMEOUT || '120000', 10),
  maxRetries: parseInt(process.env.CLAUDE_MAX_RETRIES || '3', 10),
};

export const openaiConfig: OpenAIConfig = {
  apiKey: process.env.OPENAI_API_KEY || '',
  model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
  maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4096', 10),
  temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
  topP: parseFloat(process.env.OPENAI_TOP_P || '0.9'),
  timeout: parseInt(process.env.OPENAI_TIMEOUT || '120000', 10),
  maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3', 10),
};

export const pineconeConfig: PineconeConfig = {
  apiKey: process.env.PINECONE_API_KEY || '',
  environment: process.env.PINECONE_ENVIRONMENT || 'us-west1-gcp',
  indexName: process.env.PINECONE_INDEX || 'govbid-contracts',
  dimension: parseInt(process.env.PINECONE_DIMENSION || '1536', 10),
  metric: (process.env.PINECONE_METRIC as PineconeConfig['metric']) || 'cosine',
};

export const aiConfig: AIConfig = {
  claude: claudeConfig,
  openai: openaiConfig,
  pinecone: pineconeConfig,
  defaultProvider: (process.env.AI_DEFAULT_PROVIDER as 'claude' | 'openai') || 'claude',
  enableFallback: process.env.AI_ENABLE_FALLBACK !== 'false',
  enableCaching: process.env.AI_ENABLE_CACHING !== 'false',
  cacheTtlSeconds: parseInt(process.env.AI_CACHE_TTL || '3600', 10),
};

// =============================================================================
// CLAUDE CLIENT
// =============================================================================

let claudeClient: Anthropic | null = null;

/**
 * Get Claude client instance (lazy initialization)
 */
export function getClaudeClient(): Anthropic {
  if (!claudeClient) {
    if (!claudeConfig.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    claudeClient = new Anthropic({
      apiKey: claudeConfig.apiKey,
      timeout: claudeConfig.timeout,
      maxRetries: claudeConfig.maxRetries,
    });
  }

  return claudeClient;
}

// =============================================================================
// AI REQUEST TYPES
// =============================================================================

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AICompletionRequest {
  messages: AIMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
}

export interface AICompletionResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  provider: 'claude' | 'openai';
}

export interface AIEmbeddingRequest {
  texts: string[];
  model?: string;
}

export interface AIEmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    totalTokens: number;
  };
}

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

export const systemPrompts = {
  contractAnalysis: `You are an expert government contracting analyst. Your task is to analyze government contract solicitations and provide detailed insights.

When analyzing contracts, focus on:
1. Key requirements and deliverables
2. Evaluation criteria and scoring factors
3. Compliance requirements and certifications needed
4. Timeline and milestone requirements
5. Risk factors and potential challenges
6. Competitive positioning recommendations

Provide clear, actionable insights that help contractors make informed bid/no-bid decisions.`,

  proposalGeneration: `You are an expert proposal writer specializing in government contracts. Your task is to generate compelling, compliant proposal content.

When writing proposals:
1. Address all stated requirements directly
2. Use clear, professional language
3. Highlight relevant past performance and capabilities
4. Include specific metrics and measurable outcomes
5. Ensure compliance with all solicitation instructions
6. Maintain a confident but not arrogant tone

Generate content that is ready for review and submission.`,

  requirementExtraction: `You are a government contract requirements analyst. Your task is to extract and categorize requirements from solicitation documents.

For each requirement identified:
1. Categorize it (Technical, Management, Past Performance, etc.)
2. Determine if it's mandatory or optional
3. Assess its priority/weight in evaluation
4. Note any specific compliance needs
5. Flag any ambiguous or conflicting requirements

Be thorough and precise in extraction.`,

  bomGeneration: `You are a cost estimation specialist for government contracts. Your task is to generate detailed Bill of Materials (BOM) with pricing.

When creating BOMs:
1. Break down work into specific line items
2. Provide three pricing tiers (Aggressive, Competitive, Premium)
3. Include labor, materials, equipment, and overhead
4. Apply appropriate burden rates and profit margins
5. Ensure pricing is realistic and defensible
6. Note any assumptions made

Provide detailed, auditable cost breakdowns.`,

  matchScoring: `You are a contract matching specialist. Your task is to evaluate how well a company's capabilities match a contract opportunity.

Consider these factors:
1. NAICS code alignment
2. Past performance relevance
3. Geographic location fit
4. Contract value appropriateness
5. Set-aside eligibility
6. Technical capability match
7. Resource availability

Provide a numerical score (0-100) with detailed justification.`,
};

// =============================================================================
// AI HELPER FUNCTIONS
// =============================================================================

/**
 * Create a completion request with Claude
 */
export async function createClaudeCompletion(
  request: AICompletionRequest
): Promise<AICompletionResponse> {
  const client = getClaudeClient();

  const response = await client.messages.create({
    model: claudeConfig.model,
    max_tokens: request.maxTokens || claudeConfig.maxTokens,
    temperature: request.temperature ?? claudeConfig.temperature,
    system: request.systemPrompt,
    messages: request.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    stop_sequences: request.stopSequences,
  });

  const textContent = response.content.find((c) => c.type === 'text');
  const content = textContent && 'text' in textContent ? textContent.text : '';

  return {
    content,
    model: response.model,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    },
    finishReason: response.stop_reason || 'unknown',
    provider: 'claude',
  };
}

/**
 * Estimate token count for a string
 * Rough estimation: ~4 characters per token for English text
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit within token limit
 */
export function truncateToTokenLimit(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokenCount(text);
  if (estimatedTokens <= maxTokens) {
    return text;
  }

  const maxChars = maxTokens * 4;
  return text.slice(0, maxChars) + '...';
}

/**
 * Split text into chunks for processing
 */
export function splitTextIntoChunks(text: string, chunkSize: number = 3000): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = '';

  for (const sentence of sentences) {
    if (estimateTokenCount(currentChunk + sentence) > chunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    } else {
      currentChunk += ' ' + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate AI configuration
 */
export function validateAIConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!claudeConfig.apiKey && aiConfig.defaultProvider === 'claude') {
    errors.push('ANTHROPIC_API_KEY is required when Claude is the default provider');
  }

  if (!openaiConfig.apiKey && aiConfig.defaultProvider === 'openai') {
    errors.push('OPENAI_API_KEY is required when OpenAI is the default provider');
  }

  if (!openaiConfig.apiKey && !claudeConfig.apiKey) {
    errors.push('At least one AI provider API key must be configured');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  config: aiConfig,
  claude: claudeConfig,
  openai: openaiConfig,
  pinecone: pineconeConfig,
  getClaudeClient,
  createClaudeCompletion,
  systemPrompts,
  estimateTokenCount,
  truncateToTokenLimit,
  splitTextIntoChunks,
  validateAIConfig,
};

// =============================================================================
// GovBid Pro - Claude AI Service
// =============================================================================
// Core AI service using Anthropic's Claude for contract analysis and generation
// =============================================================================

import {
  getClaudeClient,
  claudeConfig,
  systemPrompts,
  estimateTokenCount,
  truncateToTokenLimit,
  splitTextIntoChunks,
  cacheGet,
  cacheSet,
} from '../../config';
import type { Contract, ContractRequirement } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface AIAnalysisResult {
  summary: string;
  keyPoints: string[];
  complexity: 'low' | 'medium' | 'high';
  estimatedEffort: {
    proposalDays: number;
    complexity: 'low' | 'medium' | 'high';
  };
  recommendations: AIRecommendation[];
  risks: AIRisk[];
  processingTime: number;
}

export interface AIRecommendation {
  id: string;
  type: 'strength' | 'weakness' | 'opportunity' | 'risk';
  title: string;
  description: string;
  actionItems: string[];
  priority: number;
}

export interface AIRisk {
  id: string;
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface ExtractedRequirement {
  category: string;
  requirement: string;
  isMandatory: boolean;
  priority: number;
  confidence: number;
  sourceSection?: string;
}

export interface ProposalSection {
  title: string;
  content: string;
  wordCount: number;
}

export interface GeneratedProposal {
  executiveSummary: string;
  technicalApproach: ProposalSection;
  managementApproach: ProposalSection;
  pastPerformance: ProposalSection;
  staffingPlan?: ProposalSection;
  qualityControl?: ProposalSection;
  totalWordCount: number;
  generatedAt: Date;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CACHE_PREFIX = 'ai:claude:';
const ANALYSIS_CACHE_TTL = 3600; // 1 hour
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate unique ID for AI results
 */
function generateId(): string {
  return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Delay helper for retries
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make Claude API request with retries
 */
async function makeClaudeRequest(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = claudeConfig.maxTokens
): Promise<string> {
  const client = getClaudeClient();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model: claudeConfig.model,
        max_tokens: maxTokens,
        temperature: claudeConfig.temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userMessage,
          },
        ],
      });

      const textContent = response.content.find((c) => c.type === 'text');
      if (textContent && 'text' in textContent) {
        return textContent.text;
      }

      throw new Error('No text content in response');
    } catch (error) {
      lastError = error as Error;
      console.error(`Claude API attempt ${attempt} failed:`, error);

      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY * attempt);
      }
    }
  }

  throw lastError || new Error('Claude API request failed');
}

/**
 * Parse JSON from Claude response (handles markdown code blocks)
 */
function parseJSONResponse<T>(response: string): T {
  // Remove markdown code blocks if present
  let cleaned = response.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }

  return JSON.parse(cleaned.trim()) as T;
}

// =============================================================================
// CONTRACT ANALYSIS
// =============================================================================

/**
 * Analyze a contract and generate insights
 */
export async function analyzeContract(
  contract: Contract,
  requirements?: ContractRequirement[]
): Promise<AIAnalysisResult> {
  const startTime = Date.now();

  // Check cache
  const cacheKey = `${CACHE_PREFIX}analysis:${contract.id}`;
  const cached = await cacheGet<AIAnalysisResult>(cacheKey);
  if (cached) {
    return { ...cached, processingTime: 0 };
  }

  // Build context
  const contractContext = buildContractContext(contract, requirements);

  const prompt = `Analyze this government contract opportunity and provide a comprehensive assessment.

CONTRACT DETAILS:
${contractContext}

Provide your analysis in the following JSON format:
{
  "summary": "2-3 sentence executive summary",
  "keyPoints": ["key point 1", "key point 2", "..."],
  "complexity": "low|medium|high",
  "estimatedEffort": {
    "proposalDays": number,
    "complexity": "low|medium|high"
  },
  "recommendations": [
    {
      "type": "strength|weakness|opportunity|risk",
      "title": "short title",
      "description": "detailed description",
      "actionItems": ["action 1", "action 2"],
      "priority": 1-5
    }
  ],
  "risks": [
    {
      "category": "Technical|Schedule|Cost|Compliance|Competition",
      "description": "risk description",
      "severity": "low|medium|high",
      "mitigation": "suggested mitigation"
    }
  ]
}`;

  const response = await makeClaudeRequest(systemPrompts.contractAnalysis, prompt);
  const analysis = parseJSONResponse<Omit<AIAnalysisResult, 'processingTime'>>(response);

  // Add IDs to recommendations and risks
  analysis.recommendations = analysis.recommendations.map((rec) => ({
    ...rec,
    id: generateId(),
  }));
  analysis.risks = analysis.risks.map((risk) => ({
    ...risk,
    id: generateId(),
  }));

  const result: AIAnalysisResult = {
    ...analysis,
    processingTime: Date.now() - startTime,
  };

  // Cache result
  await cacheSet(cacheKey, result, { ttl: ANALYSIS_CACHE_TTL });

  return result;
}

/**
 * Build contract context string for AI
 */
function buildContractContext(
  contract: Contract,
  requirements?: ContractRequirement[]
): string {
  const parts: string[] = [];

  parts.push(`Title: ${contract.title}`);

  if (contract.solicitationNumber) {
    parts.push(`Solicitation Number: ${contract.solicitationNumber}`);
  }

  if (contract.agency) {
    parts.push(`Agency: ${contract.agency}`);
  }

  if (contract.contractType) {
    parts.push(`Contract Type: ${contract.contractType}`);
  }

  if (contract.setAsideType && contract.setAsideType !== 'NONE') {
    parts.push(`Set-Aside: ${contract.setAsideType}`);
  }

  if (contract.naicsCode) {
    parts.push(`NAICS Code: ${contract.naicsCode}`);
  }

  if (contract.estimatedValue) {
    parts.push(`Estimated Value: $${contract.estimatedValue.toLocaleString()}`);
  }

  if (contract.responseDeadline) {
    parts.push(`Response Deadline: ${new Date(contract.responseDeadline).toLocaleDateString()}`);
  }

  if (contract.placeOfPerformance) {
    parts.push(`Place of Performance: ${contract.placeOfPerformance}`);
  }

  if (contract.description) {
    parts.push(`\nDescription:\n${truncateToTokenLimit(contract.description, 2000)}`);
  }

  if (requirements && requirements.length > 0) {
    parts.push('\nKey Requirements:');
    requirements.slice(0, 20).forEach((req, i) => {
      const mandatory = req.isMandatory ? '[MANDATORY]' : '[OPTIONAL]';
      parts.push(`${i + 1}. ${mandatory} ${req.requirement}`);
    });
  }

  return parts.join('\n');
}

// =============================================================================
// REQUIREMENT EXTRACTION
// =============================================================================

/**
 * Extract requirements from contract text
 */
export async function extractRequirements(
  text: string,
  contractTitle?: string
): Promise<ExtractedRequirement[]> {
  // Split text into chunks if too long
  const chunks = splitTextIntoChunks(text, 3000);
  const allRequirements: ExtractedRequirement[] = [];

  for (const chunk of chunks) {
    const prompt = `Extract all requirements from this solicitation document section.
${contractTitle ? `Contract: ${contractTitle}\n` : ''}
TEXT:
${chunk}

Extract requirements and return as JSON array:
[
  {
    "category": "TECHNICAL|MANAGEMENT|PAST_PERFORMANCE|PRICING|COMPLIANCE|CERTIFICATION|INSURANCE|BONDING|OTHER",
    "requirement": "the requirement text",
    "isMandatory": true/false,
    "priority": 1-5 (5 being highest),
    "confidence": 0.0-1.0,
    "sourceSection": "section name if identifiable"
  }
]

Focus on:
- Shall/must statements (mandatory)
- Should/may statements (optional)
- Specific deliverables
- Technical specifications
- Compliance requirements
- Certifications needed
- Experience requirements`;

    try {
      const response = await makeClaudeRequest(systemPrompts.requirementExtraction, prompt);
      const requirements = parseJSONResponse<ExtractedRequirement[]>(response);
      allRequirements.push(...requirements);
    } catch (error) {
      console.error('Failed to extract requirements from chunk:', error);
    }
  }

  // Deduplicate and sort by priority
  const uniqueRequirements = deduplicateRequirements(allRequirements);
  return uniqueRequirements.sort((a, b) => {
    if (a.isMandatory !== b.isMandatory) {
      return a.isMandatory ? -1 : 1;
    }
    return b.priority - a.priority;
  });
}

/**
 * Deduplicate similar requirements
 */
function deduplicateRequirements(requirements: ExtractedRequirement[]): ExtractedRequirement[] {
  const seen = new Map<string, ExtractedRequirement>();

  for (const req of requirements) {
    const key = req.requirement.toLowerCase().trim().slice(0, 100);
    const existing = seen.get(key);

    if (!existing || req.confidence > existing.confidence) {
      seen.set(key, req);
    }
  }

  return Array.from(seen.values());
}

// =============================================================================
// PROPOSAL GENERATION
// =============================================================================

/**
 * Generate proposal content for a contract
 */
export async function generateProposal(
  contract: Contract,
  requirements: ContractRequirement[],
  companyProfile: {
    name: string;
    description: string;
    capabilities: string[];
    pastPerformance?: string[];
  },
  options?: {
    maxWords?: number;
    tone?: 'formal' | 'confident' | 'collaborative';
    sections?: string[];
  }
): Promise<GeneratedProposal> {
  const maxWords = options?.maxWords || 5000;
  const tone = options?.tone || 'confident';

  const prompt = `Generate a compelling proposal for this government contract opportunity.

CONTRACT:
${buildContractContext(contract, requirements)}

COMPANY PROFILE:
Company: ${companyProfile.name}
Description: ${companyProfile.description}
Capabilities: ${companyProfile.capabilities.join(', ')}
${companyProfile.pastPerformance ? `Past Performance: ${companyProfile.pastPerformance.join('; ')}` : ''}

INSTRUCTIONS:
- Write in a ${tone} tone
- Target approximately ${maxWords} total words
- Address all mandatory requirements
- Highlight relevant capabilities and experience
- Be specific with metrics and outcomes where possible

Return as JSON:
{
  "executiveSummary": "compelling 200-300 word summary",
  "technicalApproach": {
    "title": "Technical Approach",
    "content": "detailed technical approach section"
  },
  "managementApproach": {
    "title": "Management Approach",
    "content": "management and staffing approach"
  },
  "pastPerformance": {
    "title": "Past Performance",
    "content": "relevant past performance narrative"
  },
  "qualityControl": {
    "title": "Quality Control",
    "content": "quality assurance approach"
  }
}`;

  const response = await makeClaudeRequest(systemPrompts.proposalGeneration, prompt, 8000);
  const proposal = parseJSONResponse<Omit<GeneratedProposal, 'totalWordCount' | 'generatedAt'>>(response);

  // Calculate word counts
  const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

  const sections = [
    proposal.executiveSummary,
    proposal.technicalApproach.content,
    proposal.managementApproach.content,
    proposal.pastPerformance.content,
    proposal.qualityControl?.content || '',
  ];

  proposal.technicalApproach.wordCount = countWords(proposal.technicalApproach.content);
  proposal.managementApproach.wordCount = countWords(proposal.managementApproach.content);
  proposal.pastPerformance.wordCount = countWords(proposal.pastPerformance.content);
  if (proposal.qualityControl) {
    proposal.qualityControl.wordCount = countWords(proposal.qualityControl.content);
  }

  return {
    ...proposal,
    totalWordCount: sections.reduce((sum, s) => sum + countWords(s), 0),
    generatedAt: new Date(),
  };
}

// =============================================================================
// SUMMARY GENERATION
// =============================================================================

/**
 * Generate a concise summary of a contract
 */
export async function generateContractSummary(
  contract: Contract,
  maxLength: number = 500
): Promise<string> {
  const cacheKey = `${CACHE_PREFIX}summary:${contract.id}`;
  const cached = await cacheGet<string>(cacheKey);
  if (cached) {
    return cached;
  }

  const prompt = `Summarize this government contract opportunity in ${maxLength} characters or less.

Title: ${contract.title}
Agency: ${contract.agency || 'Not specified'}
Value: ${contract.estimatedValue ? `$${contract.estimatedValue.toLocaleString()}` : 'Not specified'}
Deadline: ${contract.responseDeadline ? new Date(contract.responseDeadline).toLocaleDateString() : 'Not specified'}
Set-Aside: ${contract.setAsideType || 'None'}
NAICS: ${contract.naicsCode || 'Not specified'}

Description:
${truncateToTokenLimit(contract.description || contract.synopsis || 'No description available', 1500)}

Provide a clear, concise summary focusing on:
1. What the contract is for
2. Key requirements
3. Why a contractor might be interested`;

  const response = await makeClaudeRequest(systemPrompts.contractAnalysis, prompt, 500);
  const summary = response.trim();

  await cacheSet(cacheKey, summary, { ttl: ANALYSIS_CACHE_TTL });

  return summary;
}

// =============================================================================
// QUESTION ANSWERING
// =============================================================================

/**
 * Answer questions about a contract
 */
export async function answerContractQuestion(
  contract: Contract,
  question: string,
  requirements?: ContractRequirement[]
): Promise<string> {
  const context = buildContractContext(contract, requirements);

  const prompt = `Based on the following contract information, answer the user's question.

CONTRACT INFORMATION:
${context}

QUESTION: ${question}

Provide a clear, helpful answer based only on the information provided. If the information isn't available in the contract details, say so.`;

  return makeClaudeRequest(systemPrompts.contractAnalysis, prompt, 1000);
}

// =============================================================================
// COMPLIANCE CHECK
// =============================================================================

export interface ComplianceCheckResult {
  isCompliant: boolean;
  score: number;
  checks: {
    requirement: string;
    status: 'met' | 'partially_met' | 'not_met' | 'unknown';
    notes: string;
  }[];
  recommendations: string[];
}

/**
 * Check company compliance against contract requirements
 */
export async function checkCompliance(
  requirements: ContractRequirement[],
  companyCapabilities: {
    certifications: string[];
    naicsCodes: string[];
    pastPerformance: string[];
    capabilities: string[];
  }
): Promise<ComplianceCheckResult> {
  const mandatoryReqs = requirements.filter((r) => r.isMandatory);

  const prompt = `Evaluate if the company can comply with these contract requirements.

MANDATORY REQUIREMENTS:
${mandatoryReqs.map((r, i) => `${i + 1}. ${r.requirement}`).join('\n')}

COMPANY QUALIFICATIONS:
Certifications: ${companyCapabilities.certifications.join(', ') || 'None listed'}
NAICS Codes: ${companyCapabilities.naicsCodes.join(', ') || 'None listed'}
Capabilities: ${companyCapabilities.capabilities.join(', ') || 'None listed'}
Past Performance Areas: ${companyCapabilities.pastPerformance.join(', ') || 'None listed'}

Return JSON:
{
  "isCompliant": true/false (can the company reasonably comply),
  "score": 0-100,
  "checks": [
    {
      "requirement": "requirement text",
      "status": "met|partially_met|not_met|unknown",
      "notes": "explanation"
    }
  ],
  "recommendations": ["recommendation 1", "recommendation 2"]
}`;

  const response = await makeClaudeRequest(systemPrompts.contractAnalysis, prompt);
  return parseJSONResponse<ComplianceCheckResult>(response);
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  analyzeContract,
  extractRequirements,
  generateProposal,
  generateContractSummary,
  answerContractQuestion,
  checkCompliance,
};

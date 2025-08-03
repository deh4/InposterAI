/**
 * Unified Analysis Engine for AI Content Detection
 * Consolidates LLM and statistical analysis with robust error handling
 */

import { OllamaClient } from './ollama-client.js';
import { StatisticalAnalyzer } from './statistical-analyzer.js';

export class AnalysisEngine {
  constructor() {
    this.ollamaClient = new OllamaClient();
    this.statisticalAnalyzer = new StatisticalAnalyzer();
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Main analysis method with comprehensive error handling
   */
  async analyze(text, options = {}) {
    const startTime = Date.now();
    
    // Validate input
    if (!text || text.trim().length < 50) {
      throw new Error('Text too short for reliable analysis (minimum 50 characters)');
    }

    // Check cache first
    const textHash = this.hashText(text);
    const cached = this.getFromCache(textHash);
    if (cached && !options.bypassCache) {
      return this.enhanceResult(cached, { fromCache: true, analysisTime: Date.now() - startTime });
    }

    try {
      // Run analyses in parallel where possible
      const [statisticalResult, llmResult] = await Promise.allSettled([
        this.runStatisticalAnalysis(text),
        this.runLLMAnalysis(text)
      ]);

      // Process results
      const stats = statisticalResult.status === 'fulfilled' ? statisticalResult.value : null;
      const llm = llmResult.status === 'fulfilled' ? llmResult.value : null;

      // Combine results with ensemble scoring
      const result = this.combineResults(stats, llm, text);
      
      // Enhance with metadata
      const enhancedResult = this.enhanceResult(result, {
        fromCache: false,
        analysisTime: Date.now() - startTime,
        textLength: text.length,
        wordCount: text.split(/\s+/).length,
        timestamp: Date.now()
      });

      // Cache for future use
      this.addToCache(textHash, enhancedResult);

      return enhancedResult;

    } catch (error) {
      console.error('Analysis failed:', error);
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  /**
   * Statistical analysis (always available)
   */
  async runStatisticalAnalysis(text) {
    try {
      return this.statisticalAnalyzer.analyze(text);
    } catch (error) {
      console.warn('Statistical analysis failed:', error);
      throw error;
    }
  }

  /**
   * LLM analysis with robust error handling
   */
  async runLLMAnalysis(text) {
    try {
      // Test connection first
      const connectionTest = await this.ollamaClient.testConnection();
      if (!connectionTest.success) {
        throw new Error(`Ollama unavailable: ${connectionTest.error}`);
      }

      // Get LLM analysis with multiple parsing strategies
      return await this.getLLMAnalysisWithFallbacks(text);
      
    } catch (error) {
      console.warn('LLM analysis failed:', error);
      throw error;
    }
  }

  /**
   * LLM analysis with multiple parsing strategies
   */
  async getLLMAnalysisWithFallbacks(text) {
    const prompt = this.buildAnalysisPrompt(text);
    
    try {
      const response = await this.ollamaClient.generate(prompt);
      return this.parseResponseWithStrategies(response);
    } catch (error) {
      console.error('LLM generation failed:', error);
      throw error;
    }
  }

  /**
   * Multiple parsing strategies for robust LLM response handling
   */
  parseResponseWithStrategies(response) {
    const strategies = [
      () => this.parseStructuredJSON(response),
      () => this.parseMarkdownJSON(response),
      () => this.parseKeyValuePairs(response),
      () => this.parseWithRegex(response),
      () => this.fallbackAnalysis(response)
    ];

    for (const [index, strategy] of strategies.entries()) {
      try {
        const result = strategy();
        if (this.isValidResult(result)) {
          console.log(`LLM parsing succeeded with strategy ${index + 1}`);
          return result;
        }
      } catch (error) {
        console.warn(`LLM parsing strategy ${index + 1} failed:`, error);
        continue;
      }
    }

    throw new Error('All LLM parsing strategies failed');
  }

  /**
   * Strategy 1: Parse clean JSON
   */
  parseStructuredJSON(response) {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return this.normalizeResult(parsed);
    }
    throw new Error('No JSON found');
  }

  /**
   * Strategy 2: Parse JSON from markdown code blocks
   */
  parseMarkdownJSON(response) {
    const markdownMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
    if (markdownMatch) {
      const parsed = JSON.parse(markdownMatch[1]);
      return this.normalizeResult(parsed);
    }
    throw new Error('No markdown JSON found');
  }

  /**
   * Strategy 3: Parse key-value pairs
   */
  parseKeyValuePairs(response) {
    const result = {};
    
    // Extract likelihood
    const likelihoodMatch = response.match(/(?:likelihood|probability).*?(\d+)%?/i);
    if (likelihoodMatch) result.likelihood = parseInt(likelihoodMatch[1]);
    
    // Extract confidence
    const confidenceMatch = response.match(/confidence.*?(\d+)%?/i);
    if (confidenceMatch) result.confidence = parseInt(confidenceMatch[1]);
    
    // Extract reasoning
    const reasoningMatch = response.match(/(?:reasoning|explanation).*?[:]\s*(.+?)(?:\n|$)/i);
    if (reasoningMatch) result.reasoning = reasoningMatch[1].trim();

    return this.normalizeResult(result);
  }

  /**
   * Strategy 4: Regex extraction
   */
  parseWithRegex(response) {
    const patterns = {
      likelihood: /(\d+)%?\s*(?:ai|artificial|generated)/i,
      confidence: /(\d+)%?\s*(?:confidence|certain|sure)/i,
      reasoning: /(?:because|reason|analysis)[:\-\s]+(.{50,200})/i
    };

    const result = {};
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = response.match(pattern);
      if (match) {
        result[key] = key === 'reasoning' ? match[1].trim() : parseInt(match[1]);
      }
    }

    return this.normalizeResult(result);
  }

  /**
   * Strategy 5: Fallback keyword analysis
   */
  fallbackAnalysis(response) {
    const lowerResponse = response.toLowerCase();
    
    let likelihood = 50; // Default neutral
    let confidence = 30; // Low confidence for fallback

    // Adjust based on keywords
    if (lowerResponse.includes('ai') || lowerResponse.includes('artificial')) likelihood += 30;
    if (lowerResponse.includes('human') || lowerResponse.includes('person')) likelihood -= 30;
    if (lowerResponse.includes('definitely') || lowerResponse.includes('clearly')) confidence += 20;
    if (lowerResponse.includes('probably') || lowerResponse.includes('likely')) confidence += 10;

    return {
      likelihood: Math.min(100, Math.max(0, likelihood)),
      confidence: Math.min(100, Math.max(0, confidence)),
      reasoning: 'Fallback analysis - LLM response parsing failed',
      keyIndicators: ['fallback-analysis'],
      rawResponse: response,
      parsingMethod: 'fallback'
    };
  }

  /**
   * Normalize and validate LLM result
   */
  normalizeResult(result) {
    return {
      likelihood: Math.min(100, Math.max(0, result.likelihood || result.likelikhood || 50)),
      confidence: Math.min(100, Math.max(0, result.confidence || 50)),
      reasoning: result.reasoning || 'No reasoning provided',
      keyIndicators: result.key_indicators || result.keyIndicators || [],
      rawResponse: result.rawResponse || '',
      parsingMethod: 'structured'
    };
  }

  /**
   * Validate LLM result
   */
  isValidResult(result) {
    return result && 
           typeof result.likelihood === 'number' && 
           typeof result.confidence === 'number' &&
           result.likelihood >= 0 && result.likelihood <= 100 &&
           result.confidence >= 0 && result.confidence <= 100;
  }

  /**
   * Combine statistical and LLM results with ensemble scoring
   */
  combineResults(statisticalResult, llmResult, _text) {
    if (!statisticalResult && !llmResult) {
      throw new Error('Both statistical and LLM analysis failed');
    }

    // Use statistical as base if LLM failed
    if (!llmResult) {
      const stats = this.statisticalAnalyzer.calculateEnsembleScore(statisticalResult);
      return {
        likelihood: stats.likelihood,
        confidence: Math.min(stats.confidence, 60), // Lower confidence without LLM
        reasoning: 'Statistical analysis only - LLM unavailable',
        method: 'statistical',
        statisticalBreakdown: stats.breakdown,
        llmAnalysis: null
      };
    }

    // Use LLM as base if statistical failed
    if (!statisticalResult) {
      return {
        likelihood: llmResult.likelihood,
        confidence: Math.min(llmResult.confidence, 70), // Lower confidence without statistical
        reasoning: llmResult.reasoning,
        method: 'llm',
        statisticalBreakdown: null,
        llmAnalysis: llmResult
      };
    }

    // Combine both with ensemble scoring
    const ensembleResult = this.statisticalAnalyzer.calculateEnsembleScore(statisticalResult, llmResult);
    
    return {
      likelihood: ensembleResult.likelihood,
      confidence: ensembleResult.confidence,
      reasoning: this.generateDetailedReasoning(llmResult, statisticalResult, ensembleResult),
      method: 'ensemble',
      statisticalBreakdown: ensembleResult.breakdown,
      llmAnalysis: llmResult
    };
  }

  /**
   * Generate detailed reasoning combining LLM and statistical analysis
   */
  generateDetailedReasoning(llmAnalysis, statisticalStats, ensembleResult) {
    if (!llmAnalysis) return 'Statistical analysis only';
    
    const agreement = Math.abs(llmAnalysis.likelihood - ensembleResult.statisticalScore) < 20 ? 'agree' : 'disagree';
    
    return `LLM Analysis: ${llmAnalysis.reasoning}. ${agreement === 'agree' ? 'High' : 'Medium'} confidence: LLM and statistical analysis ${agreement}`;
  }

  /**
   * Build analysis prompt for LLM
   */
  buildAnalysisPrompt(text) {
    return `You are an expert AI content detector. Analyze the following text to determine if it was written by AI or a human.

ANALYSIS CRITERIA:
1. **Linguistic Patterns**: Look for AI-typical phrases like "Furthermore," "Moreover," "It's important to note," "In conclusion"
2. **Writing Style**: Check for overly formal tone, lack of personal voice, generic expressions
3. **Content Flow**: Examine if transitions are too smooth/formulaic vs. natural human irregularities  
4. **Vocabulary**: Assess if word choice seems diverse/natural vs. repetitive/formulaic
5. **Sentence Structure**: Evaluate if sentences are too uniform vs. natural human variation
6. **Specificity**: Check for vague generalities vs. concrete details/personal insights
7. **Imperfections**: Look for natural human quirks, typos, or conversational elements

TEXT TO ANALYZE:
"${text}"

RESPOND WITH JSON:
{
  "likelihood": [0-100 number, where 0=definitely human, 100=definitely AI],
  "confidence": [0-100 number, your confidence in this assessment],
  "reasoning": "Concise explanation of 2-3 key factors that led to your assessment",
  "key_indicators": ["list", "of", "specific", "evidence"]
}`;
  }

  /**
   * Enhance result with metadata
   */
  enhanceResult(result, metadata) {
    return {
      ...result,
      ...metadata,
      id: this.generateId(),
      version: '2.0'
    };
  }

  /**
   * Cache management
   */
  hashText(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  getFromCache(textHash) {
    const cached = this.cache.get(textHash);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached;
    }
    this.cache.delete(textHash);
    return null;
  }

  addToCache(textHash, result) {
    this.cache.set(textHash, { ...result, timestamp: Date.now() });
    
    // Clean old entries
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export default AnalysisEngine; 
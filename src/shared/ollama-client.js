/**
 * Ollama API Client for local AI text analysis
 */

const OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'gemma3n:e4b';

export class OllamaClient {
  constructor(model = DEFAULT_MODEL) {
    this.model = model;
    this.baseUrl = OLLAMA_BASE_URL;
  }

  /**
   * Test connection to Ollama service
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return { success: true, version: data.version };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Analyze text for AI generation likelihood
   */
  async analyzeText(text) {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    const prompt = `Analyze the following text to determine if it was likely written by AI or by a human. Consider factors like:
- Writing style and flow
- Vocabulary and phrase patterns
- Sentence structure consistency
- Use of filler words and natural imperfections
- Topic expertise and nuance

Text to analyze:
"${text}"

Respond with a JSON object containing:
- "likelihood": number between 0-100 (0=definitely human, 100=definitely AI)
- "confidence": number between 0-100 (how confident you are in this assessment)
- "reasoning": brief explanation of key factors

Response:`;

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseAnalysisResponse(data.response);
    } catch (error) {
      throw new Error(`Ollama analysis failed: ${error.message}`);
    }
  }

  /**
   * Parse AI model response and extract analysis data
   */
  parseAnalysisResponse(response) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          likelihood: Math.min(100, Math.max(0, parsed.likelihood || 0)),
          confidence: Math.min(100, Math.max(0, parsed.confidence || 0)),
          reasoning: parsed.reasoning || 'No reasoning provided',
          rawResponse: response,
        };
      }
    } catch (error) {
      // If JSON parsing fails, provide fallback analysis
      console.warn('Failed to parse structured response:', error);
    }

    // Fallback: simple keyword-based analysis
    return this.fallbackAnalysis(response);
  }

  /**
   * Fallback analysis when structured parsing fails
   */
  fallbackAnalysis(response) {
    const lowerResponse = response.toLowerCase();
    
    // Simple heuristics based on response content
    let likelihood = 50; // Default neutral
    let confidence = 30; // Low confidence for fallback

    if (lowerResponse.includes('ai') || lowerResponse.includes('artificial')) {
      likelihood += 20;
    }
    if (lowerResponse.includes('human') || lowerResponse.includes('person')) {
      likelihood -= 20;
    }
    if (lowerResponse.includes('likely') || lowerResponse.includes('probably')) {
      confidence += 10;
    }

    return {
      likelihood: Math.min(100, Math.max(0, likelihood)),
      confidence: Math.min(100, Math.max(0, confidence)),
      reasoning: 'Fallback analysis - structured response parsing failed',
      rawResponse: response,
    };
  }

  /**
   * Get available models
   */
  async getModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      throw new Error(`Failed to get models: ${error.message}`);
    }
  }
}

export default OllamaClient; 
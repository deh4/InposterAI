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
      const response = await fetch(`${this.baseUrl}/api/version`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return { success: true, version: data.version };
    } catch (error) {
      console.error('Ollama connection test failed:', error);
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
      console.log('Making Ollama API request to:', `${this.baseUrl}/api/generate`);
      
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
        }),
      });

      console.log('Ollama API response status:', response.status, response.statusText);

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Ollama server is denying access. Check if Ollama allows external connections.');
        } else if (response.status === 404) {
          throw new Error(`Model "${this.model}" not found. Try running: ollama pull ${this.model}`);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();
      console.log('Ollama API response data:', data);
      
      return this.parseAnalysisResponse(data.response);
    } catch (error) {
      console.error('Ollama analysis error:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Cannot connect to Ollama. Make sure Ollama is running with: ollama serve');
      }
      
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
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors'
      });
      
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
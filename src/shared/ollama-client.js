/**
 * Ollama API Client for local AI text analysis
 */

import StatisticalAnalyzer from './statistical-analyzer.js';

const OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'gemma3n:e4b';

export class OllamaClient {
  constructor(model = DEFAULT_MODEL) {
    this.model = model;
    this.baseUrl = OLLAMA_BASE_URL;
    this.statisticalAnalyzer = new StatisticalAnalyzer();
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
   * Analyze text for AI generation likelihood using ensemble approach
   */
  async analyzeText(text) {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    const startTime = Date.now(); // Start timing

    // Perform statistical analysis first
    console.log('Running statistical analysis...');
    const statisticalStats = this.statisticalAnalyzer.analyze(text);

    // Get LLM analysis with timing
    console.log('Running LLM analysis...');
    const llmStartTime = Date.now();
    const llmAnalysis = await this.getLLMAnalysis(text);
    const llmEndTime = Date.now();

    // Combine using ensemble scoring
    const ensembleResult = this.statisticalAnalyzer.calculateEnsembleScore(
      statisticalStats, 
      llmAnalysis
    );

    const totalTime = Date.now() - startTime;

    return {
      likelihood: ensembleResult.likelihood,
      confidence: ensembleResult.confidence,
      reasoning: this.generateDetailedReasoning(llmAnalysis, statisticalStats, ensembleResult),
      rawResponse: llmAnalysis.rawResponse,
      statisticalBreakdown: ensembleResult.breakdown,
      llmAnalysis: llmAnalysis,
      method: 'ensemble',
      // Enhanced timing and model info
      analysisTime: totalTime,
      llmResponseTime: llmEndTime - llmStartTime,
      statisticalTime: llmStartTime - startTime,
      modelName: this.model,
      timestamp: Date.now()
    };
  }

  /**
   * Get LLM analysis from Ollama
   */
  async getLLMAnalysis(text) {
    const prompt = `You are an expert AI content detector. Analyze the following text to determine if it was written by AI or a human.

ANALYSIS CRITERIA:
1. **Linguistic Patterns**: Look for AI-typical phrases like "Furthermore," "Moreover," "It's important to note," "In conclusion"
2. **Writing Style**: Check for overly formal tone, lack of personal voice, generic expressions
3. **Content Flow**: Examine if transitions are too smooth/formulaic vs. natural human irregularities  
4. **Vocabulary**: Assess if word choice seems diverse/natural vs. repetitive/formulaic
5. **Sentence Structure**: Evaluate if sentences are too uniform vs. natural human variation
6. **Specificity**: Check for vague generalities vs. concrete details/personal insights
7. **Imperfections**: Look for natural human quirks, typos, or conversational elements

TEXT TO ANALYZE:
"${text.substring(0, 2000)}" ${text.length > 2000 ? '...[truncated]' : ''}

RESPOND WITH VALID JSON ONLY (no markdown, no explanation):
{
  "likelihood": [0-100 integer],
  "confidence": [0-100 integer],
  "reasoning": "Brief explanation",
  "key_indicators": ["item1", "item2", "item3"]
}

IMPORTANT: 
- Return ONLY the JSON object, no other text
- Use integer values for likelihood and confidence
- Keep reasoning under 200 characters
- Be especially careful of false positives - focus on distinctly AI-like patterns`;

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
          options: {
            temperature: 0.1, // Lower temperature for more consistent analysis
            top_p: 0.9,
            repeat_penalty: 1.1
          }
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
   * Parse AI model response and extract analysis data with multiple strategies
   */
  parseAnalysisResponse(response) {
    console.log('Raw LLM response:', response);
    
    // Strategy 1: Direct JSON parse (for clean responses)
    const result1 = this.tryDirectJSONParse(response);
    if (result1) {
      console.log('Successfully parsed with direct JSON strategy');
      return result1;
    }

    // Strategy 2: Extract JSON from markdown code blocks
    const result2 = this.tryMarkdownJSONParse(response);
    if (result2) {
      console.log('Successfully parsed with markdown JSON strategy');
      return result2;
    }

    // Strategy 3: Regex-based JSON extraction
    const result3 = this.tryRegexJSONParse(response);
    if (result3) {
      console.log('Successfully parsed with regex JSON strategy');
      return result3;
    }

    // Strategy 4: Line-by-line parsing for malformed JSON
    const result4 = this.tryLineByLineParse(response);
    if (result4) {
      console.log('Successfully parsed with line-by-line strategy');
      return result4;
    }

    // Fallback: keyword-based analysis
    console.warn('All JSON parsing strategies failed, using fallback analysis');
    return this.fallbackAnalysis(response);
  }

  /**
   * Strategy 1: Try direct JSON parsing (for clean responses)
   */
  tryDirectJSONParse(response) {
    try {
      const cleaned = response.trim();
      const parsed = JSON.parse(cleaned);
      return this.formatParseResult(parsed, response);
    } catch (error) {
      return null;
    }
  }

  /**
   * Strategy 2: Extract JSON from markdown code blocks
   */
  tryMarkdownJSONParse(response) {
    try {
      // Look for ```json or ``` code blocks
      const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
      if (codeBlockMatch) {
        const parsed = JSON.parse(codeBlockMatch[1]);
        return this.formatParseResult(parsed, response);
      }
         } catch {
       // Continue to next strategy
     }
     return null;
   }

   /**
    * Strategy 3: Regex-based JSON extraction
    */
   tryRegexJSONParse(response) {
     try {
       // Look for the first complete JSON object
       const jsonMatch = response.match(/\{[\s\S]*?\}/);
       if (jsonMatch) {
         const parsed = JSON.parse(jsonMatch[0]);
         return this.formatParseResult(parsed, response);
       }
     } catch {
       // Continue to next strategy
     }
     return null;
   }

   /**
    * Strategy 4: Line-by-line parsing for malformed JSON
    */
   tryLineByLineParse(response) {
     try {
       const lines = response.split('\n');
       let likelihood = null;
       let confidence = null;
       let reasoning = '';
       let keyIndicators = [];

       for (const line of lines) {
         // Extract likelihood
         const likelihoodMatch = line.match(/["']?likelihood["']?\s*:\s*(\d+)/i);
         if (likelihoodMatch) likelihood = parseInt(likelihoodMatch[1]);

         // Extract confidence
         const confidenceMatch = line.match(/["']?confidence["']?\s*:\s*(\d+)/i);
         if (confidenceMatch) confidence = parseInt(confidenceMatch[1]);

         // Extract reasoning
         const reasoningMatch = line.match(/["']?reasoning["']?\s*:\s*["']([^"']+)["']?/i);
         if (reasoningMatch) reasoning = reasoningMatch[1];

        // Extract key indicators (simplified)
        if (line.includes('key_indicators') || line.includes('indicators')) {
          const indicatorMatch = line.match(/\[(.*?)\]/);
          if (indicatorMatch) {
            keyIndicators = indicatorMatch[1]
              .split(',')
              .map(item => item.trim().replace(/['"]/g, ''))
              .filter(item => item.length > 0);
          }
        }
      }

      // If we got at least likelihood and confidence, use it
      if (likelihood !== null && confidence !== null) {
        return this.formatParseResult({
          likelihood,
          confidence,
          reasoning: reasoning || 'Extracted from malformed response',
          key_indicators: keyIndicators
        }, response);
      }
    } catch (error) {
      // Continue to fallback
    }
    return null;
  }

  /**
   * Format and validate parsed result
   */
  formatParseResult(parsed, rawResponse) {
    // Validate required fields exist
    if (typeof parsed.likelihood !== 'number' || typeof parsed.confidence !== 'number') {
      return null;
    }

    return {
      likelihood: Math.min(100, Math.max(0, parsed.likelihood || 0)),
      confidence: Math.min(100, Math.max(0, parsed.confidence || 0)),
      reasoning: parsed.reasoning || 'No reasoning provided',
      keyIndicators: parsed.key_indicators || [],
      rawResponse: rawResponse,
    };
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
      keyIndicators: ['fallback-analysis'],
      rawResponse: response,
    };
  }

  /**
   * Generate detailed reasoning combining LLM and statistical analysis
   */
  generateDetailedReasoning(llmAnalysis, statisticalStats, ensembleResult) {
    const parts = [];
    
    // Start with LLM reasoning
    if (llmAnalysis && llmAnalysis.reasoning) {
      parts.push(`LLM Analysis: ${llmAnalysis.reasoning}`);
    }

    // Add key statistical indicators
    const statIndicators = [];
    if (statisticalStats.perplexityScore > 60) {
      statIndicators.push('high perplexity (predictable patterns)');
    }
    if (statisticalStats.burstinessScore > 60) {
      statIndicators.push('low sentence length variation');
    }
    if (statisticalStats.aiIndicatorScore > 30) {
      statIndicators.push('AI-typical phrases detected');
    }
    if (statisticalStats.vocabularyDiversity > 60) {
      statIndicators.push('repetitive vocabulary');
    }

    if (statIndicators.length > 0) {
      parts.push(`Statistical indicators: ${statIndicators.join(', ')}`);
    }

    // Add confidence note
    const agreement = Math.abs(llmAnalysis.likelihood - (ensembleResult.statisticalScore || 50));
    if (agreement < 20) {
      parts.push('High confidence: LLM and statistical analysis agree');
    } else if (agreement > 40) {
      parts.push('Moderate confidence: Some disagreement between analysis methods');
    }

    return parts.join('. ') || 'Analysis completed using ensemble approach';
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

  /**
   * Get Ollama version information
   */
  async getOllamaVersion() {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        mode: 'cors'
      });

      if (response.ok) {
        const data = await response.json();
        return data.version || 'unknown';
      }
      return 'unknown';
    } catch (error) {
      console.warn('Could not get Ollama version:', error.message);
      return 'unknown';
    }
  }

  /**
   * Get detailed model information
   */
  async getModelInfo(modelName = null) {
    try {
      const model = modelName || this.model;
      const response = await fetch(`${this.baseUrl}/api/show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify({ name: model })
      });

      if (response.ok) {
        const data = await response.json();
        return {
          name: model,
          family: data.details?.family || 'unknown',
          size: data.details?.parameter_size || 'unknown',
          format: data.details?.format || 'unknown',
          quantization: data.details?.quantization_level || 'unknown'
        };
      }
      return { name: modelName || this.model, family: 'unknown', size: 'unknown', format: 'unknown' };
    } catch (error) {
      console.warn('Could not get model info:', error.message);
      return { name: modelName || this.model, family: 'unknown', size: 'unknown', format: 'unknown' };
    }
  }

  /**
   * Set the current model for analysis
   */
  setModel(modelName) {
    this.model = modelName;
    console.log(`Ollama client updated to use model: ${modelName}`);
  }

  /**
   * Get the current model name
   */
  getCurrentModel() {
    return this.model;
  }
}

export default OllamaClient; 
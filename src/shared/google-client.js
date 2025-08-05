/**
 * Google Gemini API Client for AI Content Detection
 * Handles API key validation, model retrieval, and text analysis
 */
class GoogleClient {
  constructor() {
    this.apiKey = null;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.availableModels = [];
  }

  /**
   * Set the Google API key
   */
  setApiKey(apiKey) {
    this.apiKey = apiKey;
    console.log('Google API key updated');
  }

  /**
   * Validate API key by testing a simple request
   */
  async validateApiKey(apiKey = this.apiKey) {
    if (!apiKey) {
      throw new Error('No API key provided');
    }

    try {
      const response = await fetch(`${this.baseUrl}/models?key=${apiKey}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || `API Error: ${response.status}`);
      }
      
      return true;
    } catch (error) {
      console.error('Google API key validation failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve available models from Google Gemini API
   */
  async getAvailableModels(apiKey = this.apiKey) {
    if (!apiKey) {
      throw new Error('No API key provided');
    }

    try {
      const response = await fetch(`${this.baseUrl}/models?key=${apiKey}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || `API Error: ${response.status}`);
      }
      
      // Filter for text generation models only
      const textModels = data.models?.filter(model => 
        model.supportedGenerationMethods?.includes('generateContent') &&
        model.name.includes('gemini')
      ) || [];
      
      this.availableModels = textModels.map(model => ({
        name: model.name.replace('models/', ''), // Remove 'models/' prefix
        displayName: model.displayName || model.name,
        description: model.description || 'Google Gemini model'
      }));
      
      console.log('Retrieved Google models:', this.availableModels);
      return this.availableModels;
    } catch (error) {
      console.error('Failed to retrieve Google models:', error);
      throw error;
    }
  }

  /**
   * Analyze text using Google Gemini API
   */
  async analyzeText(text, modelName = 'gemini-pro', customInstructions = '') {
    if (!this.apiKey) {
      throw new Error('No Google API key configured');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('No text provided for analysis');
    }

    try {
      let prompt = `You are an expert AI content detector. Analyze the following text to determine if it was written by AI or a human.

IMPORTANT: Your likelihood score MUST match your reasoning. If you say it's likely human-written, the likelihood should be LOW (0-40). If you say it's likely AI-written, the likelihood should be HIGH (60-100).

ANALYSIS CRITERIA:
1. **Linguistic Patterns**: AI often uses phrases like "Furthermore," "Moreover," "It's important to note," "In conclusion"
2. **Writing Style**: AI tends toward formal tone, lacks personal voice, uses generic expressions
3. **Content Flow**: AI has overly smooth/formulaic transitions vs. natural human irregularities
4. **Vocabulary**: AI may be repetitive/formulaic vs. diverse/natural human choice
5. **Sentence Structure**: AI creates uniform sentences vs. natural human variation
6. **Specificity**: AI uses vague generalities vs. concrete details/personal insights
7. **Imperfections**: Humans have natural quirks, typos, conversational elements

SCORING GUIDE:
- 0-20: Almost certainly human-written
- 21-40: Likely human-written
- 41-60: Uncertain/mixed signals
- 61-80: Likely AI-written  
- 81-100: Almost certainly AI-written`;

      // Add custom instructions if provided
      if (customInstructions && customInstructions.trim()) {
        prompt += `\n\nADDITIONAL INSTRUCTIONS:\n${customInstructions.trim()}`;
      }

      prompt += `\n\nTEXT TO ANALYZE:
"${text.substring(0, 2000)}"

Respond with ONLY a JSON object in this exact format:
{
  "likelihood": 75,
  "confidence": 85,
  "reasoning": "Your detailed reasoning that MATCHES the likelihood score",
  "key_indicators": ["Indicator 1", "Indicator 2", "Indicator 3"]
}`;

      const requestBody = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1000,
          topP: 0.1,
          topK: 16
        }
      };

      const response = await fetch(
        `${this.baseUrl}/models/${modelName}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || `Google API Error: ${response.status}`);
      }

      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!responseText) {
        throw new Error('No response text from Google API');
      }

      console.log('🤖 Google API RAW RESPONSE:');
      console.log('==================');
      console.log(responseText);
      console.log('==================');

      // Parse the JSON response
      const result = this.parseGoogleResponse(responseText);
      return result;

    } catch (error) {
      console.error('Google API analysis failed:', error);
      throw error;
    }
  }

  /**
   * Parse Google API response and validate format
   */
  parseGoogleResponse(responseText) {
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = responseText.trim();
      const jsonMatch = cleanedResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[1];
      }

      const parsed = JSON.parse(cleanedResponse);
      
      // Validate required fields
      const likelihood = Number(parsed.likelihood);
      const confidence = Number(parsed.confidence);
      
      if (isNaN(likelihood) || isNaN(confidence)) {
        throw new Error('Invalid likelihood or confidence values');
      }

      if (likelihood < 0 || likelihood > 100 || confidence < 0 || confidence > 100) {
        throw new Error('Likelihood and confidence must be between 0-100');
      }

      // Validate reasoning-score consistency
      const reasoning = parsed.reasoning || '';
      const isHighLikelihood = likelihood >= 60;
      const reasoningIndicatesAI = reasoning.toLowerCase().includes('ai') && 
                                   !reasoning.toLowerCase().includes('human');
      
      if (isHighLikelihood !== reasoningIndicatesAI) {
        console.warn('⚠️ Potential reasoning-score inconsistency detected');
      }

      return {
        likelihood,
        confidence,
        reasoning: reasoning,
        keyIndicators: parsed.key_indicators || [],
        source: 'google'
      };

    } catch (error) {
      console.error('Failed to parse Google response:', error);
      console.error('Raw response:', responseText);
      
      // Return fallback result
      return {
        likelihood: 50,
        confidence: 30,
        reasoning: 'Failed to parse Google API response. This may indicate an issue with the model output format.',
        keyIndicators: ['Parse Error'],
        source: 'google',
        error: true
      };
    }
  }
}

// Export for use in extension
/* global module, window */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GoogleClient;
} else if (typeof window !== 'undefined') {
  window.GoogleClient = GoogleClient;
}

// ES6 export
export default GoogleClient; 
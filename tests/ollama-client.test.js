import OllamaClient from '../src/shared/ollama-client.js';

describe('OllamaClient', () => {
  let client;

  beforeEach(() => {
    client = new OllamaClient();
    // Reset fetch mock
    fetch.mockClear();
  });

  describe('constructor', () => {
    it('should initialize with default model', () => {
      expect(client.model).toBe('gemma3n:e4b');
      expect(client.baseUrl).toBe('http://localhost:11434');
    });

    it('should allow custom model', () => {
      const customClient = new OllamaClient('custom-model');
      expect(customClient.model).toBe('custom-model');
    });
  });

  describe('testConnection', () => {
    it('should return success when Ollama is available', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ version: '0.9.6' }),
      });

      const result = await client.testConnection();
      expect(result.success).toBe(true);
      expect(result.version).toBe('0.9.6');
    });

    it('should return error when Ollama is unavailable', async () => {
      fetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await client.testConnection();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection refused');
    });
  });

  describe('analyzeText', () => {
    it('should throw error for empty text', async () => {
      await expect(client.analyzeText('')).rejects.toThrow('Text cannot be empty');
      await expect(client.analyzeText('   ')).rejects.toThrow('Text cannot be empty');
    });

    it('should parse structured JSON response', async () => {
      const mockResponse = {
        response: '{"likelihood": 75, "confidence": 80, "reasoning": "Test reasoning"}'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.analyzeText('Test text');
      expect(result.likelihood).toBe(75);
      expect(result.confidence).toBe(80);
      expect(result.reasoning).toBe('Test reasoning');
    });

    it('should handle malformed JSON with fallback', async () => {
      const mockResponse = {
        response: 'This text likely contains ai generated content'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.analyzeText('Test text');
      expect(result.likelihood).toBeGreaterThan(50); // Should increase due to 'ai' keyword
      expect(result.reasoning).toContain('Fallback analysis');
    });
  });

  describe('parseAnalysisResponse', () => {
    it('should extract valid JSON from response', () => {
      const response = 'Here is the analysis: {"likelihood": 60, "confidence": 70, "reasoning": "test"}';
      const result = client.parseAnalysisResponse(response);
      
      expect(result.likelihood).toBe(60);
      expect(result.confidence).toBe(70);
      expect(result.reasoning).toBe('test');
    });

    it('should clamp values to valid ranges', () => {
      const response = '{"likelihood": 150, "confidence": -10, "reasoning": "test"}';
      const result = client.parseAnalysisResponse(response);
      
      expect(result.likelihood).toBe(100); // Clamped to max
      expect(result.confidence).toBe(0);   // Clamped to min
    });
  });
}); 
import { TextFormatter } from '../src/shared/text-formatter.js';

describe('TextFormatter', () => {
  describe('formatSentences', () => {
    test('should capitalize the first letter of a sentence', () => {
      expect(TextFormatter.formatSentences('hello world.')).toBe('Hello world.');
    });

    test('should trim whitespace from the beginning and end of a sentence', () => {
      expect(TextFormatter.formatSentences('  hello world.  ')).toBe('Hello world.');
    });

    test('should fix spacing around punctuation', () => {
      expect(TextFormatter.formatSentences('Hello ,world !')).toBe('Hello, world!');
    });

    test('should add a period between sentences if missing', () => {
      expect(TextFormatter.formatSentences('Hello world This is a test')).toBe('Hello world. This is a test');
    });

    test('should handle multiple spaces between words', () => {
      expect(TextFormatter.formatSentences('Hello   world')).toBe('Hello world');
    });
  });

  describe('formatReasoning', () => {
    test('should return a fallback message for null or undefined input', () => {
      expect(TextFormatter.formatReasoning(null)).toBe('<p class="reasoning-fallback">Analysis completed</p>');
      expect(TextFormatter.formatReasoning(undefined)).toBe('<p class="reasoning-fallback">Analysis completed</p>');
    });

    test('should format a single sentence of reasoning', () => {
      const reasoning = 'This is a simple reasoning.';
      const expected = '<div class="reasoning-section"><p class="reasoning-content">This is a simple reasoning.</p></div>';
      expect(TextFormatter.formatReasoning(reasoning)).toBe(expected);
    });

    test('should format reasoning with multiple sections', () => {
      const reasoning = 'Statistical indicators: Low perplexity. LLM Analysis: The text is very fluent.';
      const expected = '<div class="reasoning-section"><h4 class="reasoning-header">📊 Statistical Indicators</h4><p class="reasoning-content">Low perplexity.</p></div><div class="reasoning-section"><h4 class="reasoning-header">🤖 AI Analysis</h4><p class="reasoning-content">The text is very fluent.</p></div>';
      expect(TextFormatter.formatReasoning(reasoning)).toBe(expected);
    });
  });
});

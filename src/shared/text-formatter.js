/**
 * Text Formatting Utilities for AI Content Detector
 * Handles formatting of analysis reasoning and other text content
 */

export class TextFormatter {
  /**
   * Format LLM reasoning text for better readability
   */
  static formatReasoning(reasoningText) {
    if (!reasoningText || typeof reasoningText !== 'string') {
      return '<p class="reasoning-fallback">Analysis completed</p>';
    }

    // Clean up the text
    const formatted = reasoningText.trim();

    // Split into sections if there are clear separators
    const sections = this.splitIntoSections(formatted);
    
    if (sections.length > 1) {
      return this.formatMultipleSections(sections);
    } else {
      return this.formatSingleSection(formatted);
    }
  }

  /**
   * Split reasoning into logical sections
   */
  static splitIntoSections(text) {
    // Split before each section header, keeping the header
    const separator = /(?=Statistical indicators:|LLM Analysis:|High confidence:|Moderate confidence:|Low confidence:)/gi;
    return text.split(separator).map(s => s.trim()).filter(s => s.length > 0);
  }

  /**
   * Format multiple sections with headers
   */
  static formatMultipleSections(sections) {
    return sections.map((section) => {
      const trimmed = section.trim();
      
      if (trimmed.toLowerCase().startsWith('llm analysis:')) {
        const content = trimmed.replace(/^llm analysis:\s*/i, '');
        return `<div class="reasoning-section"><h4 class="reasoning-header">🤖 AI Analysis</h4><p class="reasoning-content">${this.formatSentences(content)}</p></div>`;
      } else if (trimmed.toLowerCase().startsWith('statistical indicators:')) {
        const content = trimmed.replace(/^statistical indicators:\s*/i, '');
        return `<div class="reasoning-section"><h4 class="reasoning-header">📊 Statistical Indicators</h4><p class="reasoning-content">${this.formatIndicators(content)}</p></div>`;
      } else if (trimmed.toLowerCase().startsWith('confidence:')) {
        const content = trimmed.replace(/^confidence:\s*/i, '');
        return `<div class="reasoning-section"><h4 class="reasoning-header">🎯 Confidence</h4><p class="reasoning-content">${this.formatSentences(content)}</p></div>`;
      } else {
        return `<div class="reasoning-section"><p class="reasoning-content">${this.formatSentences(trimmed)}</p></div>`;
      }
    }).join('');
  }

  /**
   * Format a single section with basic improvements
   */
  static formatSingleSection(text) {
    const formatted = this.formatSentences(text);
    return `<div class="reasoning-section"><p class="reasoning-content">${formatted}</p></div>`;
  }

  /**
   * Format sentences with better punctuation and structure
   */
  static formatSentences(text) {
    // Trim whitespace first to ensure correct capitalization
    let formatted = text.trim();

    // Capitalize first letter
    formatted = formatted.replace(/^[a-z]/, letter => letter.toUpperCase());

    // Add periods if missing at sentence ends
    formatted = formatted.replace(/([a-z])\s+([A-Z])/g, '$1. $2');

    // Fix spacing around punctuation
    formatted = formatted.replace(/\s+([.,!?])/g, '$1');
    formatted = formatted.replace(/([.,!?])(\w)/g, '$1 $2');

    // Clean up multiple spaces
    formatted = formatted.replace(/\s+/g, ' ');

    return formatted;
  }

  /**
   * Format statistical indicators as a more readable list
   */
  static formatIndicators(text) {
    // Split on common separators
    const indicators = text.split(/,|\band\b|;/).map(s => s.trim()).filter(s => s.length > 0);
    
    if (indicators.length > 1) {
      return indicators.map(indicator => 
        `<span class="indicator-item">${indicator}</span>`
      ).join(', ');
    } else {
      return this.formatSentences(text);
    }
  }

  /**
   * Format reasoning for compact display (overlay)
   */
  static formatReasoningCompact(reasoningText) {
    if (!reasoningText || typeof reasoningText !== 'string') {
      return 'Analysis completed';
    }

    // For compact display, just clean up the text and limit length
    const cleaned = this.formatSentences(reasoningText);
    
    if (cleaned.length > 150) {
      const truncated = cleaned.substring(0, 150);
      const lastSpace = truncated.lastIndexOf(' ');
      return lastSpace > 100 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
    }
    
    return cleaned;
  }
}

export default TextFormatter; 
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
    // Split on common section separators
    const separators = [
      /\.\s+Statistical indicators:/gi,
      /\.\s+LLM Analysis:/gi,
      /\.\s+High confidence:/gi,
      /\.\s+Moderate confidence:/gi,
      /\.\s+Low confidence:/gi,
      /\.\s+(?=Statistical indicators|LLM Analysis|High confidence|Moderate confidence|Low confidence)/gi
    ];

    let sections = [text];
    
    for (const separator of separators) {
      const newSections = [];
      for (const section of sections) {
        const parts = section.split(separator);
        if (parts.length > 1) {
          newSections.push(parts[0]);
          for (let i = 1; i < parts.length; i++) {
            newSections.push(parts[i]);
          }
        } else {
          newSections.push(section);
        }
      }
      sections = newSections;
    }

    return sections.filter(s => s.trim().length > 0);
  }

  /**
   * Format multiple sections with headers
   */
  static formatMultipleSections(sections) {
    return sections.map((section) => {
      const trimmed = section.trim();
      
      // Detect section type
      if (trimmed.toLowerCase().startsWith('llm analysis:')) {
        const content = trimmed.replace(/^llm analysis:\s*/i, '');
        return `<div class="reasoning-section">
          <h4 class="reasoning-header">🤖 AI Analysis</h4>
          <p class="reasoning-content">${this.formatSentences(content)}</p>
        </div>`;
      } else if (trimmed.toLowerCase().includes('statistical indicators:')) {
        const content = trimmed.replace(/^.*statistical indicators:\s*/i, '');
        return `<div class="reasoning-section">
          <h4 class="reasoning-header">📊 Statistical Indicators</h4>
          <p class="reasoning-content">${this.formatIndicators(content)}</p>
        </div>`;
      } else if (trimmed.toLowerCase().includes('confidence:')) {
        const content = trimmed.replace(/^.*confidence:\s*/i, '');
        return `<div class="reasoning-section">
          <h4 class="reasoning-header">🎯 Confidence</h4>
          <p class="reasoning-content">${this.formatSentences(content)}</p>
        </div>`;
      } else {
        // Default section
        return `<div class="reasoning-section">
          <p class="reasoning-content">${this.formatSentences(trimmed)}</p>
        </div>`;
      }
    }).join('');
  }

  /**
   * Format a single section with basic improvements
   */
  static formatSingleSection(text) {
    const formatted = this.formatSentences(text);
    return `<div class="reasoning-section">
      <p class="reasoning-content">${formatted}</p>
    </div>`;
  }

  /**
   * Format sentences with better punctuation and structure
   */
  static formatSentences(text) {
    return text
      // Add periods if missing at sentence ends
      .replace(/([a-z])\s+([A-Z])/g, '$1. $2')
      // Fix spacing around punctuation
      .replace(/\s+([.,!?])/g, '$1')
      .replace(/([.,!?])([A-Z])/g, '$1 $2')
      // Capitalize first letter
      .replace(/^[a-z]/, letter => letter.toUpperCase())
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
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
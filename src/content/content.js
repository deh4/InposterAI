/**
 * Content Script for AI Content Detector Extension
 * Extracts article content and handles analysis requests
 */

class ContentAnalyzer {
  constructor() {
    this.isAnalyzing = false;
    this.lastAnalyzedContent = null;
    this.setupMessageListener();
    this.setupPageObserver();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'extractContent': {
          const content = this.extractArticleContent();
          sendResponse({ success: true, data: content });
          break;
        }
        case 'analyzeCurrentPage': {
          const result = await this.analyzeCurrentPage();
          sendResponse({ success: true, data: result });
          break;
        }
        case 'autoAnalyze': {
          // Triggered by background script for automatic analysis
          await this.performAutoAnalysis();
          sendResponse({ success: true });
          break;
        }
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Content script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  extractArticleContent() {
    // Strategy 1: Look for common article selectors
    const articleSelectors = [
      'article',
      '[role="main"]',
      '.article-content',
      '.post-content', 
      '.entry-content',
      '.content',
      '.main-content',
      '#main-content',
      '.article-body',
      '.story-body',
      '.post-body'
    ];

    let content = '';
    let source = 'unknown';

    // Try article selectors first
    for (const selector of articleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        content = this.extractTextFromElement(element);
        if (content.length > 200) { // Minimum meaningful content
          source = selector;
          break;
        }
      }
    }

    // Strategy 2: If no article content found, try structured data
    if (content.length < 200) {
      content = this.extractFromStructuredData();
      if (content.length > 200) {
        source = 'structured-data';
      }
    }

    // Strategy 3: Fallback to heuristic-based extraction
    if (content.length < 200) {
      content = this.extractByHeuristics();
      source = 'heuristics';
    }

    // Clean and validate content
    content = this.cleanContent(content);

    return {
      text: content,
      wordCount: content.split(/\s+/).length,
      charCount: content.length,
      source: source,
      url: window.location.href,
      title: document.title,
      timestamp: Date.now()
    };
  }

  extractTextFromElement(element) {
    // Clone element to avoid modifying original
    const clone = element.cloneNode(true);

    // Remove unwanted elements
    const unwantedSelectors = [
      'script', 'style', 'nav', 'header', 'footer',
      '.advertisement', '.ad', '.ads', '.social-share',
      '.comments', '.comment', '.sidebar', '.related',
      '.newsletter', '.subscription', '.popup'
    ];

    unwantedSelectors.forEach(selector => {
      const elements = clone.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });

    // Extract text and preserve some structure
    return this.getTextWithStructure(clone);
  }

  getTextWithStructure(element) {
    let text = '';
    
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const nodeText = node.textContent.trim();
        if (nodeText) {
          text += nodeText + ' ';
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        
        // Add spacing for block elements
        if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br'].includes(tagName)) {
          text += this.getTextWithStructure(node) + '\n\n';
        } else {
          text += this.getTextWithStructure(node) + ' ';
        }
      }
    }
    
    return text;
  }

  extractFromStructuredData() {
    let content = '';
    
    // Try JSON-LD structured data
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (data.articleBody) {
          content = data.articleBody;
          break;
        }
        if (data.text) {
          content = data.text;
          break;
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    }

    // Try Open Graph description
    if (!content) {
      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) {
        content = ogDescription.getAttribute('content') || '';
      }
    }

    // Try meta description
    if (!content) {
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        content = metaDescription.getAttribute('content') || '';
      }
    }

    return content;
  }

  extractByHeuristics() {
    // Find the largest text block that's likely the main content
    const textBlocks = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          // Skip navigation, ads, etc.
          const tagName = node.tagName.toLowerCase();
          const className = node.className.toLowerCase();
          const id = node.id.toLowerCase();
          
          if (['script', 'style', 'nav', 'header', 'footer'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          if (className.includes('ad') || className.includes('nav') || 
              id.includes('ad') || id.includes('nav')) {
            return NodeFilter.FILTER_REJECT;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent.trim();
      if (text.length > 100) { // Minimum block size
        textBlocks.push({
          element: node,
          text: text,
          length: text.length,
          density: text.length / (node.innerHTML?.length || 1)
        });
      }
    }

    // Sort by text density and length
    textBlocks.sort((a, b) => (b.density * b.length) - (a.density * a.length));

    return textBlocks.length > 0 ? textBlocks[0].text : '';
  }

  cleanContent(content) {
    if (!content) return '';

    return content
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove multiple newlines
      .replace(/\n\s*\n/g, '\n\n')
      // Trim
      .trim();
  }

  async analyzeCurrentPage() {
    if (this.isAnalyzing) {
      throw new Error('Analysis already in progress');
    }

    this.isAnalyzing = true;
    
    try {
      const content = this.extractArticleContent();
      
      if (content.charCount < 50) {
        throw new Error('Not enough content to analyze (minimum 50 characters)');
      }

      // Send to background script for analysis
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeText',
        text: content.text,
        options: {
          metadata: {
            url: content.url,
            title: content.title,
            wordCount: content.wordCount,
            source: content.source
          }
        }
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      this.lastAnalyzedContent = content;
      return {
        content: content,
        analysis: response.data
      };
    } finally {
      this.isAnalyzing = false;
    }
  }

  async performAutoAnalysis() {
    // Check if page has enough content and is worth analyzing
    const content = this.extractArticleContent();
    
    if (content.charCount < 200) {
      return; // Not enough content for auto-analysis
    }

    // Don't auto-analyze the same content repeatedly
    if (this.lastAnalyzedContent && 
        this.lastAnalyzedContent.text === content.text) {
      return;
    }

    try {
      await this.analyzeCurrentPage();
    } catch (error) {
      // Silently fail for auto-analysis
      console.debug('Auto-analysis failed:', error.message);
    }
  }

  setupPageObserver() {
    // Watch for dynamic content changes
    const observer = new MutationObserver((mutations) => {
      const hasContentChanges = mutations.some(mutation => 
        mutation.type === 'childList' && 
        mutation.addedNodes.length > 0
      );

      if (hasContentChanges) {
        // Debounce content change detection
        clearTimeout(this.contentChangeTimer);
        this.contentChangeTimer = setTimeout(async () => {
          // Check if we should auto-analyze new content
          const settings = await this.getSettings();
          if (settings?.autoAnalyze) {
            await this.performAutoAnalysis();
          }
        }, 2000);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  async getSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      return response.success ? response.data : null;
    } catch (error) {
      return null;
    }
  }

  // Utility method to check if current page should be analyzed
  shouldAnalyzePage() {
    const url = window.location.href;
    
    // Skip chrome:// and extension pages
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      return false;
    }

    // Check for minimum content
    const bodyText = document.body.textContent.trim();
    return bodyText.length > 500;
  }
}

// Initialize content analyzer when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ContentAnalyzer();
  });
} else {
  new ContentAnalyzer();
}

console.log('AI Content Detector content script loaded'); 
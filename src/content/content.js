/**
 * Content Script for AI Content Detector Extension
 * Extracts article content and handles analysis requests
 */

import TextFormatter from '../shared/text-formatter.js';
import FeedbackManager from '../shared/feedback-manager.js';
import FeedbackUI from '../shared/feedback-ui.js';

// Early exit for browser internal pages
if (window.location.protocol === 'chrome:' || 
    window.location.protocol === 'opera:' || 
    window.location.protocol === 'chrome-extension:' ||
    window.location.protocol === 'moz-extension:') {
  console.log('AI Content Detector: Skipping browser internal page');
  // Don't initialize on browser internal pages
} else {
  // Initialize content analyzer
  initializeContentAnalyzer();
}

function initializeContentAnalyzer() {
  class ContentAnalyzer {
    constructor() {
      this.isAnalyzing = false;
      this.lastAnalyzedContent = null;
      this.selectionTooltip = null;
      this.selectionTimeout = null;
      this.setupMessageListener();
      this.setupPageObserver();
      this.setupSelectionHandler();
      this.injectOverlayStyles();
      this.injectSelectionTooltipStyles();
      
      // Auto-analyze if enabled (disable for now to prevent errors)
      // if (this.shouldAutoAnalyze()) {
      //   this.scheduleAutoAnalysis();
      // }
    }

    setupMessageListener() {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        this.handleMessage(request, sender, sendResponse);
        return true; // Keep channel open for async responses
      });
    }

    async handleMessage(request, sender, sendResponse) {
      try {
        switch (request.action) {
          case 'ping': {
            // Simple ping to test if content script is alive
            sendResponse({ success: true, message: 'Content script is active' });
            break;
          }
          case 'extractContent': {
            const content = this.extractArticleContent();
            sendResponse({ content });
            break;
          }
          case 'analyzeCurrentPage': {
            const result = await this.analyzeCurrentPage();
            sendResponse({ success: true, data: result });
            
            // Show in-page badge after successful analysis
            if (result && result.analysis) {
              this.showInPageBadge(result.analysis);
            }
            break;
          }
          case 'showQuickAnalysisResult': {
            this.showQuickAnalysisOverlay(request.analysis, request.selectedText);
            sendResponse({ success: true });
            break;
          }
          case 'showQuickAnalysisLoading': {
            console.log('Content script received showQuickAnalysisLoading:', request.selectedText.substring(0, 50));
            this.showQuickAnalysisLoading(request.selectedText);
            sendResponse({ success: true });
            break;
          }
          case 'showQuickAnalysisError': {
            this.showQuickAnalysisError(request.error);
            sendResponse({ success: true });
            break;
          }
          default:
            sendResponse({ error: 'Unknown action' });
        }
      } catch (error) {
        console.error('Content script error:', error);
        sendResponse({ error: error.message });
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
        timestamp: Date.now(),
        // Enhanced content context
        language: document.documentElement.lang || 'unknown',
        domain: window.location.hostname,
        readingTime: Math.ceil(content.split(/\s+/).length / 200), // Assume 200 WPM
        contentContext: {
          images: document.querySelectorAll('img').length,
          links: document.querySelectorAll('a').length,
          headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length
        }
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
            const className = (node.className && typeof node.className === 'string') ? node.className.toLowerCase() : '';
            const id = (node.id && typeof node.id === 'string') ? node.id.toLowerCase() : '';
            
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

    setupSelectionHandler() {
      // Handle text selection events with delay to avoid browser UI conflicts
      document.addEventListener('mouseup', this.handleSelection.bind(this));
      document.addEventListener('keyup', this.handleSelection.bind(this));
      document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
      
             // Add keyboard shortcut (Ctrl/Cmd + Shift + A) for analysis
       document.addEventListener('keydown', (event) => {
         if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'A') {
           event.preventDefault();
           const selection = window.getSelection();
           const selectedText = selection.toString().trim();
           if (selectedText.length >= 20) {
             // Hide any existing tooltip
             this.hideSelectionTooltip();
             this.performSelectionAnalysis(selectedText);
           }
         }
       });
      
      // Hide tooltip when clicking elsewhere (but not during analysis)
      document.addEventListener('mousedown', (event) => {
        if (this.selectionTooltip && !this.selectionTooltip.contains(event.target) && !this.isAnalyzing) {
          this.hideSelectionTooltip();
        }
      });
      
      // Hide tooltip on scroll (but not during analysis)
      window.addEventListener('scroll', () => {
        if (this.selectionTooltip && !this.isAnalyzing) {
          this.hideSelectionTooltip();
        }
      });
    }

    handleSelection(event) {
      // Clear any existing timeout
      if (this.selectionTimeout) {
        clearTimeout(this.selectionTimeout);
      }
      
      // Add longer delay to let browser UI settle first
      this.selectionTimeout = setTimeout(() => {
        this.checkAndShowTooltip();
      }, 800);
    }

    handleSelectionChange() {
      // Handle selection changes (keyboard navigation, etc.)
      if (this.selectionTimeout) {
        clearTimeout(this.selectionTimeout);
      }
      
      // Shorter delay for keyboard-based selections
      this.selectionTimeout = setTimeout(() => {
        this.checkAndShowTooltip();
      }, 300);
    }

    checkAndShowTooltip() {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      // Only show tooltip for meaningful text selections (minimum 20 characters)
      if (selectedText.length >= 20 && selectedText.length <= 5000) {
        this.showSelectionTooltip(selection, selectedText);
      } else {
        this.hideSelectionTooltip();
      }
    }

    showSelectionTooltip(selection, selectedText) {
      // Hide existing tooltip first
      this.hideSelectionTooltip();
      
      // Get selection position
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Create tooltip element
      this.selectionTooltip = document.createElement('div');
      this.selectionTooltip.className = 'ai-detector-selection-tooltip';
      this.selectionTooltip.innerHTML = `
        <div class="tooltip-content">
          <button class="analyze-btn" title="Quick AI Analysis - or press Ctrl+Shift+A">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7V10C2 16 6 20.88 11.88 22L12 22L12.12 22C18 20.88 22 16 22 10V7L12 2Z" 
                    stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
            <span>Quick Analyze</span>
          </button>
          <div class="word-count">${selectedText.split(/\s+/).length} words</div>
          <div class="keyboard-hint">⌘⇧A</div>
        </div>
      `;
      
      // Position tooltip below the end of the selection
      const scrollY = window.scrollY || window.pageYOffset;
      const scrollX = window.scrollX || window.pageXOffset;
      const viewportWidth = window.innerWidth;
      
      // Position below the selection (at the end of the last word)
      let tooltipTop = rect.bottom + scrollY + 12; // Small gap below selection
      let tooltipLeft = rect.right + scrollX; // Align with end of selection
      
      // Always show below selection with upward pointing arrow
      this.selectionTooltip.style.transform = 'translateX(-50%) translateY(0)';
      
      // Adjust horizontal position if near viewport edges
      const tooltipWidth = 200; // Approximate tooltip width
      if (tooltipLeft < tooltipWidth / 2 + 20) {
        tooltipLeft = tooltipWidth / 2 + 20;
      } else if (tooltipLeft > viewportWidth - tooltipWidth / 2 - 20) {
        tooltipLeft = viewportWidth - tooltipWidth / 2 - 20;
      }
      
      this.selectionTooltip.style.position = 'absolute';
      this.selectionTooltip.style.left = `${tooltipLeft}px`;
      this.selectionTooltip.style.top = `${tooltipTop}px`;
      this.selectionTooltip.style.zIndex = '10000';
      
      // Add event listener for analyze button
      const analyzeBtn = this.selectionTooltip.querySelector('.analyze-btn');
      analyzeBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        // Immediately hide tooltip to prevent it from lingering
        this.hideSelectionTooltip();
        this.performSelectionAnalysis(selectedText);
      });
      
      // Add to page
      document.body.appendChild(this.selectionTooltip);
      
      // Add fade-in animation
      requestAnimationFrame(() => {
        this.selectionTooltip.classList.add('show');
      });
    }

    hideSelectionTooltip() {
      if (this.selectionTooltip) {
        this.selectionTooltip.classList.add('hiding');
        setTimeout(() => {
          if (this.selectionTooltip && this.selectionTooltip.parentNode) {
            this.selectionTooltip.parentNode.removeChild(this.selectionTooltip);
          }
          this.selectionTooltip = null;
        }, 200);
      }
    }

    showAnalysisModal(selectedText) {
      // Create the analysis modal
      this.analysisModal = document.createElement('div');
      this.analysisModal.className = 'ai-detector-analysis-modal';
      this.analysisModal.innerHTML = `
        <div class="analysis-modal-content">
          <div class="modal-header">
            <h3>AI Content Analysis</h3>
            <button class="close-btn" title="Close">&times;</button>
          </div>
          
          <div class="modal-body">
            <div class="analysis-state progress-state">
              <div class="progress-container">
                <div class="progress-bar">
                  <div class="progress-fill"></div>
                </div>
                <div class="progress-text">Analyzing selected text...</div>
              </div>
              <div class="text-preview">
                <strong>Analyzing:</strong> "${selectedText.substring(0, 100)}${selectedText.length > 100 ? '...' : ''}"
              </div>
            </div>
            
            <div class="analysis-state results-state hidden">
              <!-- Results will be populated here -->
            </div>
            
            <div class="analysis-state feedback-state hidden">
              <!-- Feedback UI will be populated here -->
            </div>
          </div>
        </div>
      `;

      // Add close button functionality
      const closeBtn = this.analysisModal.querySelector('.close-btn');
      closeBtn.addEventListener('click', () => {
        this.hideAnalysisModal();
      });

      // Add to page with animation
      document.body.appendChild(this.analysisModal);
      requestAnimationFrame(() => {
        this.analysisModal.classList.add('show');
      });
    }

    showAnalysisResults(analysisData, selectedText) {
      if (!this.analysisModal) return;

      const progressState = this.analysisModal.querySelector('.progress-state');
      const resultsState = this.analysisModal.querySelector('.results-state');

      // Hide progress, show results
      progressState.classList.add('hidden');
      resultsState.classList.remove('hidden');

      // Populate results
      resultsState.innerHTML = `
        <div class="analysis-result">
          <div class="result-header">
            <div class="likelihood-score ${this.getLikelihoodClass(analysisData.likelihood)}">
              <span class="score-value">${Math.round(analysisData.likelihood)}%</span>
              <span class="score-label">AI Likelihood</span>
            </div>
            <div class="confidence-score">
              <span class="score-value">${Math.round(analysisData.confidence)}%</span>
              <span class="score-label">Confidence</span>
            </div>
          </div>
          
          <div class="result-details">
            <div class="reasoning">
              ${this.formatReasoning(analysisData.reasoning)}
            </div>
            
            <div class="statistical-breakdown">
              <h4>📊 Statistical Analysis</h4>
              <div class="stats-grid">
                ${this.renderStatisticalBreakdown(analysisData)}
              </div>
              <div class="analysis-method">
                <small>🔬 Method: ${analysisData.method || 'ensemble'}</small>
              </div>
            </div>
            
            <div class="text-info">
              <div class="text-preview">
                <strong>Analyzed text:</strong> "${selectedText.substring(0, 100)}${selectedText.length > 100 ? '...' : ''}"
              </div>
              <div class="result-meta">
                <span>${selectedText.split(/\s+/).length} words • ${new Date().toLocaleTimeString()}</span>
                ${analysisData.fromCache ? '<span class="cache-indicator">📁 Cached</span>' : ''}
              </div>
            </div>
          </div>
          
          <div class="result-actions">
            <button class="btn-secondary feedback-btn">Provide Feedback</button>
            <button class="btn-primary close-modal-btn">Close</button>
          </div>
        </div>
      `;

      // Enable outside click to close (only after results are shown)
      this.enableOutsideClickClose();

      // Add event listeners
      const feedbackBtn = resultsState.querySelector('.feedback-btn');
      feedbackBtn.addEventListener('click', () => {
        this.showFeedbackInModal(analysisData);
      });

      const closeModalBtn = resultsState.querySelector('.close-modal-btn');
      closeModalBtn.addEventListener('click', () => {
        this.hideAnalysisModal();
      });
    }

    showAnalysisError(errorMessage) {
      if (!this.analysisModal) return;

      const progressState = this.analysisModal.querySelector('.progress-state');
      progressState.innerHTML = `
        <div class="error-container">
          <span class="error-icon">⚠️</span>
          <span class="error-text">${errorMessage}</span>
          <button class="btn-secondary retry-btn">Try Again</button>
        </div>
      `;

      // Enable outside click to close on error
      this.enableOutsideClickClose();
    }

    hideAnalysisModal() {
      if (!this.analysisModal) return;
      
      this.analysisModal.classList.add('hiding');
      setTimeout(() => {
        if (this.analysisModal && this.analysisModal.parentNode) {
          this.analysisModal.parentNode.removeChild(this.analysisModal);
        }
        this.analysisModal = null;
      }, 300);
    }

    enableOutsideClickClose() {
      if (!this.analysisModal) return;
      
      // Close on click outside (only after results/error are shown)
      this.analysisModal.addEventListener('click', (event) => {
        if (event.target === this.analysisModal) {
          this.hideAnalysisModal();
        }
      });
      
      // Close on Escape key
      const escapeHandler = (event) => {
        if (event.key === 'Escape') {
          this.hideAnalysisModal();
          document.removeEventListener('keydown', escapeHandler);
        }
      };
      document.addEventListener('keydown', escapeHandler);
    }

    showFeedbackInModal(analysisData) {
      if (!this.analysisModal) return;

      const resultsState = this.analysisModal.querySelector('.results-state');
      const feedbackState = this.analysisModal.querySelector('.feedback-state');

      // Hide results, show feedback
      resultsState.classList.add('hidden');
      feedbackState.classList.remove('hidden');

      // Populate feedback UI
      feedbackState.innerHTML = `
        <div class="feedback-section">
          <div class="analysis-summary">
            <div class="summary-item">
              <span class="summary-label">Our Analysis:</span>
              <span class="summary-value">${Math.round(analysisData.likelihood)}% AI-generated</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Confidence:</span>
              <span class="summary-value">${Math.round(analysisData.confidence)}%</span>
            </div>
          </div>
          
          <div class="feedback-header">
            <span class="feedback-title">💬 Help improve accuracy</span>
            <span class="feedback-subtitle">Your feedback helps train the local model</span>
          </div>
          
          <div class="feedback-rating">
            <button class="feedback-btn feedback-thumbs-up" data-rating="thumbs_up" title="Accurate analysis">
              <span class="feedback-icon">👍</span>
              <span class="feedback-label">Accurate</span>
            </button>
            <button class="feedback-btn feedback-thumbs-down" data-rating="thumbs_down" title="Incorrect analysis">
              <span class="feedback-icon">👎</span>
              <span class="feedback-label">Incorrect</span>
            </button>
          </div>

          <div class="feedback-details hidden">
            <!-- Detailed feedback form will be inserted here -->
          </div>

          <div class="feedback-status hidden">
            <span class="status-text">✓ Feedback received. Thank you!</span>
          </div>
          
          <div class="feedback-actions">
            <button class="btn-secondary back-btn">← Back to Results</button>
          </div>
        </div>
      `;

      // Bind feedback events
      this.bindFeedbackEvents(feedbackState, analysisData);

      // Add back button functionality
      const backBtn = feedbackState.querySelector('.back-btn');
      backBtn.addEventListener('click', () => {
        feedbackState.classList.add('hidden');
        resultsState.classList.remove('hidden');
      });
    }

    async performSelectionAnalysis(selectedText) {
      try {
        // Set analyzing state to prevent tooltip from disappearing
        this.isAnalyzing = true;
        
        // Show analysis modal (tooltip should already be hidden by caller)
        this.showAnalysisModal(selectedText);
        
        // Use the same analysis system as the toolbar
        const response = await chrome.runtime.sendMessage({
          action: 'analyzeText',
          text: selectedText,
          metadata: {
            url: window.location.href,
            title: document.title,
            wordCount: selectedText.split(/\s+/).length,
            source: 'text-selection',
            language: document.documentElement.lang || 'unknown',
            domain: window.location.hostname,
            readingTime: Math.ceil(selectedText.split(/\s+/).length / 200),
            contentContext: {
              selectionLength: selectedText.length,
              isPartialContent: true
            }
          }
        });
        
        if (!response.success) {
          throw new Error(response.error || 'Analysis failed');
        }
        
        // Reset analyzing state and show results in modal
        this.isAnalyzing = false;
        this.showAnalysisResults(response.data, selectedText);
        
      } catch (error) {
        console.error('Selection analysis failed:', error);
        this.isAnalyzing = false;
        this.showAnalysisError(error.message);
      }
    }



    formatReasoning(reasoning) {
      if (!reasoning) return '<p class="no-reasoning">No reasoning provided.</p>';
      
      // Enhanced formatting for better readability
      let formatted = reasoning
        // Handle bold text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Convert line breaks
        .replace(/\n/g, '</p><p>')
        // Handle quoted text
        .replace(/'([^']+)'/g, '<span class="quoted-text">"$1"</span>')
        // Handle parenthetical text
        .replace(/\(([^)]+)\)/g, '<span class="parenthetical">($1)</span>')
        // Handle technical terms or formal phrases
        .replace(/\b(AI-generated|statistical|ensemble|perplexity|burstiness)\b/gi, '<span class="technical-term">$1</span>')
        // Highlight confidence indicators
        .replace(/\b(high confidence|low confidence|medium confidence|very likely|unlikely)\b/gi, '<span class="confidence-indicator">$1</span>');
      
      // Wrap in paragraphs if not already wrapped
      if (!formatted.startsWith('<p>')) {
        formatted = '<p>' + formatted + '</p>';
      }
      
      // Clean up empty paragraphs
      formatted = formatted.replace(/<p><\/p>/g, '');
      
      return formatted;
    }

    renderStatisticalBreakdown(analysisData) {
      const breakdown = analysisData.statisticalBreakdown || {};
      return `
        <div class="stat-item">
          <span class="stat-label">Perplexity</span>
          <span class="stat-value">${breakdown.perplexityScore || '--'}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Burstiness</span>
          <span class="stat-value">${breakdown.burstinessScore || '--'}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Vocabulary</span>
          <span class="stat-value">${breakdown.vocabularyDiversity || '--'}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">AI Indicators</span>
          <span class="stat-value">${breakdown.aiIndicatorScore || '--'}</span>
        </div>
      `;
    }



    getLikelihoodClass(likelihood) {
      if (likelihood >= 80) return 'high-ai';
      if (likelihood >= 50) return 'medium-ai';
      if (likelihood >= 20) return 'low-ai';
      return 'human';
    }



    bindFeedbackEvents(widget, analysisData) {
      const ratingButtons = widget.querySelectorAll('[data-rating]');
      ratingButtons.forEach(button => {
        const rating = button.dataset.rating;
        button.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleRatingClick(rating, widget, analysisData);
        });
      });
    }

    async handleRatingClick(rating, widget, analysisData) {
      // Disable rating buttons
      const ratingButtons = widget.querySelectorAll('[data-rating]');
      ratingButtons.forEach(btn => btn.disabled = true);

      if (rating === 'thumbs_up') {
        // Simple positive feedback
        await this.submitFeedback({ rating }, analysisData);
        this.showFeedbackStatus(widget, 'positive');
      } else {
        // Show detailed feedback form for negative ratings
        this.showDetailedFeedback(widget, analysisData);
      }
    }

    showDetailedFeedback(widget, analysisData) {
      const detailsContainer = widget.querySelector('.feedback-details');
      
      const detailsHTML = this.getFullDetailsHTML();
      detailsContainer.innerHTML = detailsHTML;
      detailsContainer.classList.remove('hidden');

      // Bind events for detailed form
      this.bindDetailedFormEvents(detailsContainer, widget, analysisData);
    }

    getFullDetailsHTML() {
      return `
        <div class="feedback-correction">
          <div class="correction-header">
            <span class="correction-title">What percentage do you think is AI-generated?</span>
          </div>
          <div class="correction-slider-container">
            <input type="range" class="correction-slider" min="0" max="100" value="50" id="aiPercentageSlider">
            <div class="correction-labels">
              <span class="correction-value">
                AI: <span id="aiPercentageValue">50</span>% | 
                Human: <span id="humanPercentageValue">50</span>%
              </span>
            </div>
          </div>
        </div>

        <div class="feedback-reasons">
          <div class="reasons-header">
            <span class="reasons-title">Why was our analysis incorrect?</span>
          </div>
          <div class="reasons-categories">
            <div class="reason-category">
              <span class="category-title">If we said AI but it's human:</span>
              ${this.generateReasonCheckboxes('falsePositive')}
            </div>
            <div class="reason-category">
              <span class="category-title">If we said human but it's AI:</span>
              ${this.generateReasonCheckboxes('falseNegative')}
            </div>
            <div class="reason-category">
              <span class="category-title">Analysis issues:</span>
              ${this.generateReasonCheckboxes('analysisIssues')}
            </div>
          </div>
        </div>

        <div class="feedback-confidence">
          <span class="confidence-title">How confident are you in your assessment?</span>
          <div class="confidence-buttons">
            <button class="confidence-btn" data-confidence="low">Low</button>
            <button class="confidence-btn" data-confidence="medium">Medium</button>
            <button class="confidence-btn" data-confidence="high">High</button>
          </div>
        </div>

        <div class="feedback-actions">
          <button class="feedback-submit-btn">Submit Feedback</button>
          <button class="feedback-skip-btn">Skip</button>
        </div>
      `;
    }

    generateReasonCheckboxes(category) {
      const feedbackReasons = {
        falsePositive: [
          'Obviously human writing style',
          'Contains personal experiences/emotions',
          'Has natural imperfections/typos',
          'Domain expertise too specific for AI',
          'Writing too creative/unique'
        ],
        falseNegative: [
          'Too perfect/formulaic writing',
          'Generic phrasing and transitions',
          'Lacks personal voice',
          'Repetitive vocabulary',
          'Overly structured'
        ],
        analysisIssues: [
          'Wrong content analyzed',
          'Text too short/long',
          'Mixed human/AI content',
          'Technical/formatting issues',
          'Language not well supported'
        ]
      };

      return feedbackReasons[category]
        .map((reason, index) => `
          <label class="reason-checkbox">
            <input type="checkbox" value="${reason}" data-category="${category}">
            <span class="checkbox-text">${reason}</span>
          </label>
        `).join('');
    }

    bindDetailedFormEvents(container, widget, analysisData) {
      // Slider events
      const slider = container.querySelector('.correction-slider');
      if (slider) {
        slider.addEventListener('input', (e) => {
          this.updateSliderLabels(e.target.value);
        });
      }

      // Confidence buttons
      const confidenceButtons = container.querySelectorAll('.confidence-btn');
      confidenceButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          confidenceButtons.forEach(b => b.classList.remove('selected'));
          e.target.classList.add('selected');
        });
      });

      // Submit button
      const submitBtn = container.querySelector('.feedback-submit-btn');
      if (submitBtn) {
        submitBtn.addEventListener('click', () => {
          this.submitDetailedFeedback(container, widget, analysisData);
        });
      }

      // Skip button
      const skipBtn = container.querySelector('.feedback-skip-btn');
      if (skipBtn) {
        skipBtn.addEventListener('click', () => {
          this.skipFeedback(widget);
        });
      }
    }

    updateSliderLabels(value) {
      const aiValue = parseInt(value);
      const humanValue = 100 - aiValue;

      const aiSpan = document.getElementById('aiPercentageValue');
      const humanSpan = document.getElementById('humanPercentageValue');
      if (aiSpan) aiSpan.textContent = aiValue;
      if (humanSpan) humanSpan.textContent = humanValue;
    }

    async submitDetailedFeedback(container, widget, analysisData) {
      const slider = container.querySelector('.correction-slider');
      const aiPercentage = slider ? parseInt(slider.value) : 50;

      const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
      const selectedReasons = Array.from(checkboxes).map(cb => cb.value);

      const selectedConfidenceBtn = container.querySelector('.confidence-btn.selected');
      const confidence = selectedConfidenceBtn ? selectedConfidenceBtn.dataset.confidence : 'medium';

      const feedbackData = {
        rating: 'thumbs_down',
        correction: {
          aiPercentage: aiPercentage,
          humanPercentage: 100 - aiPercentage,
          confidence: confidence === 'low' ? 25 : confidence === 'high' ? 75 : 50
        },
        reasons: selectedReasons
      };

      await this.submitFeedback(feedbackData, analysisData);
      this.showFeedbackStatus(widget, 'negative');
    }

    skipFeedback(widget) {
      this.showFeedbackStatus(widget, 'skipped');
    }

    async submitFeedback(feedbackData, analysisData) {
      try {
        if (!this.feedbackManager) {
          const { FeedbackManager } = await import('../shared/feedback-manager.js');
          this.feedbackManager = new FeedbackManager();
        }
        
        // Create feedback record
        await this.feedbackManager.createFeedbackRecord({
          analysis: analysisData,
          feedback: feedbackData,
          contentType: 'text-selection'
        });
        
        console.log('Feedback submitted successfully');
      } catch (error) {
        console.error('Failed to submit feedback:', error);
      }
    }

    showFeedbackStatus(widget, type) {
      const rating = widget.querySelector('.feedback-rating');
      const details = widget.querySelector('.feedback-details');
      const status = widget.querySelector('.feedback-status');

      if (rating) rating.style.display = 'none';
      if (details) details.classList.add('hidden');
      if (status) {
        status.classList.remove('hidden');
        
        if (type === 'positive') {
          status.innerHTML = '<span class="status-text">✓ Feedback received. Thank you!</span>';
        } else if (type === 'negative') {
          status.innerHTML = '<span class="status-text">✓ Detailed feedback received. This helps improve accuracy!</span>';
        } else {
          status.innerHTML = '<span class="status-text">○ Feedback skipped</span>';
        }
      }

      // Auto-hide after delay
      setTimeout(() => {
        if (widget.parentNode) {
          widget.style.opacity = '0.5';
        }
      }, 3000);
    }

    showDetailedResults(analysisData) {
      // This will show the detailed analysis overlay
      this.showAnalysisOverlay(analysisData);
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

    showQuickAnalysisOverlay(analysis, selectedText) {
      // Remove any existing overlay
      this.removeQuickAnalysisOverlay();

      // Create overlay container
      const overlay = document.createElement('div');
      overlay.id = 'ai-detector-quick-overlay';
      overlay.className = 'ai-detector-overlay';
      
      // Get selection position for positioning
      const selection = window.getSelection();
      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      let rect = { top: 0, left: 0, width: 0, height: 0 };
      
      if (range) {
        const rangeRect = range.getBoundingClientRect();
        rect = {
          top: rangeRect.bottom + window.scrollY,
          left: rangeRect.left + window.scrollX,
          width: rangeRect.width,
          height: rangeRect.height
        };
      }

      // Position overlay
      overlay.style.position = 'absolute';
      overlay.style.top = `${rect.top + 10}px`;
      overlay.style.left = `${Math.max(10, rect.left)}px`;
      overlay.style.zIndex = '10000';
      overlay.style.maxWidth = '300px';

      // Create overlay content
      const content = `
        <div class="ai-detector-overlay-content">
          <div class="ai-detector-header">
            <span class="ai-detector-title">🤖 AI Detection</span>
            <button class="ai-detector-close" onclick="this.closest('.ai-detector-overlay').remove()">×</button>
          </div>
          <div class="ai-detector-result">
            <div class="ai-detector-scores">
              <div class="ai-detector-score ai-likelihood-${this.getLikelihoodClass(analysis.likelihood)}">
                <span class="score-value">${Math.round(analysis.likelihood)}%</span>
                <span class="score-label">AI Likelihood</span>
              </div>
              <div class="ai-detector-score">
                <span class="score-value">${Math.round(analysis.confidence)}%</span>
                <span class="score-label">Confidence</span>
              </div>
            </div>
            <div class="ai-detector-reasoning">
              ${TextFormatter.formatReasoning(analysis.reasoning)}
            </div>
            <div class="ai-detector-text-preview">
              "${selectedText.substring(0, 100)}${selectedText.length > 100 ? '...' : ''}"
            </div>
          </div>
        </div>
      `;

      overlay.innerHTML = content;
      document.body.appendChild(overlay);

      // Auto-remove after 10 seconds
      setTimeout(() => {
        this.removeQuickAnalysisOverlay();
      }, 10000);
    }

    showQuickAnalysisLoading(selectedText) {
      console.log('showQuickAnalysisLoading called with text:', selectedText.substring(0, 50));
      
      // Remove any existing overlay
      this.removeQuickAnalysisOverlay();
      console.log('Existing overlay removed');

      // Get selection position for positioning
      const selection = window.getSelection();
      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      let rect = { top: 0, left: 0, width: 0, height: 0 };
      
      if (range) {
        const rangeRect = range.getBoundingClientRect();
        rect = {
          top: rangeRect.bottom + window.scrollY,
          left: rangeRect.left + window.scrollX,
          width: rangeRect.width,
          height: rangeRect.height
        };
        console.log('Selection position:', rect);
      } else {
        console.log('No selection range found, using center positioning');
      }

      // Create loading overlay
      const overlay = document.createElement('div');
      overlay.id = 'ai-detector-quick-overlay';
      overlay.className = 'ai-detector-overlay ai-detector-loading';
      
      // Position near the selection or center if no selection
      if (range && rect.top > 0) {
        overlay.style.position = 'absolute';
        overlay.style.top = `${rect.top + 10}px`;
        overlay.style.left = `${Math.max(10, rect.left)}px`;
      } else {
        overlay.style.position = 'fixed';
        overlay.style.top = '50%';
        overlay.style.left = '50%';
        overlay.style.transform = 'translate(-50%, -50%)';
      }
      
      overlay.style.zIndex = '10000';
      overlay.style.maxWidth = '280px';

      const content = `
        <div class="ai-detector-overlay-content">
          <div class="ai-detector-header">
            <span class="ai-detector-title">🤖 Analyzing Text...</span>
            <button class="ai-detector-close" onclick="this.closest('.ai-detector-overlay').remove()">×</button>
          </div>
          <div class="ai-detector-loading-body">
            <div class="ai-detector-progress-bar">
              <div class="ai-detector-progress-fill"></div>
            </div>
            <div class="ai-detector-loading-text">
              Running AI detection analysis...
            </div>
            <div class="ai-detector-text-preview">
              "${selectedText.substring(0, 80)}${selectedText.length > 80 ? '...' : ''}"
            </div>
          </div>
        </div>
      `;

      overlay.innerHTML = content;
      document.body.appendChild(overlay);
      console.log('Loading overlay added to document body');
    }

    showQuickAnalysisError(error) {
      // Remove any existing overlay
      this.removeQuickAnalysisOverlay();

      // Create error overlay
      const overlay = document.createElement('div');
      overlay.id = 'ai-detector-quick-overlay';
      overlay.className = 'ai-detector-overlay ai-detector-error';
      
      overlay.style.position = 'fixed';
      overlay.style.top = '20px';
      overlay.style.right = '20px';
      overlay.style.zIndex = '10000';
      overlay.style.maxWidth = '300px';

      const content = `
        <div class="ai-detector-overlay-content">
          <div class="ai-detector-header">
            <span class="ai-detector-title">⚠️ Analysis Failed</span>
            <button class="ai-detector-close" onclick="this.closest('.ai-detector-overlay').remove()">×</button>
          </div>
          <div class="ai-detector-error-message">
            ${error}
          </div>
        </div>
      `;

      overlay.innerHTML = content;
      document.body.appendChild(overlay);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        this.removeQuickAnalysisOverlay();
      }, 5000);
    }

    removeQuickAnalysisOverlay() {
      const existing = document.getElementById('ai-detector-quick-overlay');
      if (existing) {
        existing.remove();
      }
    }

    getLikelihoodClass(likelihood) {
      if (likelihood > 70) return 'high';
      if (likelihood > 40) return 'medium';
      return 'low';
    }

    injectOverlayStyles() {
      // Only inject once
      if (document.getElementById('ai-detector-overlay-styles')) {
        return;
      }

      const style = document.createElement('style');
      style.id = 'ai-detector-overlay-styles';
      style.textContent = `
        /* AI Detector Quick Analysis Overlay Styles */
        .ai-detector-overlay {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          font-size: 13px !important;
          line-height: 1.4 !important;
          background: white !important;
          border: 1px solid #e1e5e9 !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15) !important;
          max-width: 300px !important;
          z-index: 10000 !important;
          animation: ai-detector-fadeIn 0.2s ease-out !important;
        }
        
        .ai-detector-overlay-content {
          padding: 0 !important;
        }
        
        .ai-detector-header {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          padding: 12px 16px !important;
          background: #f8f9fa !important;
          border-bottom: 1px solid #e1e5e9 !important;
          border-radius: 8px 8px 0 0 !important;
        }
        
        .ai-detector-title {
          font-weight: 600 !important;
          color: #1a1a1a !important;
          font-size: 14px !important;
          margin: 0 !important;
        }
        
        .ai-detector-close {
          background: none !important;
          border: none !important;
          font-size: 16px !important;
          color: #6b7280 !important;
          cursor: pointer !important;
          padding: 0 !important;
          width: 20px !important;
          height: 20px !important;
          border-radius: 4px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        
        .ai-detector-close:hover {
          background: #e5e7eb !important;
          color: #374151 !important;
        }
        
        .ai-detector-result {
          padding: 16px !important;
        }
        
        .ai-detector-scores {
          display: flex !important;
          gap: 12px !important;
          margin-bottom: 12px !important;
        }
        
        .ai-detector-score {
          flex: 1 !important;
          text-align: center !important;
          padding: 8px !important;
          background: #f8f9fa !important;
          border-radius: 6px !important;
        }
        
        .ai-detector-score .score-value {
          display: block !important;
          font-size: 18px !important;
          font-weight: 700 !important;
          margin-bottom: 2px !important;
        }
        
        .ai-detector-score .score-label {
          display: block !important;
          font-size: 11px !important;
          color: #6b7280 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
        }
        
        .ai-likelihood-high .score-value {
          color: #dc2626 !important;
        }
        
        .ai-likelihood-medium .score-value {
          color: #d97706 !important;
        }
        
        .ai-likelihood-low .score-value {
          color: #059669 !important;
        }
        
        .ai-detector-reasoning {
          font-size: 12px !important;
          color: #374151 !important;
          margin-bottom: 12px !important;
          line-height: 1.5 !important;
        }

        .reasoning-section {
          margin-bottom: 8px !important;
        }

        .reasoning-section:last-child {
          margin-bottom: 0 !important;
        }

        .reasoning-header {
          font-size: 11px !important;
          font-weight: 600 !important;
          color: #1f2937 !important;
          margin: 0 0 4px 0 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
        }

        .reasoning-content {
          margin: 0 !important;
          font-size: 12px !important;
          line-height: 1.4 !important;
          color: #374151 !important;
        }

        .indicator-item {
          display: inline-block !important;
          background: #f3f4f6 !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
          font-size: 11px !important;
          margin: 0 2px !important;
          border: 1px solid #e5e7eb !important;
        }

        .reasoning-fallback {
          font-style: italic !important;
          color: #9ca3af !important;
          margin: 0 !important;
        }
        
        .ai-detector-text-preview {
          font-size: 11px !important;
          color: #6b7280 !important;
          font-style: italic !important;
          background: #f8f9fa !important;
          padding: 8px !important;
          border-radius: 4px !important;
          border-left: 3px solid #e1e5e9 !important;
        }
        
        .ai-detector-error {
          background: #fef2f2 !important;
          border-color: #fecaca !important;
        }
        
        .ai-detector-error .ai-detector-header {
          background: #fee2e2 !important;
          border-bottom-color: #fecaca !important;
        }
        
        .ai-detector-error-message {
          padding: 16px !important;
          color: #dc2626 !important;
          font-size: 12px !important;
        }
        
        .ai-detector-loading {
          background: #f9fafb !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1) !important;
        }

        .ai-detector-loading .ai-detector-header {
          background: #f3f4f6 !important;
          border-bottom: 1px solid #e5e7eb !important;
        }

        .ai-detector-loading .ai-detector-title {
          color: #374151 !important;
        }

        .ai-detector-loading-body {
          padding: 16px !important;
        }

        .ai-detector-progress-bar {
          width: 100% !important;
          height: 4px !important;
          background: #e5e7eb !important;
          border-radius: 2px !important;
          margin-bottom: 12px !important;
          overflow: hidden !important;
        }

        .ai-detector-progress-fill {
          height: 100% !important;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6, #3b82f6) !important;
          background-size: 200% 100% !important;
          border-radius: 2px !important;
          width: 0% !important;
          animation: ai-detector-progress 2s ease-in-out infinite, ai-detector-gradient 1.5s ease-in-out infinite !important;
        }

        .ai-detector-loading-text {
          font-size: 12px !important;
          color: #6b7280 !important;
          text-align: center !important;
          margin-bottom: 12px !important;
        }

        @keyframes ai-detector-progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }

        @keyframes ai-detector-gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes ai-detector-fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* In-Page Badge Styles */
        .ai-detector-page-badge {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          background: white !important;
          border: 2px solid #e5e7eb !important;
          border-radius: 12px !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15) !important;
          min-width: 120px !important;
          max-width: 300px !important;
          transition: all 0.3s ease !important;
          overflow: hidden !important;
        }

        .ai-detector-page-badge.badge-high-risk {
          border-color: #ef4444 !important;
          background: linear-gradient(135deg, #fef2f2, white) !important;
        }

        .ai-detector-page-badge.badge-medium-risk {
          border-color: #f59e0b !important;
          background: linear-gradient(135deg, #fffbeb, white) !important;
        }

        .ai-detector-page-badge.badge-low-risk {
          border-color: #10b981 !important;
          background: linear-gradient(135deg, #f0fdf4, white) !important;
        }

        .ai-detector-page-badge.badge-loading {
          border-color: #6b7280 !important;
          background: linear-gradient(135deg, #f9fafb, white) !important;
        }

        .ai-detector-page-badge.expanded {
          max-width: 350px !important;
        }

        .ai-detector-page-badge.minimized {
          transform: scale(0.9) !important;
          opacity: 0.7 !important;
        }

        .badge-content {
          display: flex !important;
          align-items: center !important;
          padding: 12px !important;
          cursor: pointer !important;
        }

        .badge-icon {
          font-size: 20px !important;
          margin-right: 8px !important;
          line-height: 1 !important;
        }

        .badge-info {
          flex: 1 !important;
          min-width: 0 !important;
        }

        .badge-score {
          font-size: 16px !important;
          font-weight: 700 !important;
          color: #1f2937 !important;
          line-height: 1 !important;
          margin-bottom: 2px !important;
        }

        .badge-label {
          font-size: 11px !important;
          color: #6b7280 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
          line-height: 1 !important;
        }

        .badge-expand {
          padding: 4px !important;
          margin-left: 8px !important;
          cursor: pointer !important;
          border-radius: 4px !important;
          transition: background 0.2s ease !important;
        }

        .badge-expand:hover {
          background: #f3f4f6 !important;
        }

        .expand-icon {
          font-size: 12px !important;
          color: #6b7280 !important;
          display: block !important;
          line-height: 1 !important;
        }

        .badge-details {
          border-top: 1px solid #e5e7eb !important;
          padding: 12px !important;
          background: #f9fafb !important;
        }

        .badge-details.hidden {
          display: none !important;
        }

        .badge-detail-item {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-bottom: 6px !important;
        }

        .badge-detail-item:last-child {
          margin-bottom: 0 !important;
        }

        .detail-label {
          font-size: 11px !important;
          color: #6b7280 !important;
          font-weight: 500 !important;
        }

        .detail-value {
          font-size: 11px !important;
          color: #1f2937 !important;
          font-weight: 600 !important;
        }

        .badge-reasoning {
          margin: 8px 0 !important;
          font-size: 11px !important;
          color: #4b5563 !important;
          line-height: 1.4 !important;
          max-height: 60px !important;
          overflow-y: auto !important;
        }

        .badge-actions {
          display: flex !important;
          gap: 6px !important;
          margin-top: 8px !important;
          justify-content: flex-end !important;
        }

        .badge-btn {
          background: white !important;
          border: 1px solid #d1d5db !important;
          border-radius: 6px !important;
          padding: 6px 8px !important;
          font-size: 12px !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          line-height: 1 !important;
        }

        .badge-btn:hover {
          background: #f3f4f6 !important;
          border-color: #9ca3af !important;
        }

        .badge-btn-analyze:hover {
          background: #dbeafe !important;
          border-color: #3b82f6 !important;
        }

        .badge-btn-close:hover {
          background: #fee2e2 !important;
          border-color: #ef4444 !important;
        }
      `;
      
      document.head.appendChild(style);
    }

    injectSelectionTooltipStyles() {
      // Only inject once
      if (document.getElementById('ai-detector-selection-styles')) {
        return;
      }

      const style = document.createElement('style');
      style.id = 'ai-detector-selection-styles';
      style.textContent = `
        /* AI Detector Selection Tooltip Styles */
        .ai-detector-selection-tooltip {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          position: absolute !important;
          z-index: 10000 !important;
          opacity: 0 !important;
          transform: translateX(-50%) translateY(8px) !important;
          transition: opacity 0.2s ease-out, transform 0.2s ease-out !important;
          pointer-events: none !important;
        }

        .ai-detector-selection-tooltip.show {
          opacity: 1 !important;
          transform: translateX(-50%) translateY(4px) !important;
          pointer-events: auto !important;
        }

        .ai-detector-selection-tooltip.hiding {
          opacity: 0 !important;
          transform: translateX(-50%) translateY(12px) !important;
          pointer-events: none !important;
        }

        .ai-detector-selection-tooltip .tooltip-content {
          background: #1f2937 !important;
          border-radius: 8px !important;
          padding: 10px 14px !important;
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3) !important;
          position: relative !important;
          border: 2px solid #3b82f6 !important;
        }

        .ai-detector-selection-tooltip .tooltip-content::after {
          content: '' !important;
          position: absolute !important;
          bottom: 100% !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          width: 0 !important;
          height: 0 !important;
          border-left: 6px solid transparent !important;
          border-right: 6px solid transparent !important;
          border-bottom: 6px solid #3b82f6 !important;
        }

        .ai-detector-selection-tooltip .analyze-btn {
          background: #3b82f6 !important;
          color: white !important;
          border: none !important;
          border-radius: 6px !important;
          padding: 6px 10px !important;
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          transition: background-color 0.2s ease !important;
          white-space: nowrap !important;
        }

        .ai-detector-selection-tooltip .analyze-btn:hover {
          background: #2563eb !important;
        }

        .ai-detector-selection-tooltip .analyze-btn:disabled {
          background: #6b7280 !important;
          cursor: not-allowed !important;
        }

        .ai-detector-selection-tooltip .analyze-btn svg {
          width: 14px !important;
          height: 14px !important;
          flex-shrink: 0 !important;
        }

        .ai-detector-selection-tooltip .word-count {
          color: #9ca3af !important;
          font-size: 11px !important;
          white-space: nowrap !important;
        }

        .ai-detector-selection-tooltip .keyboard-hint {
          color: #6b7280 !important;
          font-size: 10px !important;
          font-family: monospace !important;
          background: rgba(0, 0, 0, 0.3) !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
          white-space: nowrap !important;
        }

        .ai-detector-selection-tooltip .loading-spinner {
          width: 14px !important;
          height: 14px !important;
          border: 2px solid #374151 !important;
          border-top: 2px solid #ffffff !important;
          border-radius: 50% !important;
          animation: ai-detector-spin 1s linear infinite !important;
        }



        @keyframes ai-detector-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Progress Bar Styles */
        .ai-detector-selection-tooltip .progress-container {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 8px !important;
          padding: 4px !important;
        }

        .ai-detector-selection-tooltip .progress-bar {
          width: 120px !important;
          height: 4px !important;
          background: rgba(255, 255, 255, 0.2) !important;
          border-radius: 2px !important;
          overflow: hidden !important;
        }

        .ai-detector-selection-tooltip .progress-fill {
          height: 100% !important;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6, #3b82f6) !important;
          background-size: 200% 100% !important;
          border-radius: 2px !important;
          width: 0% !important;
          animation: ai-detector-progress-load 2s ease-in-out infinite, ai-detector-gradient 1.5s ease-in-out infinite !important;
        }

        .ai-detector-selection-tooltip .progress-text {
          color: #e5e7eb !important;
          font-size: 11px !important;
          font-weight: 500 !important;
        }

        .ai-detector-selection-tooltip .error-container {
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          color: #ef4444 !important;
        }

        .ai-detector-selection-tooltip .error-icon {
          font-size: 14px !important;
        }

        .ai-detector-selection-tooltip .error-text {
          font-size: 11px !important;
          font-weight: 500 !important;
        }

        @keyframes ai-detector-progress-load {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }

        /* Analysis Modal Styles */
        .ai-detector-analysis-modal {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          background: rgba(0, 0, 0, 0.5) !important;
          z-index: 10001 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          opacity: 0 !important;
          transition: opacity 0.3s ease-out !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }

        .ai-detector-analysis-modal.show {
          opacity: 1 !important;
        }

        .ai-detector-analysis-modal.hiding {
          opacity: 0 !important;
        }

        .ai-detector-analysis-modal .analysis-modal-content {
          background: white !important;
          border-radius: 12px !important;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25) !important;
          max-width: 480px !important;
          width: 90% !important;
          max-height: 80vh !important;
          overflow: auto !important;
          transform: scale(0.9) translateY(20px) !important;
          transition: transform 0.3s ease-out !important;
        }

        .ai-detector-analysis-modal.show .analysis-modal-content {
          transform: scale(1) translateY(0) !important;
        }

        .ai-detector-analysis-modal .modal-header {
          padding: 20px 24px 0 24px !important;
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          border-bottom: 1px solid #f3f4f6 !important;
          margin-bottom: 20px !important;
        }

        .ai-detector-analysis-modal .modal-header h3 {
          margin: 0 !important;
          font-size: 18px !important;
          font-weight: 600 !important;
          color: #111827 !important;
        }

        .ai-detector-analysis-modal .close-btn {
          background: none !important;
          border: none !important;
          font-size: 24px !important;
          color: #6b7280 !important;
          cursor: pointer !important;
          padding: 0 !important;
          width: 32px !important;
          height: 32px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 6px !important;
          transition: background-color 0.2s ease !important;
        }

        .ai-detector-analysis-modal .close-btn:hover {
          background: #f3f4f6 !important;
          color: #374151 !important;
        }

        .ai-detector-analysis-modal .modal-body {
          padding: 0 24px 24px 24px !important;
        }

        .ai-detector-analysis-modal .analysis-state {
          display: block !important;
        }

        .ai-detector-analysis-modal .analysis-state.hidden {
          display: none !important;
        }

        .ai-detector-analysis-modal .text-preview {
          font-size: 13px !important;
          color: #6b7280 !important;
          margin-top: 16px !important;
          padding: 12px !important;
          background: #f9fafb !important;
          border-radius: 6px !important;
          border-left: 3px solid #3b82f6 !important;
        }

        .ai-detector-analysis-modal .back-btn {
          background: #f9fafb !important;
          color: #374151 !important;
          border: 1px solid #d1d5db !important;
          border-radius: 6px !important;
          padding: 8px 16px !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          transition: background-color 0.2s ease !important;
          margin-top: 16px !important;
        }

        .ai-detector-analysis-modal .back-btn:hover {
          background: #f3f4f6 !important;
        }

        /* Enhanced Text Formatting Styles */
        .ai-detector-analysis-modal .reasoning {
          background: #f9fafb !important;
          padding: 20px !important;
          border-radius: 8px !important;
          margin-bottom: 16px !important;
          font-size: 14px !important;
          line-height: 1.6 !important;
          color: #374151 !important;
          border-left: 4px solid #3b82f6 !important;
        }

        .ai-detector-analysis-modal .reasoning p {
          margin: 0 0 12px 0 !important;
        }

        .ai-detector-analysis-modal .reasoning p:last-child {
          margin-bottom: 0 !important;
        }

        .ai-detector-analysis-modal .no-reasoning {
          color: #6b7280 !important;
          font-style: italic !important;
        }

        .ai-detector-analysis-modal .quoted-text {
          background: rgba(59, 130, 246, 0.1) !important;
          color: #1e40af !important;
          padding: 2px 4px !important;
          border-radius: 3px !important;
          font-weight: 500 !important;
        }

        .ai-detector-analysis-modal .parenthetical {
          color: #6b7280 !important;
          font-size: 13px !important;
        }

        .ai-detector-analysis-modal .technical-term {
          background: #f0f9ff !important;
          color: #0369a1 !important;
          padding: 1px 6px !important;
          border-radius: 4px !important;
          font-weight: 500 !important;
          font-size: 13px !important;
          border: 1px solid #bae6fd !important;
        }

        .ai-detector-analysis-modal .confidence-indicator {
          background: #ecfdf5 !important;
          color: #065f46 !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
          font-weight: 600 !important;
          font-size: 13px !important;
          border: 1px solid #bbf7d0 !important;
        }

        /* Improved Statistical Breakdown */
        .ai-detector-analysis-modal .statistical-breakdown {
          background: #f8fafc !important;
          padding: 18px !important;
          border-radius: 8px !important;
          margin-bottom: 16px !important;
          border: 1px solid #e2e8f0 !important;
        }

        .ai-detector-analysis-modal .statistical-breakdown h4 {
          margin: 0 0 14px 0 !important;
          font-size: 15px !important;
          font-weight: 600 !important;
          color: #374151 !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
        }

        .ai-detector-analysis-modal .stats-grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 10px !important;
          margin-bottom: 14px !important;
        }

        .ai-detector-analysis-modal .stat-item {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          padding: 8px 12px !important;
          background: white !important;
          border-radius: 6px !important;
          font-size: 13px !important;
          border: 1px solid #e5e7eb !important;
        }

        .ai-detector-analysis-modal .stat-label {
          color: #6b7280 !important;
          font-weight: 500 !important;
        }

        .ai-detector-analysis-modal .stat-value {
          color: #374151 !important;
          font-weight: 600 !important;
          padding: 2px 6px !important;
          background: #f3f4f6 !important;
          border-radius: 4px !important;
        }

        .ai-detector-analysis-modal .analysis-method {
          text-align: center !important;
          color: #6b7280 !important;
          font-size: 12px !important;
          padding: 8px !important;
          background: rgba(59, 130, 246, 0.05) !important;
          border-radius: 6px !important;
        }

        /* Enhanced Progress State */
        .ai-detector-analysis-modal .progress-container {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 16px !important;
          padding: 20px !important;
        }

        .ai-detector-analysis-modal .progress-text {
          color: #374151 !important;
          font-size: 16px !important;
          font-weight: 600 !important;
          text-align: center !important;
        }

        .ai-detector-analysis-modal .progress-bar {
          width: 200px !important;
          height: 6px !important;
          background: #e5e7eb !important;
          border-radius: 3px !important;
          overflow: hidden !important;
        }

        .ai-detector-analysis-modal .progress-fill {
          height: 100% !important;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6, #3b82f6) !important;
          background-size: 200% 100% !important;
          border-radius: 3px !important;
          width: 0% !important;
          animation: ai-detector-progress-load 2s ease-in-out infinite, ai-detector-gradient 1.5s ease-in-out infinite !important;
        }

        /* Improved Text Info Section */
        .ai-detector-analysis-modal .text-info {
          background: #f1f5f9 !important;
          padding: 14px !important;
          border-radius: 8px !important;
          margin-bottom: 16px !important;
          border-left: 3px solid #0ea5e9 !important;
        }

        .ai-detector-analysis-modal .text-info .text-preview {
          font-size: 13px !important;
          color: #475569 !important;
          margin-bottom: 8px !important;
          line-height: 1.4 !important;
        }

        .ai-detector-analysis-modal .text-info .result-meta {
          font-size: 12px !important;
          color: #64748b !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
        }

        .ai-detector-analysis-modal .cache-indicator {
          background: #dbeafe !important;
          color: #1e40af !important;
          padding: 2px 6px !important;
          border-radius: 3px !important;
          font-size: 11px !important;
          font-weight: 500 !important;
        }

        /* Reuse popup analysis styles in modal */
        .ai-detector-analysis-modal .analysis-result {
          padding: 0 24px !important;
        }

        .ai-detector-analysis-modal .analysis-result .result-header {
          padding: 0 !important;
          border: none !important;
          margin-bottom: 16px !important;
          display: flex !important;
          gap: 16px !important;
        }

        .ai-detector-analysis-modal .likelihood-score,
        .ai-detector-analysis-modal .confidence-score {
          flex: 1 !important;
          text-align: center !important;
          padding: 16px !important;
          border-radius: 8px !important;
          border: 2px solid #e5e7eb !important;
        }

        .ai-detector-inline-result .likelihood-score.high-ai {
          background: #fee2e2 !important;
          border-color: #ef4444 !important;
          color: #dc2626 !important;
        }

        .ai-detector-inline-result .likelihood-score.medium-ai {
          background: #fef3c7 !important;
          border-color: #f59e0b !important;
          color: #d97706 !important;
        }

        .ai-detector-inline-result .likelihood-score.low-ai {
          background: #dbeafe !important;
          border-color: #3b82f6 !important;
          color: #2563eb !important;
        }

        .ai-detector-inline-result .likelihood-score.human {
          background: #dcfce7 !important;
          border-color: #22c55e !important;
          color: #16a34a !important;
        }

        .ai-detector-inline-result .score-value {
          display: block !important;
          font-size: 24px !important;
          font-weight: 700 !important;
          line-height: 1 !important;
        }

        .ai-detector-inline-result .score-label {
          display: block !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          margin-top: 4px !important;
          opacity: 0.8 !important;
        }

        .ai-detector-inline-result .reasoning {
          background: #f9fafb !important;
          padding: 16px !important;
          border-radius: 8px !important;
          margin-bottom: 16px !important;
          font-size: 14px !important;
          line-height: 1.5 !important;
          color: #374151 !important;
        }

        .ai-detector-inline-result .statistical-breakdown {
          background: #f9fafb !important;
          padding: 16px !important;
          border-radius: 8px !important;
          margin-bottom: 16px !important;
        }

        .ai-detector-inline-result .statistical-breakdown h4 {
          margin: 0 0 12px 0 !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          color: #374151 !important;
        }

        .ai-detector-inline-result .stats-grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 8px !important;
          margin-bottom: 12px !important;
        }

        .ai-detector-inline-result .stat-item {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          padding: 6px 8px !important;
          background: white !important;
          border-radius: 4px !important;
          font-size: 12px !important;
        }

        .ai-detector-inline-result .stat-label {
          color: #6b7280 !important;
          font-weight: 500 !important;
        }

        .ai-detector-inline-result .stat-value {
          color: #374151 !important;
          font-weight: 600 !important;
        }

        .ai-detector-inline-result .analysis-method {
          text-align: center !important;
          color: #6b7280 !important;
        }

        .ai-detector-inline-result .analysis-details {
          background: #f3f4f6 !important;
          padding: 12px !important;
          border-radius: 6px !important;
          margin-bottom: 16px !important;
        }

        .ai-detector-inline-result .text-preview {
          font-size: 13px !important;
          color: #374151 !important;
          margin-bottom: 8px !important;
          line-height: 1.4 !important;
        }

        .ai-detector-inline-result .result-meta {
          font-size: 11px !important;
          color: #6b7280 !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
        }

        .ai-detector-inline-result .cache-indicator {
          background: #e5e7eb !important;
          padding: 2px 6px !important;
          border-radius: 3px !important;
          font-size: 10px !important;
        }

        .ai-detector-inline-result .result-actions {
          padding: 20px 24px 24px 24px !important;
          display: flex !important;
          gap: 12px !important;
          justify-content: flex-end !important;
          border-top: 1px solid #f3f4f6 !important;
        }

        .ai-detector-inline-result .btn-primary {
          background: #3b82f6 !important;
          color: white !important;
          border: none !important;
          border-radius: 6px !important;
          padding: 8px 16px !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          transition: background-color 0.2s ease !important;
        }

        .ai-detector-inline-result .btn-primary:hover {
          background: #2563eb !important;
        }

        .ai-detector-inline-result .btn-secondary {
          background: #f9fafb !important;
          color: #374151 !important;
          border: 1px solid #d1d5db !important;
          border-radius: 6px !important;
          padding: 8px 16px !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          transition: background-color 0.2s ease !important;
        }

        .ai-detector-inline-result .btn-secondary:hover {
          background: #f3f4f6 !important;
        }

        /* Feedback Overlay Styles */
        .ai-detector-feedback-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          background: rgba(0, 0, 0, 0.5) !important;
          z-index: 10002 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          opacity: 0 !important;
          transition: opacity 0.3s ease-out !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }

        .ai-detector-feedback-overlay.show {
          opacity: 1 !important;
        }

        .ai-detector-feedback-overlay.hiding {
          opacity: 0 !important;
        }

        .ai-detector-feedback-overlay .feedback-overlay-content {
          background: white !important;
          border-radius: 12px !important;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25) !important;
          max-width: 520px !important;
          width: 90% !important;
          max-height: 80vh !important;
          overflow: auto !important;
          transform: scale(0.9) translateY(20px) !important;
          transition: transform 0.3s ease-out !important;
        }

        .ai-detector-feedback-overlay.show .feedback-overlay-content {
          transform: scale(1) translateY(0) !important;
        }

        .ai-detector-feedback-overlay .feedback-header {
          padding: 20px 24px 0 24px !important;
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          border-bottom: 1px solid #f3f4f6 !important;
          margin-bottom: 20px !important;
        }

        .ai-detector-feedback-overlay .feedback-header h3 {
          margin: 0 !important;
          font-size: 18px !important;
          font-weight: 600 !important;
          color: #111827 !important;
        }

        .ai-detector-feedback-overlay .close-btn {
          background: none !important;
          border: none !important;
          font-size: 24px !important;
          color: #6b7280 !important;
          cursor: pointer !important;
          padding: 0 !important;
          width: 32px !important;
          height: 32px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 6px !important;
          transition: background-color 0.2s ease !important;
        }

        .ai-detector-feedback-overlay .close-btn:hover {
          background: #f3f4f6 !important;
          color: #374151 !important;
        }

        .ai-detector-feedback-overlay .feedback-body {
          padding: 0 24px 24px 24px !important;
        }

        .ai-detector-feedback-overlay .analysis-summary {
          background: #f9fafb !important;
          padding: 16px !important;
          border-radius: 8px !important;
          margin-bottom: 20px !important;
          display: flex !important;
          gap: 20px !important;
        }

        .ai-detector-feedback-overlay .summary-item {
          display: flex !important;
          flex-direction: column !important;
        }

        .ai-detector-feedback-overlay .summary-label {
          font-size: 12px !important;
          color: #6b7280 !important;
          font-weight: 500 !important;
          margin-bottom: 4px !important;
        }

        .ai-detector-feedback-overlay .summary-value {
          font-size: 14px !important;
          color: #374151 !important;
          font-weight: 600 !important;
        }

        /* Feedback Section Styles */
        .ai-detector-feedback-overlay .feedback-section {
          display: flex !important;
          flex-direction: column !important;
          gap: 16px !important;
        }

        .ai-detector-feedback-overlay .feedback-section .feedback-header {
          text-align: center !important;
          padding: 0 !important;
          border: none !important;
          margin: 0 !important;
        }

        .ai-detector-feedback-overlay .feedback-title {
          font-size: 16px !important;
          font-weight: 600 !important;
          color: #374151 !important;
          display: block !important;
          margin-bottom: 4px !important;
        }

        .ai-detector-feedback-overlay .feedback-subtitle {
          font-size: 13px !important;
          color: #6b7280 !important;
          display: block !important;
        }

        .ai-detector-feedback-overlay .feedback-rating {
          display: flex !important;
          gap: 12px !important;
          justify-content: center !important;
        }

        .ai-detector-feedback-overlay .feedback-btn {
          flex: 1 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 8px !important;
          padding: 16px 12px !important;
          border: 2px solid #e5e7eb !important;
          border-radius: 8px !important;
          background: white !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          font-size: 14px !important;
        }

        .ai-detector-feedback-overlay .feedback-btn:hover {
          border-color: #3b82f6 !important;
          background: #f8fafc !important;
        }

        .ai-detector-feedback-overlay .feedback-btn:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
        }

        .ai-detector-feedback-overlay .feedback-icon {
          font-size: 24px !important;
        }

        .ai-detector-feedback-overlay .feedback-label {
          font-weight: 500 !important;
          color: #374151 !important;
        }

        /* Detailed Feedback Styles */
        .ai-detector-feedback-overlay .feedback-correction {
          margin-bottom: 20px !important;
        }

        .ai-detector-feedback-overlay .correction-title {
          font-size: 14px !important;
          font-weight: 600 !important;
          color: #374151 !important;
          display: block !important;
          margin-bottom: 12px !important;
        }

        .ai-detector-feedback-overlay .correction-slider-container {
          background: #f9fafb !important;
          padding: 16px !important;
          border-radius: 8px !important;
        }

        .ai-detector-feedback-overlay .correction-slider {
          width: 100% !important;
          height: 8px !important;
          border-radius: 4px !important;
          background: #e5e7eb !important;
          outline: none !important;
          margin-bottom: 8px !important;
        }

        .ai-detector-feedback-overlay .correction-value {
          font-size: 13px !important;
          color: #6b7280 !important;
          text-align: center !important;
          display: block !important;
        }

        .ai-detector-feedback-overlay .feedback-reasons {
          margin-bottom: 20px !important;
        }

        .ai-detector-feedback-overlay .reasons-title {
          font-size: 14px !important;
          font-weight: 600 !important;
          color: #374151 !important;
          display: block !important;
          margin-bottom: 12px !important;
        }

        .ai-detector-feedback-overlay .reason-category {
          margin-bottom: 16px !important;
        }

        .ai-detector-feedback-overlay .category-title {
          font-size: 13px !important;
          font-weight: 500 !important;
          color: #6b7280 !important;
          display: block !important;
          margin-bottom: 8px !important;
        }

        .ai-detector-feedback-overlay .reason-checkbox {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          margin-bottom: 6px !important;
          cursor: pointer !important;
        }

        .ai-detector-feedback-overlay .reason-checkbox input {
          margin: 0 !important;
        }

        .ai-detector-feedback-overlay .checkbox-text {
          font-size: 13px !important;
          color: #374151 !important;
        }

        .ai-detector-feedback-overlay .feedback-confidence {
          margin-bottom: 20px !important;
        }

        .ai-detector-feedback-overlay .confidence-title {
          font-size: 14px !important;
          font-weight: 600 !important;
          color: #374151 !important;
          display: block !important;
          margin-bottom: 12px !important;
        }

        .ai-detector-feedback-overlay .confidence-buttons {
          display: flex !important;
          gap: 8px !important;
        }

        .ai-detector-feedback-overlay .confidence-btn {
          flex: 1 !important;
          padding: 8px 12px !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 6px !important;
          background: white !important;
          cursor: pointer !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          color: #374151 !important;
          transition: all 0.2s ease !important;
        }

        .ai-detector-feedback-overlay .confidence-btn:hover {
          border-color: #3b82f6 !important;
          background: #f8fafc !important;
        }

        .ai-detector-feedback-overlay .confidence-btn.selected {
          border-color: #3b82f6 !important;
          background: #3b82f6 !important;
          color: white !important;
        }

        .ai-detector-feedback-overlay .feedback-actions {
          display: flex !important;
          gap: 12px !important;
          justify-content: flex-end !important;
        }

        .ai-detector-feedback-overlay .feedback-submit-btn {
          background: #3b82f6 !important;
          color: white !important;
          border: none !important;
          border-radius: 6px !important;
          padding: 10px 20px !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          transition: background-color 0.2s ease !important;
        }

        .ai-detector-feedback-overlay .feedback-submit-btn:hover {
          background: #2563eb !important;
        }

        .ai-detector-feedback-overlay .feedback-skip-btn {
          background: #f9fafb !important;
          color: #374151 !important;
          border: 1px solid #d1d5db !important;
          border-radius: 6px !important;
          padding: 10px 20px !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          transition: background-color 0.2s ease !important;
        }

        .ai-detector-feedback-overlay .feedback-skip-btn:hover {
          background: #f3f4f6 !important;
        }

        .ai-detector-feedback-overlay .feedback-status {
          text-align: center !important;
          padding: 20px !important;
          background: #f0f9ff !important;
          border-radius: 8px !important;
        }

        .ai-detector-feedback-overlay .status-text {
          font-size: 14px !important;
          color: #1e40af !important;
          font-weight: 500 !important;
        }
      `;
      
      document.head.appendChild(style);
    }

    shouldAutoAnalyze() {
      // For now, disable auto-analysis to prevent errors
      return false;
    }

    scheduleAutoAnalysis() {
      // Placeholder for future auto-analysis feature
      console.log('Auto-analysis scheduled (not implemented yet)');
    }

    showInPageBadge(analysis) {
      // Remove any existing badge
      this.removeInPageBadge();

      // Create badge container
      const badge = document.createElement('div');
      badge.id = 'ai-detector-page-badge';
      badge.className = `ai-detector-page-badge ${this.getBadgeClass(analysis.likelihood)}`;
      
      // Position badge
      badge.style.position = 'fixed';
      badge.style.top = '20px';
      badge.style.right = '20px';
      badge.style.zIndex = '9999';
      badge.style.cursor = 'pointer';

      // Create badge content
      const content = `
        <div class="badge-content">
          <div class="badge-icon">
            ${this.getBadgeIcon(analysis.likelihood)}
          </div>
          <div class="badge-info">
            <div class="badge-score">${Math.round(analysis.likelihood)}%</div>
            <div class="badge-label">AI Likely</div>
          </div>
          <div class="badge-expand" title="Click for details">
            <span class="expand-icon">▼</span>
          </div>
        </div>
        <div class="badge-details hidden">
          <div class="badge-detail-item">
            <span class="detail-label">Confidence:</span>
            <span class="detail-value">${Math.round(analysis.confidence)}%</span>
          </div>
          <div class="badge-detail-item">
            <span class="detail-label">Method:</span>
            <span class="detail-value">${analysis.method || 'ensemble'}</span>
          </div>
          <div class="badge-reasoning">
            ${TextFormatter.formatReasoningCompact(analysis.reasoning)}
          </div>
          <div class="badge-actions">
            <button class="badge-btn badge-btn-analyze" title="Re-analyze">🔄</button>
            <button class="badge-btn badge-btn-close" title="Close">✕</button>
          </div>
        </div>
      `;

      badge.innerHTML = content;

      // Add event listeners
      this.addBadgeEventListeners(badge, analysis);

      // Add to page
      document.body.appendChild(badge);

      // Auto-collapse after 5 seconds
      setTimeout(() => {
        const expandIcon = badge.querySelector('.expand-icon');
        if (expandIcon && !expandIcon.textContent.includes('▲')) {
          // Only auto-collapse if not already expanded
          this.minimizeBadge(badge);
        }
      }, 5000);
    }

    addBadgeEventListeners(badge, analysis) {
      // Toggle details on click
      const expandArea = badge.querySelector('.badge-expand');
      const content = badge.querySelector('.badge-content');
      
      const toggleDetails = () => {
        const details = badge.querySelector('.badge-details');
        const expandIcon = badge.querySelector('.expand-icon');
        
        if (details.classList.contains('hidden')) {
          details.classList.remove('hidden');
          expandIcon.textContent = '▲';
          badge.classList.add('expanded');
        } else {
          details.classList.add('hidden');
          expandIcon.textContent = '▼';
          badge.classList.remove('expanded');
        }
      };

      expandArea.addEventListener('click', toggleDetails);
      content.addEventListener('click', toggleDetails);

      // Re-analyze button
      const analyzeBtn = badge.querySelector('.badge-btn-analyze');
      analyzeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.reAnalyzePage();
      });

      // Close button
      const closeBtn = badge.querySelector('.badge-btn-close');
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeInPageBadge();
      });
    }

    removeInPageBadge() {
      const existing = document.getElementById('ai-detector-page-badge');
      if (existing) {
        existing.remove();
      }
    }

    minimizeBadge(badge) {
      if (!badge) return;
      
      badge.classList.add('minimized');
      setTimeout(() => {
        badge.classList.remove('minimized');
      }, 3000);
    }

    getBadgeClass(likelihood) {
      if (likelihood > 70) return 'badge-high-risk';
      if (likelihood > 40) return 'badge-medium-risk';
      return 'badge-low-risk';
    }

    getBadgeIcon(likelihood) {
      if (likelihood > 70) return '🤖';
      if (likelihood > 40) return '⚠️';
      return '✅';
    }

    async reAnalyzePage() {
      try {
        this.removeInPageBadge();
        
        // Show temporary loading badge
        const loadingBadge = document.createElement('div');
        loadingBadge.id = 'ai-detector-page-badge';
        loadingBadge.className = 'ai-detector-page-badge badge-loading';
        loadingBadge.style.position = 'fixed';
        loadingBadge.style.top = '20px';
        loadingBadge.style.right = '20px';
        loadingBadge.style.zIndex = '9999';
        loadingBadge.innerHTML = `
          <div class="badge-content">
            <div class="badge-icon">🔄</div>
            <div class="badge-info">
              <div class="badge-score">...</div>
              <div class="badge-label">Analyzing</div>
            </div>
          </div>
        `;
        
        document.body.appendChild(loadingBadge);

        // Trigger re-analysis
        const result = await this.analyzeCurrentPage();
        
        // Remove loading badge and show results
        loadingBadge.remove();
        
        if (result && result.analysis) {
          this.showInPageBadge(result.analysis);
        }
      } catch (error) {
        console.error('Re-analysis failed:', error);
        this.removeInPageBadge();
      }
    }
  }

  // Initialize content analyzer when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new ContentAnalyzer();
      console.log('AI Content Detector content script initialized (DOM loaded)');
    });
  } else {
    new ContentAnalyzer();
    console.log('AI Content Detector content script initialized (DOM ready)');
  }

  console.log('AI Content Detector content script loaded on:', window.location.href);
} 
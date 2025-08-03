/**
 * Refactored Content Script for AI Content Detector Extension
 * Uses unified AnalysisEngine, ModalStateMachine, and FeedbackComponent
 */

import { AnalysisEngine } from '../shared/analysis-engine.js';
import { ModalStateMachine } from '../shared/ui-state-machine.js';
import { FeedbackComponent } from '../shared/feedback-component.js';
import { FeedbackManager } from '../shared/feedback-manager.js';
import TextFormatter from '../shared/text-formatter.js';

/* global document, window, chrome, getSelection */

// Early exit for browser internal pages
if (window.location.protocol === 'chrome:' || 
    window.location.protocol === 'opera:' || 
    window.location.protocol === 'chrome-extension:' ||
    window.location.protocol === 'moz-extension:') {
  console.log('AI Content Detector: Skipping browser internal page');
} else {
  initializeContentAnalyzer();
}

function initializeContentAnalyzer() {
  class ModernContentAnalyzer {
    constructor() {
      // Core components
      this.analysisEngine = new AnalysisEngine();
      this.feedbackManager = new FeedbackManager();
      this.textFormatter = new TextFormatter();
      
      // UI state
      this.modalStateMachine = null;
      this.currentModal = null;
      this.feedbackComponent = null;
      this.selectionTooltip = null;
      this.selectionTimeout = null;
      
      // Initialize
      this.setupMessageListener();
      this.setupSelectionHandler();
      this.setupKeyboardShortcuts();
      this.injectStyles();
      
      console.log('Modern Content Analyzer initialized with unified architecture');
    }

    // ===============================
    // MESSAGE HANDLING
    // ===============================

    setupMessageListener() {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        this.handleMessage(request, sender, sendResponse);
        return true; // Keep channel open for async responses
      });
    }

    async handleMessage(request, sender, sendResponse) {
      try {
        switch (request.action) {
          case 'analyze':
            await this.handleAnalyzeRequest(request, sendResponse);
            break;
          case 'extractContent':
            this.handleExtractContent(sendResponse);
            break;
          case 'ping':
            sendResponse({ status: 'ready', architecture: 'unified' });
            break;
          default:
            console.warn('Unknown action:', request.action);
            sendResponse({ success: false, error: 'Unknown action' });
        }
      } catch (error) {
        console.error('Message handling error:', error);
        sendResponse({ success: false, error: error.message });
      }
    }

    async handleAnalyzeRequest(request, sendResponse) {
      try {
        const content = request.content || this.extractPageContent();
        if (!content || content.trim().length < 50) {
          throw new Error('Content too short for analysis');
        }

        const result = await this.analysisEngine.analyze(content);
        sendResponse({ success: true, analysis: result });
      } catch (error) {
        console.error('Analysis failed:', error);
        sendResponse({ success: false, error: error.message });
      }
    }

    handleExtractContent(sendResponse) {
      try {
        const content = this.extractPageContent();
        const metadata = this.extractPageMetadata();
        
        sendResponse({
          success: true,
          content,
          metadata,
          url: window.location.href,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Content extraction failed:', error);
        sendResponse({ success: false, error: error.message });
      }
    }

    // ===============================
    // CONTENT EXTRACTION
    // ===============================

    extractPageContent() {
      const contentSelectors = [
        'article',
        '[role="main"]',
        'main',
        '.post-content',
        '.article-content',
        '.content',
        '.entry-content',
        '#content'
      ];

      // Try structured content first
      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = this.textFormatter.extractTextContent(element);
          if (text && text.trim().length > 100) {
            return text;
          }
        }
      }

      // Fallback to body content
      const bodyText = this.textFormatter.extractTextContent(document.body);
      return bodyText || 'No content found';
    }

    extractPageMetadata() {
      return {
        title: document.title || '',
        description: this.getMetaContent('description') || '',
        author: this.getMetaContent('author') || '',
        publishDate: this.getMetaContent('article:published_time') || '',
        domain: window.location.hostname,
        pathname: window.location.pathname
      };
    }

    getMetaContent(name) {
      const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
      return meta ? meta.getAttribute('content') : null;
    }

    // ===============================
    // TEXT SELECTION & QUICK ANALYSIS
    // ===============================

    setupSelectionHandler() {
      let isMouseDown = false;

      document.addEventListener('mousedown', () => {
        isMouseDown = true;
        this.hideSelectionTooltip();
      });

      document.addEventListener('mouseup', () => {
        isMouseDown = false;
        // Delay to allow selection to complete
        setTimeout(() => {
          if (!this.modalStateMachine || this.modalStateMachine.getState() === 'idle') {
            this.checkAndShowTooltip();
          }
        }, 100);
      });

      document.addEventListener('selectionchange', () => {
        if (!isMouseDown && (!this.modalStateMachine || this.modalStateMachine.getState() === 'idle')) {
          this.handleSelectionChange();
        }
      });

      // Hide tooltip on scroll or click elsewhere
      window.addEventListener('scroll', () => this.hideSelectionTooltip());
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.ai-detector-selection-tooltip')) {
          this.hideSelectionTooltip();
        }
      });
    }

    setupKeyboardShortcuts() {
      document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Shift + A for quick analysis
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
          e.preventDefault();
          const selectedText = this.getSelectedText();
          if (selectedText && selectedText.length > 50) {
            this.startQuickAnalysis(selectedText);
          }
        }
      });
    }

    handleSelectionChange() {
      clearTimeout(this.selectionTimeout);
      this.selectionTimeout = setTimeout(() => {
        this.checkAndShowTooltip();
      }, 300);
    }

    checkAndShowTooltip() {
      const selectedText = this.getSelectedText();
      
      if (selectedText && selectedText.length > 50) {
        this.showSelectionTooltip(selectedText);
      } else {
        this.hideSelectionTooltip();
      }
    }

    getSelectedText() {
      const selection = getSelection();
      return selection.toString().trim();
    }

    showSelectionTooltip(selectedText) {
      this.hideSelectionTooltip();

      const selection = getSelection();
      if (!selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      this.selectionTooltip = document.createElement('div');
      this.selectionTooltip.className = 'ai-detector-selection-tooltip';
      
      // Position below selection
      const top = rect.bottom + window.scrollY + 10;
      const left = rect.left + window.scrollX + (rect.width / 2);
      
      this.selectionTooltip.innerHTML = `
        <div class="tooltip-content">
          <button class="quick-analyze-btn">
            <span class="analyze-icon">🔍</span>
            Quick Analysis
          </button>
          <div class="keyboard-hint">Ctrl+Shift+A</div>
        </div>
        <div class="tooltip-arrow"></div>
      `;

      this.selectionTooltip.style.position = 'absolute';
      this.selectionTooltip.style.top = `${top}px`;
      this.selectionTooltip.style.left = `${left}px`;
      this.selectionTooltip.style.transform = 'translateX(-50%)';

      // Add click handler
      const analyzeBtn = this.selectionTooltip.querySelector('.quick-analyze-btn');
      analyzeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hideSelectionTooltip();
        this.startQuickAnalysis(selectedText);
      });

      document.body.appendChild(this.selectionTooltip);
    }

    hideSelectionTooltip() {
      if (this.selectionTooltip) {
        this.selectionTooltip.remove();
        this.selectionTooltip = null;
      }
      clearTimeout(this.selectionTimeout);
    }

    // ===============================
    // QUICK ANALYSIS MODAL
    // ===============================

    async startQuickAnalysis(selectedText) {
      try {
        // Create modal if it doesn't exist
        if (!this.currentModal) {
          this.createAnalysisModal();
        }

        // Initialize state machine
        this.modalStateMachine = new ModalStateMachine(this.currentModal);
        this.modalStateMachine.initializeElements();
        
        // Set up custom state handlers
        this.setupModalStateHandlers();

        // Start analysis
        this.modalStateMachine.transition('analyzing', { text: selectedText });
        
        // Perform analysis
        const result = await this.analysisEngine.analyze(selectedText);
        
        // Show results
        this.modalStateMachine.transition('results', { 
          analysis: result, 
          originalText: selectedText 
        });

      } catch (error) {
        console.error('Quick analysis failed:', error);
        if (this.modalStateMachine) {
          this.modalStateMachine.transition('error', { 
            error: error.message,
            originalText: selectedText 
          });
        }
      }
    }

    createAnalysisModal() {
      this.currentModal = document.createElement('div');
      this.currentModal.className = 'ai-detector-analysis-modal';
      this.currentModal.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">AI Content Analysis</h3>
            <button class="close-btn" title="Close">&times;</button>
          </div>
          
          <div class="modal-body">
            <!-- Progress State -->
            <div class="progress-state analysis-state">
              <div class="progress-content">
                <div class="progress-spinner"></div>
                <div class="progress-text">
                  <h4>Analyzing text...</h4>
                  <p class="text-preview"></p>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill"></div>
                </div>
              </div>
            </div>

            <!-- Results State -->
            <div class="results-state analysis-state hidden">
              <div class="results-content"></div>
            </div>

            <!-- Error State -->
            <div class="error-state analysis-state hidden">
              <div class="error-content">
                <div class="error-icon">⚠️</div>
                <h4>Analysis Failed</h4>
                <p class="error-message"></p>
                <button class="retry-btn btn-primary">Try Again</button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Bind close handlers
      const closeBtn = this.currentModal.querySelector('.close-btn');
      const backdrop = this.currentModal.querySelector('.modal-backdrop');
      
      closeBtn.addEventListener('click', () => this.closeModal());
      backdrop.addEventListener('click', () => this.closeModal());
      
      // Escape key handler
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.modalStateMachine?.outsideClickEnabled) {
          this.closeModal();
        }
      });
    }

    setupModalStateHandlers() {
      // Override state machine methods for custom behavior
      const originalUpdateProgressText = this.modalStateMachine.updateProgressText;
      const originalUpdateResultsContent = this.modalStateMachine.updateResultsContent;
      const originalShowErrorState = this.modalStateMachine.showErrorState;

      this.modalStateMachine.updateProgressText = (text) => {
        const textPreview = this.currentModal.querySelector('.text-preview');
        if (textPreview) {
          textPreview.textContent = text.substring(0, 100) + (text.length > 100 ? '...' : '');
        }
        this.startProgressAnimation();
      };

      this.modalStateMachine.updateResultsContent = (analysis) => {
        const resultsContent = this.currentModal.querySelector('.results-content');
        if (resultsContent) {
          this.renderAnalysisResults(resultsContent, analysis);
        }
      };

      this.modalStateMachine.showErrorState = (data) => {
        const errorState = this.currentModal.querySelector('.error-state');
        const errorMessage = this.currentModal.querySelector('.error-message');
        const retryBtn = this.currentModal.querySelector('.retry-btn');
        
        if (errorState) {
          this.modalStateMachine.hideAllStates();
          errorState.classList.remove('hidden');
          
          if (errorMessage) {
            errorMessage.textContent = data.error || 'An unexpected error occurred';
          }
          
          if (retryBtn) {
            retryBtn.onclick = () => {
              if (data.originalText) {
                this.startQuickAnalysis(data.originalText);
              }
            };
          }
        }
      };
    }

    startProgressAnimation() {
      const progressFill = this.currentModal.querySelector('.progress-fill');
      if (progressFill) {
        progressFill.style.width = '0%';
        progressFill.style.transition = 'width 3s ease-in-out';
        setTimeout(() => {
          progressFill.style.width = '90%';
        }, 100);
      }
    }

    renderAnalysisResults(container, analysis) {
      const likelihoodColor = this.getLikelihoodColor(analysis.likelihood);
      const formattedReasoning = this.formatReasoning(analysis.reasoning);
      
      container.innerHTML = `
        <div class="analysis-results">
          <div class="result-header">
            <div class="likelihood-display">
              <div class="likelihood-circle" style="border-color: ${likelihoodColor}">
                <span class="likelihood-percentage">${Math.round(analysis.likelihood)}%</span>
                <span class="likelihood-label">AI Likelihood</span>
              </div>
              <div class="confidence-badge">
                <span class="confidence-label">Confidence</span>
                <span class="confidence-value">${Math.round(analysis.confidence)}%</span>
              </div>
            </div>
          </div>

          <div class="analysis-breakdown">
            <div class="reasoning-section">
              <h4>Analysis Reasoning</h4>
              <div class="reasoning-content">${formattedReasoning}</div>
            </div>

            ${analysis.statisticalBreakdown ? this.renderStatisticalBreakdown(analysis.statisticalBreakdown) : ''}
          </div>

          <div class="feedback-section">
            <div id="feedback-container"></div>
          </div>
        </div>
      `;

      // Initialize feedback component
      this.initializeFeedbackComponent(container, analysis);
    }

    initializeFeedbackComponent(container, analysis) {
      const feedbackContainer = container.querySelector('#feedback-container');
      if (!feedbackContainer) return;

      this.feedbackComponent = new FeedbackComponent({
        compact: false,
        showAnalysisSummary: false, // Already shown above
        autoHideSuccess: true
      });

      this.feedbackComponent
        .render(feedbackContainer, analysis)
        .onDetailedSubmit(async (feedbackData, analysisData) => {
          await this.handleFeedbackSubmission(feedbackData, analysisData);
        })
        .onSuccess(() => {
          // Auto-close modal after successful feedback
          setTimeout(() => this.closeModal(), 1500);
        });
    }

    async handleFeedbackSubmission(feedbackData, analysisData) {
      try {
        // Create feedback record
        const systemInfo = await this.gatherSystemInfo();
        const record = await this.feedbackManager.createFeedbackRecord(analysisData, systemInfo);
        
        // Submit feedback
        await this.feedbackManager.submitFeedback(record.id, feedbackData);
        
        console.log('Feedback submitted successfully');
      } catch (error) {
        console.error('Feedback submission failed:', error);
      }
    }

    async gatherSystemInfo() {
      return {
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        url: window.location.href,
        domain: window.location.hostname,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      };
    }

    renderStatisticalBreakdown(breakdown) {
      if (!breakdown) return '';
      
      return `
        <div class="statistical-breakdown">
          <h4>Statistical Analysis</h4>
          <div class="breakdown-metrics">
            ${Object.entries(breakdown).map(([key, value]) => `
              <div class="metric-item">
                <span class="metric-label">${this.formatMetricName(key)}</span>
                <span class="metric-value">${this.formatMetricValue(value)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    formatMetricName(key) {
      return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }

    formatMetricValue(value) {
      if (typeof value === 'number') {
        return value.toFixed(2);
      }
      return String(value);
    }

    formatReasoning(reasoning) {
      if (!reasoning) return 'No reasoning provided';
      
      return reasoning
        // Bold text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic text
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Line breaks
        .replace(/\n/g, '<br>')
        // Technical terms
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Quoted text
        .replace(/"([^"]+)"/g, '<span class="quoted-text">"$1"</span>')
        // Confidence indicators
        .replace(/(high|medium|low|very) confidence/gi, '<span class="confidence-indicator">$1 confidence</span>');
    }

    getLikelihoodColor(likelihood) {
      if (likelihood >= 70) return '#e74c3c'; // Red
      if (likelihood >= 40) return '#f39c12'; // Orange
      return '#27ae60'; // Green
    }

    closeModal() {
      if (this.modalStateMachine) {
        this.modalStateMachine.transition('idle');
        this.modalStateMachine = null;
      }
      
      if (this.currentModal) {
        this.currentModal.remove();
        this.currentModal = null;
      }
      
      this.feedbackComponent = null;
    }

    // ===============================
    // STYLES
    // ===============================

    injectStyles() {
      if (document.getElementById('ai-detector-content-styles')) return;
      
      const styleSheet = document.createElement('style');
      styleSheet.id = 'ai-detector-content-styles';
      styleSheet.textContent = this.getContentStyles();
      document.head.appendChild(styleSheet);
    }

    getContentStyles() {
      return `
        /* Selection Tooltip */
        .ai-detector-selection-tooltip {
          position: absolute;
          background: #1a1a1a;
          border: 2px solid #4a9eff;
          border-radius: 8px;
          padding: 8px 12px;
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          animation: tooltipFadeIn 0.2s ease-out;
        }

        .ai-detector-selection-tooltip .tooltip-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ai-detector-selection-tooltip .quick-analyze-btn {
          background: linear-gradient(135deg, #4a9eff, #0066cc);
          color: white;
          border: none;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s ease;
        }

        .ai-detector-selection-tooltip .quick-analyze-btn:hover {
          background: linear-gradient(135deg, #0066cc, #004499);
          transform: translateY(-1px);
        }

        .ai-detector-selection-tooltip .keyboard-hint {
          font-size: 10px;
          color: #888;
          white-space: nowrap;
        }

        .ai-detector-selection-tooltip .tooltip-arrow {
          position: absolute;
          top: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-bottom: 6px solid #4a9eff;
        }

        @keyframes tooltipFadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(5px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        /* Analysis Modal */
        .ai-detector-analysis-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 100000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .ai-detector-analysis-modal .modal-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
        }

        .ai-detector-analysis-modal .modal-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 500px;
          width: 90vw;
          max-height: 80vh;
          overflow: hidden;
          animation: modalSlideIn 0.3s ease-out;
        }

        @keyframes modalSlideIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }

        .ai-detector-analysis-modal .modal-header {
          background: linear-gradient(135deg, #4a9eff, #0066cc);
          color: white;
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .ai-detector-analysis-modal .modal-title {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .ai-detector-analysis-modal .close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .ai-detector-analysis-modal .close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .ai-detector-analysis-modal .modal-body {
          padding: 20px;
          overflow-y: auto;
          max-height: calc(80vh - 60px);
        }

        .ai-detector-analysis-modal .analysis-state.hidden {
          display: none;
        }

        /* Progress State */
        .ai-detector-analysis-modal .progress-content {
          text-align: center;
          padding: 20px 0;
        }

        .ai-detector-analysis-modal .progress-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #f0f0f0;
          border-top: 3px solid #4a9eff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .ai-detector-analysis-modal .text-preview {
          color: #666;
          font-size: 14px;
          margin: 8px 0;
          line-height: 1.4;
        }

        .ai-detector-analysis-modal .progress-bar {
          width: 100%;
          height: 4px;
          background: #f0f0f0;
          border-radius: 2px;
          overflow: hidden;
          margin-top: 16px;
        }

        .ai-detector-analysis-modal .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4a9eff, #0066cc);
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        /* Results State */
        .ai-detector-analysis-modal .result-header {
          margin-bottom: 20px;
        }

        .ai-detector-analysis-modal .likelihood-display {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 16px;
        }

        .ai-detector-analysis-modal .likelihood-circle {
          width: 80px;
          height: 80px;
          border: 4px solid;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: white;
        }

        .ai-detector-analysis-modal .likelihood-percentage {
          font-size: 18px;
          font-weight: bold;
          color: #333;
        }

        .ai-detector-analysis-modal .likelihood-label {
          font-size: 10px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .ai-detector-analysis-modal .confidence-badge {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .ai-detector-analysis-modal .confidence-label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .ai-detector-analysis-modal .confidence-value {
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .ai-detector-analysis-modal .reasoning-section {
          margin-bottom: 20px;
        }

        .ai-detector-analysis-modal .reasoning-section h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #333;
          font-weight: 600;
        }

        .ai-detector-analysis-modal .reasoning-content {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 12px;
          font-size: 14px;
          line-height: 1.5;
          color: #555;
        }

        .ai-detector-analysis-modal .reasoning-content strong {
          color: #333;
        }

        .ai-detector-analysis-modal .reasoning-content .quoted-text {
          background: #e3f2fd;
          padding: 2px 4px;
          border-radius: 3px;
          font-style: italic;
        }

        .ai-detector-analysis-modal .reasoning-content .confidence-indicator {
          background: #4a9eff;
          color: white;
          padding: 2px 6px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .ai-detector-analysis-modal .reasoning-content code {
          background: #f0f0f0;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 13px;
        }

        .ai-detector-analysis-modal .statistical-breakdown {
          margin-bottom: 20px;
        }

        .ai-detector-analysis-modal .statistical-breakdown h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #333;
          font-weight: 600;
        }

        .ai-detector-analysis-modal .breakdown-metrics {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .ai-detector-analysis-modal .metric-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8f9fa;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
        }

        .ai-detector-analysis-modal .metric-label {
          color: #666;
          font-weight: 500;
        }

        .ai-detector-analysis-modal .metric-value {
          color: #333;
          font-weight: 600;
        }

        /* Error State */
        .ai-detector-analysis-modal .error-content {
          text-align: center;
          padding: 20px 0;
        }

        .ai-detector-analysis-modal .error-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .ai-detector-analysis-modal .error-content h4 {
          margin: 0 0 8px 0;
          color: #e74c3c;
          font-size: 16px;
        }

        .ai-detector-analysis-modal .error-message {
          color: #666;
          margin-bottom: 20px;
          line-height: 1.4;
        }

        .ai-detector-analysis-modal .retry-btn {
          background: #4a9eff;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .ai-detector-analysis-modal .retry-btn:hover {
          background: #0066cc;
        }

        /* Feedback Component Styles */
        .ai-detector-analysis-modal .feedback-component {
          border-top: 1px solid #e0e0e0;
          padding-top: 20px;
          margin-top: 20px;
        }

        .ai-detector-analysis-modal .feedback-header {
          margin-bottom: 16px;
        }

        .ai-detector-analysis-modal .feedback-title {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
        }

        .ai-detector-analysis-modal .feedback-subtitle {
          font-size: 12px;
          color: #666;
        }

        .ai-detector-analysis-modal .feedback-rating {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .ai-detector-analysis-modal .feedback-btn {
          flex: 1;
          background: #f8f9fa;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
        }

        .ai-detector-analysis-modal .feedback-btn:hover {
          border-color: #4a9eff;
          background: #f0f8ff;
        }

        .ai-detector-analysis-modal .feedback-btn.selected {
          border-color: #4a9eff;
          background: #4a9eff;
          color: white;
        }

        .ai-detector-analysis-modal .feedback-icon {
          font-size: 16px;
        }

        .ai-detector-analysis-modal .feedback-details {
          margin-top: 16px;
        }

        .ai-detector-analysis-modal .feedback-form-section {
          margin-bottom: 20px;
        }

        .ai-detector-analysis-modal .feedback-form-title {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
        }

        .ai-detector-analysis-modal .correction-slider-container {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
        }

        .ai-detector-analysis-modal .slider-labels {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 12px;
          color: #666;
        }

        .ai-detector-analysis-modal .correction-slider {
          width: 100%;
          margin: 8px 0;
        }

        .ai-detector-analysis-modal .slider-value {
          text-align: center;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .ai-detector-analysis-modal .feedback-reasons {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ai-detector-analysis-modal .reason-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .ai-detector-analysis-modal .reason-checkbox:hover {
          background: #f0f8ff;
        }

        .ai-detector-analysis-modal .reason-checkbox.selected {
          background: #e3f2fd;
        }

        .ai-detector-analysis-modal .confidence-buttons {
          display: flex;
          gap: 8px;
        }

        .ai-detector-analysis-modal .confidence-btn {
          flex: 1;
          background: #f8f9fa;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .ai-detector-analysis-modal .confidence-btn:hover {
          border-color: #4a9eff;
          background: #f0f8ff;
        }

        .ai-detector-analysis-modal .confidence-btn.selected {
          border-color: #4a9eff;
          background: #4a9eff;
          color: white;
        }

        .ai-detector-analysis-modal .feedback-submit-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        .ai-detector-analysis-modal .btn-primary {
          flex: 1;
          background: #4a9eff;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .ai-detector-analysis-modal .btn-primary:hover {
          background: #0066cc;
        }

        .ai-detector-analysis-modal .btn-secondary {
          background: #f8f9fa;
          color: #666;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 10px 16px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .ai-detector-analysis-modal .btn-secondary:hover {
          background: #e0e0e0;
          color: #333;
        }

        .ai-detector-analysis-modal .feedback-status {
          text-align: center;
          padding: 20px;
          background: #f0f8ff;
          border-radius: 8px;
          margin-top: 16px;
        }

        .ai-detector-analysis-modal .status-text {
          color: #4a9eff;
          font-weight: 500;
          font-size: 14px;
        }
      `;
    }
  }

  // Initialize the modern content analyzer
  new ModernContentAnalyzer();
} 
/**
 * Feedback UI Components for AI Content Detector
 * Creates and manages feedback collection interfaces
 */

export class FeedbackUI {
  constructor(feedbackManager) {
    this.feedbackManager = feedbackManager;
    this.currentRecordId = null;
    this.feedbackReasons = {
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
  }

  /**
   * Create feedback widget for popup analysis results
   */
  createPopupFeedbackWidget(recordId) {
    this.currentRecordId = recordId;
    
    const widget = document.createElement('div');
    widget.className = 'feedback-widget';
    widget.innerHTML = this.getFeedbackWidgetHTML();
    
    this.bindFeedbackEvents(widget);
    
    // Show motivation message if first time
    if (this.feedbackManager.currentSession.showMotivationMessage) {
      this.showMotivationMessage(widget);
    }
    
    return widget;
  }

  /**
   * Create compact feedback widget for quick analysis overlay
   */
  createOverlayFeedbackWidget(recordId) {
    this.currentRecordId = recordId;
    
    const widget = document.createElement('div');
    widget.className = 'feedback-widget feedback-compact';
    widget.innerHTML = this.getCompactFeedbackHTML();
    
    this.bindFeedbackEvents(widget);
    
    return widget;
  }

  /**
   * Generate feedback widget HTML
   */
  getFeedbackWidgetHTML() {
    return `
      <div class="feedback-section">
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
      </div>
    `;
  }

  /**
   * Generate compact feedback widget HTML for overlay
   */
  getCompactFeedbackHTML() {
    return `
      <div class="feedback-section-compact">
        <div class="feedback-rating-compact">
          <span class="feedback-prompt">Accurate?</span>
          <button class="feedback-btn-compact feedback-thumbs-up" data-rating="thumbs_up" title="Accurate">👍</button>
          <button class="feedback-btn-compact feedback-thumbs-down" data-rating="thumbs_down" title="Incorrect">👎</button>
        </div>
        <div class="feedback-details-compact hidden"></div>
        <div class="feedback-status-compact hidden">✓ Thanks!</div>
      </div>
    `;
  }

  /**
   * Show motivation message for first-time users
   */
  showMotivationMessage(widget) {
    const motivationDiv = document.createElement('div');
    motivationDiv.className = 'feedback-motivation';
    motivationDiv.innerHTML = `
      <div class="motivation-content">
        <div class="motivation-icon">🎯</div>
        <div class="motivation-text">
          <strong>Help improve your local AI detection!</strong><br>
          Your feedback trains the model to better understand your content and preferences.
          All data stays private and anonymous.
        </div>
        <button class="motivation-close" title="Got it">×</button>
      </div>
    `;

    // Insert before feedback section
    widget.insertBefore(motivationDiv, widget.firstChild);

    // Bind close event
    motivationDiv.querySelector('.motivation-close').addEventListener('click', () => {
      motivationDiv.remove();
      this.feedbackManager.markMotivationMessageSeen();
    });

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (motivationDiv.parentNode) {
        motivationDiv.remove();
        this.feedbackManager.markMotivationMessageSeen();
      }
    }, 10000);
  }

  /**
   * Bind event handlers to feedback elements
   */
  bindFeedbackEvents(widget) {
    // Rating buttons
    const ratingButtons = widget.querySelectorAll('[data-rating]');
    ratingButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const rating = e.currentTarget.dataset.rating;
        this.handleRatingClick(rating, widget);
      });
    });
  }

  /**
   * Handle rating button clicks
   */
  async handleRatingClick(rating, widget) {
    const isCompact = widget.classList.contains('feedback-compact');
    
    // Disable rating buttons
    const ratingButtons = widget.querySelectorAll('[data-rating]');
    ratingButtons.forEach(btn => btn.disabled = true);

    if (rating === 'thumbs_up') {
      // Simple positive feedback
      await this.submitFeedback({ rating });
      this.showFeedbackStatus(widget, 'positive');
    } else {
      // Show detailed feedback form for negative ratings
      this.showDetailedFeedback(widget, isCompact);
    }
  }

  /**
   * Show detailed feedback form for thumbs down
   */
  showDetailedFeedback(widget, isCompact) {
    const detailsContainer = widget.querySelector(isCompact ? '.feedback-details-compact' : '.feedback-details');
    
    const detailsHTML = isCompact ? this.getCompactDetailsHTML() : this.getFullDetailsHTML();
    detailsContainer.innerHTML = detailsHTML;
    detailsContainer.classList.remove('hidden');

    // Bind events for detailed form
    this.bindDetailedFormEvents(detailsContainer, widget, isCompact);
  }

  /**
   * Get full detailed feedback form HTML
   */
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

  /**
   * Get compact detailed feedback form HTML
   */
  getCompactDetailsHTML() {
    return `
      <div class="feedback-correction-compact">
        <div class="correction-slider-container-compact">
          <label class="correction-label-compact">AI %:</label>
          <input type="range" class="correction-slider-compact" min="0" max="100" value="50" id="aiPercentageSliderCompact">
          <span class="correction-value-compact" id="aiPercentageValueCompact">50%</span>
        </div>
      </div>

      <div class="feedback-reasons-compact">
        <select class="reason-select-compact">
          <option value="">Why incorrect?</option>
          <optgroup label="Said AI, but human:">
            ${this.generateReasonOptions('falsePositive')}
          </optgroup>
          <optgroup label="Said human, but AI:">
            ${this.generateReasonOptions('falseNegative')}
          </optgroup>
          <optgroup label="Other issues:">
            ${this.generateReasonOptions('analysisIssues')}
          </optgroup>
        </select>
      </div>

      <div class="feedback-actions-compact">
        <button class="feedback-submit-btn-compact">Send</button>
        <button class="feedback-skip-btn-compact">Skip</button>
      </div>
    `;
  }

  /**
   * Generate reason checkboxes
   */
  generateReasonCheckboxes(category) {
    return this.feedbackReasons[category]
      .map((reason, index) => `
        <label class="reason-checkbox">
          <input type="checkbox" value="${reason}" data-category="${category}">
          <span class="checkbox-text">${reason}</span>
        </label>
      `).join('');
  }

  /**
   * Generate reason options for select dropdown
   */
  generateReasonOptions(category) {
    return this.feedbackReasons[category]
      .map(reason => `<option value="${reason}">${reason}</option>`)
      .join('');
  }

  /**
   * Bind events for detailed feedback form
   */
  bindDetailedFormEvents(container, widget, isCompact) {
    const sliderSelector = isCompact ? '.correction-slider-compact' : '.correction-slider';
    const submitSelector = isCompact ? '.feedback-submit-btn-compact' : '.feedback-submit-btn';
    const skipSelector = isCompact ? '.feedback-skip-btn-compact' : '.feedback-skip-btn';

    // Slider events
    const slider = container.querySelector(sliderSelector);
    if (slider) {
      slider.addEventListener('input', (e) => {
        this.updateSliderLabels(e.target.value, isCompact);
      });
    }

    // Confidence buttons (full version only)
    if (!isCompact) {
      const confidenceButtons = container.querySelectorAll('.confidence-btn');
      confidenceButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          confidenceButtons.forEach(b => b.classList.remove('selected'));
          e.target.classList.add('selected');
        });
      });
    }

    // Submit button
    const submitBtn = container.querySelector(submitSelector);
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        this.submitDetailedFeedback(container, widget, isCompact);
      });
    }

    // Skip button
    const skipBtn = container.querySelector(skipSelector);
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        this.skipFeedback(widget);
      });
    }
  }

  /**
   * Update slider value labels
   */
  updateSliderLabels(value, isCompact) {
    const aiValue = parseInt(value);
    const humanValue = 100 - aiValue;

    if (isCompact) {
      const valueSpan = document.getElementById('aiPercentageValueCompact');
      if (valueSpan) valueSpan.textContent = `${aiValue}%`;
    } else {
      const aiSpan = document.getElementById('aiPercentageValue');
      const humanSpan = document.getElementById('humanPercentageValue');
      if (aiSpan) aiSpan.textContent = aiValue;
      if (humanSpan) humanSpan.textContent = humanValue;
    }
  }

  /**
   * Submit detailed feedback
   */
  async submitDetailedFeedback(container, widget, isCompact) {
    const sliderSelector = isCompact ? '.correction-slider-compact' : '.correction-slider';
    const slider = container.querySelector(sliderSelector);
    const aiPercentage = slider ? parseInt(slider.value) : 50;

    let selectedReasons = [];
    let confidence = 'medium';

    if (isCompact) {
      const reasonSelect = container.querySelector('.reason-select-compact');
      if (reasonSelect && reasonSelect.value) {
        selectedReasons = [reasonSelect.value];
      }
    } else {
      const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
      selectedReasons = Array.from(checkboxes).map(cb => cb.value);

      const selectedConfidenceBtn = container.querySelector('.confidence-btn.selected');
      if (selectedConfidenceBtn) {
        confidence = selectedConfidenceBtn.dataset.confidence;
      }
    }

    const feedbackData = {
      rating: 'thumbs_down',
      correction: {
        aiPercentage: aiPercentage,
        humanPercentage: 100 - aiPercentage,
        confidence: confidence === 'low' ? 25 : confidence === 'high' ? 75 : 50
      },
      reasons: selectedReasons
    };

    await this.submitFeedback(feedbackData);
    this.showFeedbackStatus(widget, 'negative');
  }

  /**
   * Skip feedback
   */
  skipFeedback(widget) {
    this.showFeedbackStatus(widget, 'skipped');
  }

  /**
   * Submit feedback to manager
   */
  async submitFeedback(feedbackData) {
    try {
      if (this.currentRecordId) {
        await this.feedbackManager.updateFeedback(this.currentRecordId, feedbackData);
        console.log('Feedback submitted successfully');
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  }

  /**
   * Show feedback status message
   */
  showFeedbackStatus(widget, type) {
    const isCompact = widget.classList.contains('feedback-compact');
    const statusSelector = isCompact ? '.feedback-status-compact' : '.feedback-status';
    const detailsSelector = isCompact ? '.feedback-details-compact' : '.feedback-details';
    const ratingSelector = isCompact ? '.feedback-rating-compact' : '.feedback-rating';

    // Hide rating and details
    const rating = widget.querySelector(ratingSelector);
    const details = widget.querySelector(detailsSelector);
    const status = widget.querySelector(statusSelector);

    if (rating) rating.style.display = 'none';
    if (details) details.classList.add('hidden');
    if (status) {
      status.classList.remove('hidden');
      
      if (type === 'positive') {
        status.innerHTML = isCompact ? '✓ Thanks!' : '✓ Feedback received. Thank you!';
      } else if (type === 'negative') {
        status.innerHTML = isCompact ? '✓ Helpful!' : '✓ Detailed feedback received. This helps improve accuracy!';
      } else {
        status.innerHTML = isCompact ? '○ Skipped' : '○ Feedback skipped';
      }
    }

    // Auto-hide after delay
    setTimeout(() => {
      if (widget.parentNode) {
        widget.style.opacity = '0.5';
      }
    }, 3000);
  }

  /**
   * Get CSS styles for feedback components
   */
  static getFeedbackCSS() {
    return `
      .feedback-widget {
        margin-top: 16px;
        padding: 16px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
      }

      .feedback-motivation {
        margin-bottom: 16px;
        padding: 12px;
        background: linear-gradient(135deg, #dbeafe 0%, #fef3c7 100%);
        border: 1px solid #93c5fd;
        border-radius: 8px;
        position: relative;
      }

      .motivation-content {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }

      .motivation-icon {
        font-size: 20px;
        line-height: 1;
      }

      .motivation-text {
        flex: 1;
        font-size: 12px;
        line-height: 1.4;
        color: #1e40af;
      }

      .motivation-close {
        background: none;
        border: none;
        font-size: 16px;
        color: #6b7280;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
      }

      .motivation-close:hover {
        background: rgba(0, 0, 0, 0.1);
      }

      .feedback-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .feedback-header {
        text-align: center;
      }

      .feedback-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
        display: block;
        margin-bottom: 4px;
      }

      .feedback-subtitle {
        font-size: 11px;
        color: var(--text-secondary);
        display: block;
      }

      .feedback-rating {
        display: flex;
        gap: 8px;
        justify-content: center;
      }

      .feedback-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 12px 16px;
        background: white;
        border: 1px solid var(--border);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        flex: 1;
      }

      .feedback-btn:hover {
        border-color: var(--primary-color);
        background: var(--surface);
      }

      .feedback-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .feedback-icon {
        font-size: 18px;
        line-height: 1;
      }

      .feedback-label {
        font-size: 11px;
        color: var(--text-secondary);
        font-weight: 500;
      }

      .feedback-details {
        margin-top: 8px;
        padding: 16px;
        background: var(--background);
        border-radius: 8px;
        border: 1px solid var(--border);
      }

      .feedback-correction {
        margin-bottom: 16px;
      }

      .correction-header {
        margin-bottom: 8px;
      }

      .correction-title {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .correction-slider-container {
        margin: 8px 0;
      }

      .correction-slider {
        width: 100%;
        margin: 8px 0;
      }

      .correction-labels {
        text-align: center;
        margin-top: 8px;
      }

      .correction-value {
        font-size: 12px;
        color: var(--text-secondary);
        font-weight: 500;
      }

      .feedback-reasons {
        margin-bottom: 16px;
      }

      .reasons-header {
        margin-bottom: 12px;
      }

      .reasons-title {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .reason-category {
        margin-bottom: 12px;
      }

      .category-title {
        font-size: 11px;
        color: var(--text-secondary);
        font-weight: 500;
        display: block;
        margin-bottom: 6px;
      }

      .reason-checkbox {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 4px;
        cursor: pointer;
        font-size: 11px;
        color: var(--text-secondary);
      }

      .reason-checkbox input[type="checkbox"] {
        margin: 0;
      }

      .feedback-confidence {
        margin-bottom: 16px;
      }

      .confidence-title {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-primary);
        display: block;
        margin-bottom: 8px;
      }

      .confidence-buttons {
        display: flex;
        gap: 6px;
      }

      .confidence-btn {
        flex: 1;
        padding: 6px 12px;
        background: white;
        border: 1px solid var(--border);
        border-radius: 6px;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .confidence-btn:hover {
        border-color: var(--primary-color);
      }

      .confidence-btn.selected {
        background: var(--primary-color);
        color: white;
        border-color: var(--primary-color);
      }

      .feedback-actions {
        display: flex;
        gap: 8px;
      }

      .feedback-submit-btn {
        flex: 1;
        padding: 8px 16px;
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.2s ease;
      }

      .feedback-submit-btn:hover {
        background: var(--primary-hover);
      }

      .feedback-skip-btn {
        padding: 8px 16px;
        background: transparent;
        color: var(--text-secondary);
        border: 1px solid var(--border);
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .feedback-skip-btn:hover {
        background: var(--surface);
        border-color: var(--text-secondary);
      }

      .feedback-status {
        text-align: center;
        padding: 12px;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 6px;
      }

      .status-text {
        font-size: 12px;
        color: #059669;
        font-weight: 500;
      }

      /* Compact feedback styles */
      .feedback-compact {
        margin: 8px 0;
        padding: 8px;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid #e5e7eb;
        border-radius: 6px;
      }

      .feedback-section-compact {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .feedback-rating-compact {
        display: flex;
        align-items: center;
        gap: 6px;
        justify-content: center;
      }

      .feedback-prompt {
        font-size: 10px;
        color: #6b7280;
        font-weight: 500;
      }

      .feedback-btn-compact {
        background: white;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        padding: 4px 6px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .feedback-btn-compact:hover {
        border-color: #6b7280;
        background: #f9fafb;
      }

      .feedback-btn-compact:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .feedback-details-compact {
        padding: 8px;
        background: #f9fafb;
        border-radius: 4px;
        border: 1px solid #e5e7eb;
      }

      .feedback-correction-compact {
        margin-bottom: 8px;
      }

      .correction-slider-container-compact {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .correction-label-compact {
        font-size: 10px;
        color: #6b7280;
        font-weight: 500;
        min-width: 30px;
      }

      .correction-slider-compact {
        flex: 1;
        height: 4px;
      }

      .correction-value-compact {
        font-size: 10px;
        color: #374151;
        font-weight: 600;
        min-width: 35px;
        text-align: right;
      }

      .feedback-reasons-compact {
        margin-bottom: 8px;
      }

      .reason-select-compact {
        width: 100%;
        padding: 4px 6px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 10px;
        background: white;
      }

      .feedback-actions-compact {
        display: flex;
        gap: 4px;
        justify-content: flex-end;
      }

      .feedback-submit-btn-compact,
      .feedback-skip-btn-compact {
        padding: 4px 8px;
        font-size: 10px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .feedback-submit-btn-compact {
        background: #3b82f6;
        color: white;
        border: none;
      }

      .feedback-submit-btn-compact:hover {
        background: #2563eb;
      }

      .feedback-skip-btn-compact {
        background: white;
        color: #6b7280;
        border: 1px solid #d1d5db;
      }

      .feedback-skip-btn-compact:hover {
        background: #f9fafb;
        border-color: #9ca3af;
      }

      .feedback-status-compact {
        text-align: center;
        padding: 6px;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 4px;
        font-size: 10px;
        color: #059669;
        font-weight: 500;
      }

      .hidden {
        display: none !important;
      }
    `;
  }
}

export default FeedbackUI; 
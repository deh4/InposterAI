/**
 * Reusable Feedback Component
 * Renders feedback UI and handles interactions consistently across the extension
 */

/* global setTimeout */

export class FeedbackComponent {
  constructor(options = {}) {
    this.options = {
      compact: false,
      showAnalysisSummary: true,
      autoHideSuccess: true,
      successTimeout: 2000,
      ...options
    };
    
    this.state = {
      rating: null,
      showingDetails: false,
      submitted: false
    };
    
    this.callbacks = {
      onRating: null,
      onDetailedSubmit: null,
      onSkip: null,
      onSuccess: null
    };

    this.container = null;
    this.analysisData = null;
  }

  /**
   * Render feedback component
   */
  render(container, analysisData) {
    this.container = container;
    this.analysisData = analysisData;
    
    const html = this.options.compact ? 
      this.renderCompactFeedback() : 
      this.renderFullFeedback();
    
    container.innerHTML = html;
    this.bindEvents();
    
    return this;
  }

  /**
   * Render full feedback interface
   */
  renderFullFeedback() {
    return `
      <div class="feedback-component">
        ${this.options.showAnalysisSummary ? this.renderAnalysisSummary() : ''}
        
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
          ${this.renderDetailedForm()}
        </div>

        <div class="feedback-status hidden">
          <span class="status-text">✓ Feedback received. Thank you!</span>
        </div>
      </div>
    `;
  }

  /**
   * Render compact feedback interface
   */
  renderCompactFeedback() {
    return `
      <div class="feedback-component feedback-compact">
        <div class="feedback-rating-compact">
          <button class="feedback-btn-compact thumbs-up" data-rating="thumbs_up">👍</button>
          <button class="feedback-btn-compact thumbs-down" data-rating="thumbs_down">👎</button>
        </div>
        
        <div class="feedback-details-compact hidden">
          ${this.renderCompactForm()}
        </div>
        
        <div class="feedback-status-compact hidden">
          <span class="status-text">✓ Thank you!</span>
        </div>
      </div>
    `;
  }

  /**
   * Render analysis summary
   */
  renderAnalysisSummary() {
    if (!this.analysisData) return '';
    
    return `
      <div class="analysis-summary">
        <div class="summary-item">
          <span class="summary-label">Our Analysis:</span>
          <span class="summary-value">${Math.round(this.analysisData.likelihood)}% AI-generated</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Confidence:</span>
          <span class="summary-value">${Math.round(this.analysisData.confidence)}%</span>
        </div>
      </div>
    `;
  }

  /**
   * Render detailed feedback form
   */
  renderDetailedForm() {
    return `
      <div class="feedback-form">
        <div class="feedback-form-section">
          <span class="feedback-form-title">What should the correct analysis be?</span>
          <div class="correction-slider-container">
            <div class="slider-labels">
              <span class="ai-label">AI Generated</span>
              <span class="human-label">Human Written</span>
            </div>
            <input type="range" class="correction-slider" min="0" max="100" value="${100 - (this.analysisData?.likelihood || 50)}" />
            <div class="slider-value">
              <span class="ai-percentage">${this.analysisData?.likelihood || 50}%</span> AI / 
              <span class="human-percentage">${100 - (this.analysisData?.likelihood || 50)}%</span> Human
            </div>
          </div>
        </div>
        
        <div class="feedback-form-section">
          <span class="feedback-form-title">What went wrong? (Select all that apply)</span>
          <div class="feedback-reasons">
            ${this.renderReasonCheckboxes()}
          </div>
        </div>
        
        <div class="feedback-form-section">
          <span class="feedback-form-title">How confident are you?</span>
          <div class="confidence-buttons">
            <button class="confidence-btn" data-confidence="low">Low</button>
            <button class="confidence-btn" data-confidence="medium">Medium</button>
            <button class="confidence-btn" data-confidence="high">High</button>
          </div>
        </div>
        
        <div class="feedback-submit-actions">
          <button class="btn-primary submit-detailed-btn">Submit Feedback</button>
          <button class="btn-secondary skip-feedback-btn">Skip</button>
        </div>
      </div>
    `;
  }

  /**
   * Render compact feedback form
   */
  renderCompactForm() {
    return `
      <div class="feedback-form-compact">
        <div class="slider-container-compact">
          <input type="range" class="correction-slider-compact" min="0" max="100" value="50" />
          <div class="slider-labels-compact">
            <span class="ai-compact">AI</span>
            <span class="human-compact">Human</span>
          </div>
        </div>
        
        <select class="reason-select-compact">
          <option value="">Select reason...</option>
          <option value="wrong-analysis">Analysis was wrong</option>
          <option value="poor-reasoning">Poor reasoning</option>
          <option value="confidence-issue">Confidence too high/low</option>
          <option value="statistical-failure">Statistical analysis failed</option>
        </select>
        
        <div class="compact-actions">
          <button class="btn-compact submit-compact">Submit</button>
          <button class="btn-compact skip-compact">Skip</button>
        </div>
      </div>
    `;
  }

  /**
   * Render reason checkboxes
   */
  renderReasonCheckboxes() {
    const reasons = [
      'Analysis was wrong',
      'Poor reasoning quality',
      'Incorrect confidence level',
      'Statistical analysis failed',
      'Model seems biased'
    ];

    return reasons.map(reason => `
      <label class="reason-checkbox">
        <input type="checkbox" value="${reason}">
        <span class="checkbox-text">${reason}</span>
      </label>
    `).join('');
  }

  /**
   * Bind event handlers
   */
  bindEvents() {
    if (!this.container) return;

    // Rating buttons
    const ratingBtns = this.container.querySelectorAll('[data-rating]');
    ratingBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleRating(e.target.dataset.rating));
    });

    // Correction slider
    const slider = this.container.querySelector('.correction-slider, .correction-slider-compact');
    if (slider) {
      slider.addEventListener('input', (e) => this.handleSliderChange(e.target.value));
    }

    // Reason checkboxes
    const checkboxes = this.container.querySelectorAll('.reason-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('click', () => this.handleReasonToggle(checkbox));
    });

    // Confidence buttons
    const confidenceBtns = this.container.querySelectorAll('.confidence-btn');
    confidenceBtns.forEach(btn => {
      btn.addEventListener('click', () => this.handleConfidenceSelect(btn));
    });

    // Submit/Skip buttons
    const submitBtn = this.container.querySelector('.submit-detailed-btn, .submit-compact');
    const skipBtn = this.container.querySelector('.skip-feedback-btn, .skip-compact');
    
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.handleSubmit());
    }
    
    if (skipBtn) {
      skipBtn.addEventListener('click', () => this.handleSkip());
    }
  }

  /**
   * Handle rating selection
   */
  handleRating(rating) {
    this.state.rating = rating;
    
    // Update UI
    const ratingBtns = this.container.querySelectorAll('[data-rating]');
    ratingBtns.forEach(btn => btn.classList.remove('selected'));
    
    const selectedBtn = this.container.querySelector(`[data-rating="${rating}"]`);
    if (selectedBtn) {
      selectedBtn.classList.add('selected');
    }

    if (rating === 'thumbs_up') {
      this.submitQuickFeedback(rating);
    } else {
      this.showDetailedForm();
    }

    // Callback
    if (this.callbacks.onRating) {
      this.callbacks.onRating(rating, this.analysisData);
    }
  }

  /**
   * Handle slider value change
   */
  handleSliderChange(value) {
    const aiPercentage = 100 - parseInt(value);
    const humanPercentage = parseInt(value);
    
    // Update display
    const aiSpan = this.container.querySelector('.ai-percentage');
    const humanSpan = this.container.querySelector('.human-percentage');
    
    if (aiSpan) aiSpan.textContent = `${aiPercentage}%`;
    if (humanSpan) humanSpan.textContent = `${humanPercentage}%`;
  }

  /**
   * Handle reason checkbox toggle
   */
  handleReasonToggle(checkbox) {
    checkbox.classList.toggle('selected');
  }

  /**
   * Handle confidence selection
   */
  handleConfidenceSelect(btn) {
    // Remove selected from all confidence buttons
    const confidenceBtns = this.container.querySelectorAll('.confidence-btn');
    confidenceBtns.forEach(b => b.classList.remove('selected'));
    
    // Add selected to clicked button
    btn.classList.add('selected');
  }

  /**
   * Submit quick feedback (thumbs up)
   */
  submitQuickFeedback(rating) {
    const feedbackData = {
      rating: rating,
      confidence: 'high',
      reasons: [],
      correction: null
    };

    this.submitFeedback(feedbackData);
  }

  /**
   * Show detailed feedback form
   */
  showDetailedForm() {
    this.state.showingDetails = true;
    
    const detailsContainer = this.container.querySelector('.feedback-details, .feedback-details-compact');
    if (detailsContainer) {
      detailsContainer.classList.remove('hidden');
    }
  }

  /**
   * Handle detailed form submission
   */
  handleSubmit() {
    const feedbackData = this.collectDetailedFeedback();
    this.submitFeedback(feedbackData);
    
    // Callback
    if (this.callbacks.onDetailedSubmit) {
      this.callbacks.onDetailedSubmit(feedbackData, this.analysisData);
    }
  }

  /**
   * Handle skip
   */
  handleSkip() {
    this.hideDetailedForm();
    this.resetState();
    
    // Callback
    if (this.callbacks.onSkip) {
      this.callbacks.onSkip();
    }
  }

  /**
   * Collect detailed feedback data
   */
  collectDetailedFeedback() {
    const slider = this.container.querySelector('.correction-slider, .correction-slider-compact');
    const selectedReasons = Array.from(this.container.querySelectorAll('.reason-checkbox.selected input, .reason-select-compact'))
      .map(input => input.value)
      .filter(value => value);
    const selectedConfidence = this.container.querySelector('.confidence-btn.selected');
    
    return {
      rating: this.state.rating,
      correction: slider ? parseInt(slider.value) : null,
      reasons: selectedReasons,
      confidence: selectedConfidence ? selectedConfidence.dataset.confidence : 'medium'
    };
  }

  /**
   * Submit feedback
   */
  submitFeedback(feedbackData) {
    this.state.submitted = true;
    this.showSuccess();
    
    // Callback
    if (this.callbacks.onDetailedSubmit) {
      this.callbacks.onDetailedSubmit(feedbackData, this.analysisData);
    }
  }

  /**
   * Show success message
   */
  showSuccess() {
    const ratingContainer = this.container.querySelector('.feedback-rating, .feedback-rating-compact');
    const detailsContainer = this.container.querySelector('.feedback-details, .feedback-details-compact');
    const statusContainer = this.container.querySelector('.feedback-status, .feedback-status-compact');
    
    // Hide rating and details
    if (ratingContainer) ratingContainer.style.display = 'none';
    if (detailsContainer) detailsContainer.classList.add('hidden');
    
    // Show success
    if (statusContainer) statusContainer.classList.remove('hidden');
    
    // Auto-hide and reset
    if (this.options.autoHideSuccess) {
      setTimeout(() => {
        this.resetToInitialState();
        if (this.callbacks.onSuccess) {
          this.callbacks.onSuccess();
        }
      }, this.options.successTimeout);
    }
  }

  /**
   * Hide detailed form
   */
  hideDetailedForm() {
    const detailsContainer = this.container.querySelector('.feedback-details, .feedback-details-compact');
    if (detailsContainer) {
      detailsContainer.classList.add('hidden');
    }
    this.state.showingDetails = false;
  }

  /**
   * Reset component state
   */
  resetState() {
    this.state = {
      rating: null,
      showingDetails: false,
      submitted: false
    };
    
    // Clear UI selections
    const selected = this.container.querySelectorAll('.selected');
    selected.forEach(el => el.classList.remove('selected'));
  }

  /**
   * Reset to initial state
   */
  resetToInitialState() {
    const ratingContainer = this.container.querySelector('.feedback-rating, .feedback-rating-compact');
    const statusContainer = this.container.querySelector('.feedback-status, .feedback-status-compact');
    
    if (statusContainer) statusContainer.classList.add('hidden');
    if (ratingContainer) ratingContainer.style.display = 'flex';
    
    this.resetState();
  }

  /**
   * Set callbacks
   */
  onRating(callback) {
    this.callbacks.onRating = callback;
    return this;
  }

  onDetailedSubmit(callback) {
    this.callbacks.onDetailedSubmit = callback;
    return this;
  }

  onSkip(callback) {
    this.callbacks.onSkip = callback;
    return this;
  }

  onSuccess(callback) {
    this.callbacks.onSuccess = callback;
    return this;
  }
}

export default FeedbackComponent; 
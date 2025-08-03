/**
 * UI State Machine for Analysis Modal Flow
 * Manages state transitions and prevents invalid state changes
 */

/* global setTimeout, document */

export class UIStateMachine {
  constructor() {
    this.currentState = 'idle';
    this.previousState = null;
    this.stateData = {};
    this.observers = [];
    
    // Define valid state transitions
    this.transitions = {
      idle: {
        allowedNext: ['analyzing'],
        onEnter: () => this.onIdle(),
        onExit: () => this.onExitIdle()
      },
      analyzing: {
        allowedNext: ['results', 'error', 'idle'],
        onEnter: (data) => this.onAnalyzing(data),
        onExit: () => this.onExitAnalyzing()
      },
      results: {
        allowedNext: ['feedback', 'idle'],
        onEnter: (data) => this.onResults(data),
        onExit: () => this.onExitResults()
      },
      feedback: {
        allowedNext: ['success', 'results', 'idle'],
        onEnter: (data) => this.onFeedback(data),
        onExit: () => this.onExitFeedback()
      },
      success: {
        allowedNext: ['idle'],
        onEnter: (data) => this.onSuccess(data),
        onExit: () => this.onExitSuccess()
      },
      error: {
        allowedNext: ['idle', 'analyzing'],
        onEnter: (data) => this.onError(data),
        onExit: () => this.onExitError()
      }
    };
  }

  /**
   * Transition to a new state
   */
  transition(newState, data = {}) {
    const currentTransition = this.transitions[this.currentState];
    
    if (!currentTransition) {
      throw new Error(`Invalid current state: ${this.currentState}`);
    }
    
    if (!currentTransition.allowedNext.includes(newState)) {
      console.warn(`Invalid transition from ${this.currentState} to ${newState}`);
      return false;
    }

    // Execute exit callback for current state
    if (currentTransition.onExit) {
      currentTransition.onExit();
    }

    // Update state
    this.previousState = this.currentState;
    this.currentState = newState;
    this.stateData = { ...this.stateData, ...data };

    console.log(`State transition: ${this.previousState} → ${this.currentState}`);

    // Execute enter callback for new state
    const newTransition = this.transitions[newState];
    if (newTransition && newTransition.onEnter) {
      newTransition.onEnter(data);
    }

    // Notify observers
    this.notifyObservers(newState, data);

    return true;
  }

  /**
   * Get current state
   */
  getState() {
    return this.currentState;
  }

  /**
   * Get state data
   */
  getStateData() {
    return this.stateData;
  }

  /**
   * Check if transition is allowed
   */
  canTransition(targetState) {
    const currentTransition = this.transitions[this.currentState];
    return currentTransition && currentTransition.allowedNext.includes(targetState);
  }

  /**
   * Reset to idle state
   */
  reset() {
    this.transition('idle');
    this.stateData = {};
  }

  /**
   * Add state change observer
   */
  addObserver(callback) {
    this.observers.push(callback);
  }

  /**
   * Remove state change observer
   */
  removeObserver(callback) {
    this.observers = this.observers.filter(obs => obs !== callback);
  }

  /**
   * Notify all observers of state change
   */
  notifyObservers(newState, data) {
    this.observers.forEach(observer => {
      try {
        observer(newState, data, this.previousState);
      } catch (error) {
        console.error('Observer error:', error);
      }
    });
  }

  // State handlers (can be overridden)
  onIdle() {
    console.log('Entering idle state');
  }

  onExitIdle() {
    console.log('Exiting idle state');
  }

  onAnalyzing(data) {
    console.log('Entering analyzing state with data:', data);
  }

  onExitAnalyzing() {
    console.log('Exiting analyzing state');
  }

  onResults(data) {
    console.log('Entering results state with data:', data);
  }

  onExitResults() {
    console.log('Exiting results state');
  }

  onFeedback(data) {
    console.log('Entering feedback state with data:', data);
  }

  onExitFeedback() {
    console.log('Exiting feedback state');
  }

  onSuccess(data) {
    console.log('Entering success state with data:', data);
  }

  onExitSuccess() {
    console.log('Exiting success state');
  }

  onError(data) {
    console.log('Entering error state with data:', data);
  }

  onExitError() {
    console.log('Exiting error state');
  }
}

/**
 * Modal UI State Machine
 * Specific implementation for analysis modal
 */
export class ModalStateMachine extends UIStateMachine {
  constructor(modalElement) {
    super();
    this.modal = modalElement;
    this.elements = {};
  }

  /**
   * Initialize modal elements
   */
  initializeElements() {
    if (!this.modal) return;

    this.elements = {
      progressState: this.modal.querySelector('.progress-state'),
      resultsState: this.modal.querySelector('.results-state'),
      feedbackState: this.modal.querySelector('.feedback-state'),
      progressBar: this.modal.querySelector('.progress-fill'),
      closeBtn: this.modal.querySelector('.close-btn')
    };
  }

  /**
   * Override state handlers for modal-specific behavior
   */
  onIdle() {
    this.hideModal();
  }

  onAnalyzing(data) {
    this.showModal();
    this.showProgressState(data);
    this.disableModalClose();
  }

  onResults(data) {
    this.showResultsState(data);
    this.enableModalClose();
  }

  onFeedback(data) {
    this.showFeedbackState(data);
  }

  onSuccess(data) {
    this.showSuccessMessage(data);
    setTimeout(() => this.transition('idle'), 2000);
  }

  onError(data) {
    this.showErrorState(data);
    this.enableModalClose();
  }

  /**
   * Modal display methods
   */
  showModal() {
    if (this.modal) {
      this.modal.classList.add('show');
      document.body.appendChild(this.modal);
    }
  }

  hideModal() {
    if (this.modal) {
      this.modal.classList.remove('show');
      if (this.modal.parentNode) {
        this.modal.parentNode.removeChild(this.modal);
      }
    }
  }

  showProgressState(data) {
    this.hideAllStates();
    if (this.elements.progressState) {
      this.elements.progressState.classList.remove('hidden');
      if (data.text) {
        this.updateProgressText(data.text);
      }
    }
  }

  showResultsState(data) {
    this.hideAllStates();
    if (this.elements.resultsState) {
      this.elements.resultsState.classList.remove('hidden');
      if (data.analysis) {
        this.updateResultsContent(data.analysis);
      }
    }
  }

  showFeedbackState(data) {
    if (this.elements.feedbackState) {
      this.elements.feedbackState.classList.remove('hidden');
      if (data.analysis) {
        this.updateFeedbackContent(data.analysis);
      }
    }
  }

  hideAllStates() {
    Object.values(this.elements).forEach(element => {
      if (element && element.classList) {
        element.classList.add('hidden');
      }
    });
  }

  disableModalClose() {
    // Remove outside click and escape key handlers
    this.outsideClickEnabled = false;
  }

  enableModalClose() {
    // Add outside click and escape key handlers
    this.outsideClickEnabled = true;
  }

  // These methods should be implemented by the consuming class
  updateProgressText(text) {
    console.log('Update progress text:', text.substring(0, 50));
  }

  updateResultsContent(analysis) {
    console.log('Update results content:', analysis);
  }

  updateFeedbackContent(analysis) {
    console.log('Update feedback content:', analysis);
  }

  showSuccessMessage(data) {
    console.log('Show success message:', data);
  }

  showErrorState(data) {
    console.log('Show error state:', data);
  }
}

export default UIStateMachine; 
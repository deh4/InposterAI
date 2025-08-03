/**
 * Statistical Analysis Engine for AI Content Detection
 * Implements various linguistic and statistical metrics to detect AI-generated text
 */

export class StatisticalAnalyzer {
  constructor() {
    // Common words that AI models tend to overuse
    this.aiIndicatorWords = [
      'furthermore', 'moreover', 'additionally', 'consequently', 'therefore',
      'however', 'nevertheless', 'nonetheless', 'overall', 'in conclusion',
      'it is important to note', 'it should be noted', 'arguably', 'notably',
      'essentially', 'fundamentally', 'particularly', 'specifically', 'generally'
    ];

    // Hedge words that AI often uses
    this.hedgeWords = [
      'might', 'could', 'possibly', 'perhaps', 'maybe', 'likely', 'potentially',
      'probably', 'seems', 'appears', 'tends to', 'generally', 'often', 'usually'
    ];

    // Generic/vague phrases common in AI text
    this.genericPhrases = [
      'in today\'s world', 'in recent years', 'it is worth noting',
      'plays a crucial role', 'of utmost importance', 'myriad of',
      'plethora of', 'vast array of', 'wide range of'
    ];
  }

  /**
   * Main analysis function that returns comprehensive statistics
   */
  analyze(text) {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    const cleanText = this.cleanText(text);
    const sentences = this.splitIntoSentences(cleanText);
    const words = this.splitIntoWords(cleanText);

    return {
      perplexityScore: this.calculatePerplexityScore(words),
      burstinessScore: this.calculateBurstiness(sentences),
      vocabularyDiversity: this.calculateVocabularyDiversity(words),
      sentenceLengthVariance: this.calculateSentenceLengthVariance(sentences),
      averageSentenceLength: this.calculateAverageSentenceLength(sentences),
      aiIndicatorScore: this.calculateAIIndicatorScore(cleanText),
      hedgeWordDensity: this.calculateHedgeWordDensity(words),
      passiveVoiceRatio: this.calculatePassiveVoiceRatio(sentences),
      repetitionScore: this.calculateRepetitionScore(words),
      punctuationVariety: this.calculatePunctuationVariety(text),
      overallAILikelihood: 0, // Will be calculated by ensemble
      confidence: 0 // Will be calculated by ensemble
    };
  }

  /**
   * Clean text and normalize for analysis
   */
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[""]/g, '"')
      .replace(/['']/g, '\'')
      .trim();
  }

  /**
   * Split text into sentences
   */
  splitIntoSentences(text) {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Split text into words
   */
  splitIntoWords(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  /**
   * Approximate perplexity using n-gram frequency analysis
   */
  calculatePerplexityScore(words) {
    if (words.length < 4) return 50;

    const bigramCounts = new Map();
    const trigramCounts = new Map();
    let totalBigrams = 0;
    let totalTrigrams = 0;

    // Count bigrams and trigrams
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      bigramCounts.set(bigram, (bigramCounts.get(bigram) || 0) + 1);
      totalBigrams++;

      if (i < words.length - 2) {
        const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
        trigramCounts.set(trigram, (trigramCounts.get(trigram) || 0) + 1);
        totalTrigrams++;
      }
    }

    // Calculate entropy (higher entropy = more unpredictable = more human-like)
    const bigramEntropy = this.calculateEntropy(bigramCounts, totalBigrams);
    const trigramEntropy = this.calculateEntropy(trigramCounts, totalTrigrams);
    
    // Normalize to 0-100 scale (higher = more AI-like)
    const avgEntropy = (bigramEntropy + trigramEntropy) / 2;
    const perplexityScore = Math.max(0, Math.min(100, (6 - avgEntropy) * 16.67));
    
    return Math.round(perplexityScore);
  }

  /**
   * Calculate entropy from frequency counts
   */
  calculateEntropy(counts, total) {
    let entropy = 0;
    for (const count of counts.values()) {
      const probability = count / total;
      entropy -= probability * Math.log2(probability);
    }
    return entropy;
  }

  /**
   * Calculate burstiness (AI tends to have more uniform sentence lengths)
   */
  calculateBurstiness(sentences) {
    if (sentences.length < 3) return 50;

    const lengths = sentences.map(s => s.split(/\s+/).length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((acc, len) => acc + Math.pow(len - mean, 2), 0) / lengths.length;
    
    // Lower burstiness = more AI-like (uniform lengths)
    const burstiness = Math.sqrt(variance) / mean;
    
    // Convert to 0-100 scale (higher = more AI-like)
    const score = Math.max(0, Math.min(100, (1 - burstiness) * 100));
    return Math.round(score);
  }

  /**
   * Calculate vocabulary diversity (Type-Token Ratio)
   */
  calculateVocabularyDiversity(words) {
    if (words.length === 0) return 50;

    const uniqueWords = new Set(words);
    const diversity = uniqueWords.size / words.length;
    
    // Lower diversity often indicates AI (repetitive vocabulary)
    const score = Math.max(0, Math.min(100, (1 - diversity) * 120));
    return Math.round(score);
  }

  /**
   * Calculate sentence length variance
   */
  calculateSentenceLengthVariance(sentences) {
    if (sentences.length < 2) return 50;

    const lengths = sentences.map(s => s.split(/\s+/).length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((acc, len) => acc + Math.pow(len - mean, 2), 0) / lengths.length;
    
    // Low variance often indicates AI (consistent sentence structure)
    const normalizedVariance = Math.sqrt(variance) / mean;
    const score = Math.max(0, Math.min(100, (0.5 - normalizedVariance) * 200));
    return Math.round(score);
  }

  /**
   * Calculate average sentence length
   */
  calculateAverageSentenceLength(sentences) {
    if (sentences.length === 0) return 0;
    
    const totalWords = sentences.reduce((acc, sentence) => {
      return acc + sentence.split(/\s+/).length;
    }, 0);
    
    return Math.round(totalWords / sentences.length);
  }

  /**
   * Calculate AI indicator word score
   */
  calculateAIIndicatorScore(text) {
    const lowerText = text.toLowerCase();
    let score = 0;
    
    // Check for AI indicator words and phrases
    this.aiIndicatorWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = (lowerText.match(regex) || []).length;
      score += matches * 10;
    });

    // Check for generic phrases
    this.genericPhrases.forEach(phrase => {
      if (lowerText.includes(phrase)) {
        score += 15;
      }
    });

    return Math.min(100, score);
  }

  /**
   * Calculate hedge word density
   */
  calculateHedgeWordDensity(words) {
    if (words.length === 0) return 0;

    const hedgeCount = words.filter(word => 
      this.hedgeWords.includes(word)
    ).length;
    
    const density = (hedgeCount / words.length) * 100;
    return Math.min(100, density * 20); // Amplify for scoring
  }

  /**
   * Approximate passive voice ratio
   */
  calculatePassiveVoiceRatio(sentences) {
    if (sentences.length === 0) return 0;

    const passiveIndicators = ['is', 'are', 'was', 'were', 'been', 'being'];
    const passiveSentences = sentences.filter(sentence => {
      const words = sentence.toLowerCase().split(/\s+/);
      return passiveIndicators.some(indicator => 
        words.includes(indicator) && words.some(word => word.endsWith('ed'))
      );
    });

    const ratio = (passiveSentences.length / sentences.length) * 100;
    return Math.min(100, ratio * 2); // AI tends to use more passive voice
  }

  /**
   * Calculate repetition score
   */
  calculateRepetitionScore(words) {
    if (words.length < 10) return 0;

    const wordCounts = new Map();
    words.forEach(word => {
      if (word.length > 3) { // Only count substantial words
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    });

    let repetitionScore = 0;
    for (const [, count] of wordCounts) {
      if (count > 2) {
        repetitionScore += (count - 2) * 5;
      }
    }

    return Math.min(100, repetitionScore);
  }

  /**
   * Calculate punctuation variety
   */
  calculatePunctuationVariety(text) {
    const punctuation = text.match(/[.!?;:,—-]/g) || [];
    const uniquePunctuation = new Set(punctuation);
    
    if (punctuation.length === 0) return 50;
    
    const variety = uniquePunctuation.size / punctuation.length;
    // Low variety might indicate AI (repetitive punctuation patterns)
    const score = Math.max(0, Math.min(100, (1 - variety) * 80));
    return Math.round(score);
  }

  /**
   * Calculate ensemble score combining all metrics
   */
  calculateEnsembleScore(stats, llmAnalysis = null) {
    const weights = {
      perplexityScore: 0.20,
      burstinessScore: 0.15,
      vocabularyDiversity: 0.15,
      sentenceLengthVariance: 0.10,
      aiIndicatorScore: 0.15,
      hedgeWordDensity: 0.10,
      passiveVoiceRatio: 0.05,
      repetitionScore: 0.10
    };

    // Calculate weighted average of statistical scores
    let statisticalScore = 0;
    let totalWeight = 0;

    for (const [metric, weight] of Object.entries(weights)) {
      if (stats[metric] !== undefined) {
        statisticalScore += stats[metric] * weight;
        totalWeight += weight;
      }
    }

    statisticalScore = totalWeight > 0 ? statisticalScore / totalWeight : 50;

    // Combine with LLM analysis if available
    let finalScore = statisticalScore;
    let confidence = 60; // Base confidence for statistical analysis

    if (llmAnalysis) {
      // Weight LLM analysis more heavily, but use statistics as validation
      const llmWeight = 0.7;
      const statWeight = 0.3;
      
      finalScore = (llmAnalysis.likelihood * llmWeight) + (statisticalScore * statWeight);
      
      // Increase confidence if LLM and statistical analysis agree
      const agreement = 100 - Math.abs(llmAnalysis.likelihood - statisticalScore);
      confidence = Math.min(95, llmAnalysis.confidence * 0.7 + agreement * 0.3);
    }

    return {
      likelihood: Math.round(finalScore),
      confidence: Math.round(confidence),
      statisticalScore: Math.round(statisticalScore),
      breakdown: stats
    };
  }
}

export default StatisticalAnalyzer; 
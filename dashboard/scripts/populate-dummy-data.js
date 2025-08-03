/**
 * Populate Dashboard with Dummy Data
 * Creates realistic analysis and feedback data for testing the dashboard
 */

const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Import our database and processor classes
const AnalyticsDB = require('../src/analytics-db');
const AnalyticsProcessor = require('../src/analytics-processor');

class DummyDataGenerator {
  constructor() {
    this.db = new AnalyticsDB();
    this.processor = new AnalyticsProcessor(this.db);
    
    // Sample data pools
    this.domains = [
      'reddit.com', 'medium.com', 'substack.com', 'twitter.com', 'x.com',
      'github.com', 'stackoverflow.com', 'news.ycombinator.com',
      'techcrunch.com', 'arstechnica.com', 'theverge.com', 'wired.com',
      'bbc.com', 'cnn.com', 'reuters.com', 'nytimes.com',
      'blog.openai.com', 'ai.googleblog.com', 'research.facebook.com',
      'towardsdatascience.com', 'machinelearningmastery.com'
    ];
    
    this.contentTypes = ['social', 'blog', 'news', 'technical', 'article'];
    this.models = ['gemma2:3b', 'phi3:mini', 'llama3:8b', 'mistral:7b', 'qwen2:7b'];
    this.methods = ['ensemble', 'statistical', 'llm-only'];
    
    // Realistic content samples
    this.contentSamples = [
      'AI and machine learning are transforming industries',
      'The future of artificial intelligence in healthcare',
      'Breaking: New cryptocurrency regulations announced',
      'How to optimize your React application performance',
      'Climate change impacts on global agriculture',
      'The evolution of remote work culture',
      'Quantum computing breakthrough achieved',
      'Social media\'s impact on mental health',
      'Cybersecurity threats in the digital age',
      'Renewable energy adoption rates soar'
    ];
    
    this.sourceMethods = ['article', 'heuristics', 'structured-data'];
    this.feedbackCategories = [
      'false_positive', 'false_negative', 'accuracy_good', 
      'context_missing', 'model_bias', 'unclear_result'
    ];
    this.userExpertise = ['beginner', 'intermediate', 'expert'];
  }

  async initialize() {
    await this.db.initialize();
    console.log('Database initialized for dummy data generation');
  }

  generateRandomDate(daysBack = 30) {
    const now = Date.now();
    const randomDays = Math.random() * daysBack;
    return now - (randomDays * 24 * 60 * 60 * 1000);
  }

  generateRealisticLikelihood() {
    // Create realistic distribution - most content is either clearly AI or clearly human
    const rand = Math.random();
    if (rand < 0.3) {
      // Clearly human (0-30%)
      return Math.floor(Math.random() * 30);
    } else if (rand < 0.6) {
      // Clearly AI (70-100%)
      return Math.floor(70 + Math.random() * 30);
    } else {
      // Uncertain middle ground (30-70%)
      return Math.floor(30 + Math.random() * 40);
    }
  }

  generateConfidence(likelihood) {
    // Higher confidence for extreme values, lower for middle values
    const distance = Math.min(likelihood, 100 - likelihood);
    const baseConfidence = 50 + (distance * 0.8);
    const noise = (Math.random() - 0.5) * 20;
    return Math.max(30, Math.min(95, Math.floor(baseConfidence + noise)));
  }

  generateStatisticalBreakdown() {
    return {
      perplexityScore: Math.floor(Math.random() * 100),
      burstinessScore: Math.floor(Math.random() * 100),
      vocabularyDiversity: Math.floor(Math.random() * 100),
      sentenceLengthVariance: Math.floor(Math.random() * 100),
      aiIndicatorScore: Math.floor(Math.random() * 100),
      hedgeWordDensity: Math.floor(Math.random() * 50),
      passiveVoiceRatio: Math.floor(Math.random() * 40),
      repetitionScore: Math.floor(Math.random() * 60)
    };
  }

  generateLLMAnalysis(likelihood) {
    const confidence = this.generateConfidence(likelihood);
    const keyIndicators = [];
    
    if (likelihood > 70) {
      keyIndicators.push('formulaic transitions', 'generic phrasing', 'uniform sentence structure');
    } else if (likelihood < 30) {
      keyIndicators.push('natural irregularities', 'personal voice', 'conversational tone');
    } else {
      keyIndicators.push('mixed patterns', 'uncertain indicators');
    }
    
    return {
      likelihood,
      confidence,
      reasoning: `Analysis based on ${keyIndicators.join(', ')}`,
      keyIndicators,
      rawResponse: `Detailed analysis indicating ${likelihood}% AI likelihood`
    };
  }

  generateAnalysisEntry(index) {
    const timestamp = this.generateRandomDate(30);
    const domain = this.domains[Math.floor(Math.random() * this.domains.length)];
    const contentType = this.contentTypes[Math.floor(Math.random() * this.contentTypes.length)];
    const model = this.models[Math.floor(Math.random() * this.models.length)];
    const method = this.methods[Math.floor(Math.random() * this.methods.length)];
    const sourceMethod = this.sourceMethods[Math.floor(Math.random() * this.sourceMethods.length)];
    const content = this.contentSamples[Math.floor(Math.random() * this.contentSamples.length)];
    
    const likelihood = this.generateRealisticLikelihood();
    const confidence = this.generateConfidence(likelihood);
    const contentLength = 300 + Math.floor(Math.random() * 2000);
    const analysisTime = 1000 + Math.floor(Math.random() * 3000);
    
    const statisticalBreakdown = this.generateStatisticalBreakdown();
    const llmAnalysis = this.generateLLMAnalysis(likelihood);
    
    return {
      id: uuidv4(),
      timestamp: Math.floor(timestamp),
      url: `https://${domain}/article-${index}`,
      title: `${content} - Article ${index}`,
      contentLength,
      contentType,
      sourceMethod,
      aiLikelihood: likelihood,
      confidence,
      modelName: model,
      analysisTime,
      method,
      reasoning: `${method} analysis: ${llmAnalysis.reasoning}`,
      statisticalBreakdown,
      llmAnalysis,
      fromCache: Math.random() < 0.15, // 15% cache hits
      sessionId: `session_${new Date(timestamp).toISOString().split('T')[0]}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  generateFeedbackEntry(analysisId, sessionId) {
    // Only generate feedback for ~40% of analyses
    if (Math.random() > 0.4) return null;
    
    const feedbackType = Math.random() < 0.7 ? 'simple' : 'detailed';
    const rating = Math.random() < 0.75 ? 1 : -1; // 75% positive feedback
    const category = this.feedbackCategories[Math.floor(Math.random() * this.feedbackCategories.length)];
    const expertise = this.userExpertise[Math.floor(Math.random() * this.userExpertise.length)];
    
    let correctedLikelihood = null;
    let correctedConfidence = null;
    let reasonText = null;
    
    if (feedbackType === 'detailed') {
      correctedLikelihood = Math.floor(Math.random() * 100);
      correctedConfidence = this.generateConfidence(correctedLikelihood);
      reasonText = `Correction: ${category} - ${expertise} user feedback`;
    }
    
    return {
      id: uuidv4(),
      analysisId,
      feedbackType,
      rating,
      correctedLikelihood,
      correctedConfidence,
      reasonCategory: category,
      reasonText,
      userExpertise: expertise,
      isHelpful: Math.random() < 0.8, // 80% helpful
      timestamp: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000), // Within last week
      sessionId
    };
  }

  async populateData(count = 100) {
    console.log(`Generating ${count} dummy analysis entries...`);
    
    const analyses = [];
    const feedbacks = [];
    
    // Generate analyses
    for (let i = 1; i <= count; i++) {
      const analysis = this.generateAnalysisEntry(i);
      analyses.push(analysis);
      
      // Generate potential feedback
      const feedback = this.generateFeedbackEntry(analysis.id, analysis.sessionId);
      if (feedback) {
        feedbacks.push(feedback);
      }
      
      if (i % 10 === 0) {
        console.log(`Generated ${i}/${count} entries...`);
      }
    }
    
    console.log(`Inserting ${analyses.length} analyses and ${feedbacks.length} feedback entries...`);
    
    // Insert analyses
    for (const analysis of analyses) {
      await this.db.insertAnalysis(analysis);
    }
    
    // Insert feedback
    for (const feedback of feedbacks) {
      await this.db.insertFeedback(feedback);
    }
    
    // Update model performance
    console.log('Updating model performance metrics...');
    const modelGroups = {};
    analyses.forEach(analysis => {
      if (!modelGroups[analysis.modelName]) {
        modelGroups[analysis.modelName] = [];
      }
      modelGroups[analysis.modelName].push(analysis);
    });
    
    for (const [modelName, modelAnalyses] of Object.entries(modelGroups)) {
      const avgResponseTime = modelAnalyses.reduce((sum, a) => sum + a.analysisTime, 0) / modelAnalyses.length;
      const usageCount = modelAnalyses.length;
      const lastUsed = Math.max(...modelAnalyses.map(a => a.timestamp));
      
      await this.db.run(`
        INSERT OR REPLACE INTO model_performance (id, model_name, average_response_time, usage_count, last_used)
        VALUES (?, ?, ?, ?, ?)
      `, [uuidv4(), modelName, avgResponseTime, usageCount, lastUsed]);
    }
    
    console.log('✅ Dummy data generation complete!');
    console.log(`📊 Generated: ${analyses.length} analyses, ${feedbacks.length} feedback entries`);
    console.log('🚀 Start the dashboard server to view the data: npm start');
  }

  async cleanup() {
    await this.db.close();
  }
}

// Main execution
async function main() {
  const generator = new DummyDataGenerator();
  
  try {
    await generator.initialize();
    
    // Check if we should clear existing data
    const args = process.argv.slice(2);
    const count = args.includes('--count') ? 
      parseInt(args[args.indexOf('--count') + 1]) || 100 : 100;
    
    if (args.includes('--clear')) {
      console.log('🗑️  Clearing existing data...');
      await generator.db.run('DELETE FROM feedback');
      await generator.db.run('DELETE FROM analyses');
      await generator.db.run('DELETE FROM model_performance');
    }
    
    await generator.populateData(count);
    
  } catch (error) {
    console.error('❌ Error generating dummy data:', error);
    process.exit(1);
  } finally {
    await generator.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = DummyDataGenerator; 
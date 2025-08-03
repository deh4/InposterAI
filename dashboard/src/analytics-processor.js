/**
 * Analytics Data Processor
 * Processes raw analysis data and generates insights
 */

const { v4: uuidv4 } = require('uuid');

class AnalyticsProcessor {
  constructor(db) {
    this.db = db;
  }

  async recordAnalysis(data) {
    // Generate unique ID
    const id = uuidv4();
    
    // Process and normalize the analysis data
    const analysis = {
      id,
      timestamp: Date.now(),
      url: data.metadata?.url || '',
      title: data.metadata?.title || '',
      contentLength: data.metadata?.wordCount || data.wordCount || 0,
      contentType: this.detectContentType(data.metadata?.url),
      sourceMethod: data.metadata?.source || 'unknown',
      aiLikelihood: Math.round(data.likelihood || 0),
      confidence: Math.round(data.confidence || 0),
      modelName: data.modelName || 'unknown',
      analysisTime: data.analysisTime || 0,
      method: data.method || 'basic',
      reasoning: data.reasoning || '',
      statisticalBreakdown: JSON.stringify(data.statisticalBreakdown || {}),
      llmAnalysis: JSON.stringify(data.llmAnalysis || {}),
      fromCache: data.fromCache || false,
      sessionId: data.sessionId || this.generateSessionId(),
      
      // Enhanced data points
      language: data.metadata?.language || 'unknown',
      domain: data.metadata?.domain || this.extractDomain(data.metadata?.url),
      readingTime: data.metadata?.readingTime || Math.ceil((data.wordCount || 0) / 200),
      
      // Comprehensive timing information
      totalRequestTime: data.totalRequestTime || data.analysisTime || 0,
      llmResponseTime: data.llmResponseTime || 0,
      statisticalTime: data.statisticalTime || 0,
      connectionTestTime: data.connectionTestTime || 0,
      cacheHitTime: data.cacheHitTime || 0,
      
      // System information
      browserInfo: JSON.stringify({
        userAgent: data.browserInfo?.userAgent || 'unknown',
        extensionVersion: data.extensionVersion || data.browserInfo?.extensionVersion || '1.0.0',
        timestamp: data.browserInfo?.timestamp || Date.now()
      }),
      
      // Model information
      modelInfo: JSON.stringify(data.modelInfo || { family: 'unknown', size: 'unknown' }),
      ollamaVersion: data.ollamaVersion || 'unknown',
      
      // Settings context
      settingsContext: JSON.stringify(data.currentSettings || {}),
      
      // Performance information
      performanceInfo: JSON.stringify({
        cacheSize: data.cacheSize || 0,
        cacheHit: data.fromCache || false,
        textLength: data.textLength || 0,
        analysisSequence: data.analysisSequence || 0,
        ...data.performance
      }),
      
      // Content context
      contentContext: JSON.stringify({
        images: data.metadata?.contentContext?.images || 0,
        links: data.metadata?.contentContext?.links || 0,
        headings: data.metadata?.contentContext?.headings || 0,
        domain: data.metadata?.domain || this.extractDomain(data.metadata?.url),
        ...data.metadata?.contentContext
      })
    };

    // Store in database
    await this.db.insertAnalysis(analysis);

    // Update model performance metrics
    await this.updateModelPerformance(analysis);

    return analysis;
  }

  async recordFeedback(data) {
    const id = uuidv4();
    
    const feedback = {
      id,
      analysisId: data.analysisId,
      feedbackType: data.feedbackType || 'simple',
      rating: data.rating, // 1 = positive, -1 = negative, 0 = neutral
      correctedLikelihood: data.correctedLikelihood,
      correctedConfidence: data.correctedConfidence,
      reasonCategory: data.reasonCategory,
      reasonText: data.reasonText,
      userExpertise: data.userExpertise || 'beginner',
      isHelpful: data.isHelpful || false,
      timestamp: Date.now(),
      sessionId: data.sessionId || this.generateSessionId()
    };

    await this.db.insertFeedback(feedback);
    return feedback;
  }

  async getOverview() {
    // Get basic stats
    const totalAnalyses = await this.db.get(
      'SELECT COUNT(*) as count FROM analyses'
    );

    const todayAnalyses = await this.db.get(
      'SELECT COUNT(*) as count FROM analyses WHERE timestamp > ?',
      [Date.now() - 24 * 60 * 60 * 1000]
    );

    const avgAccuracy = await this.db.get(`
      SELECT 
        AVG(ai_likelihood) as avg_likelihood,
        AVG(confidence) as avg_confidence
      FROM analyses 
      WHERE timestamp > ?
    `, [Date.now() - 7 * 24 * 60 * 60 * 1000]);

    const feedbackStats = await this.db.getFeedbackStats();

    // Calculate accuracy percentage
    const aiDetections = await this.db.get(`
      SELECT 
        COUNT(CASE WHEN ai_likelihood > 70 THEN 1 END) as high_ai,
        COUNT(CASE WHEN ai_likelihood < 30 THEN 1 END) as likely_human,
        COUNT(*) as total
      FROM analyses 
      WHERE timestamp > ?
    `, [Date.now() - 7 * 24 * 60 * 60 * 1000]);

    return {
      totalAnalyses: totalAnalyses.count,
      todayAnalyses: todayAnalyses.count,
      averageLikelihood: Math.round(avgAccuracy.avg_likelihood || 0),
      averageConfidence: Math.round(avgAccuracy.avg_confidence || 0),
      aiDetectionRate: aiDetections.total > 0 ? 
        Math.round((aiDetections.high_ai / aiDetections.total) * 100) : 0,
      humanDetectionRate: aiDetections.total > 0 ? 
        Math.round((aiDetections.likely_human / aiDetections.total) * 100) : 0,
      feedbackRate: feedbackStats ? 
        Math.round((feedbackStats.total_feedback / totalAnalyses.count) * 100) : 0,
      positiveFeedback: feedbackStats ? 
        Math.round((feedbackStats.positive / (feedbackStats.positive + feedbackStats.negative)) * 100) : 0,
      timestamp: Date.now()
    };
  }

  async getTrends(period = '7d', metric = 'count') {
    const days = this.parsePeriod(period);
    const trends = await this.db.getAnalysisTrends(days);

    // Fill in missing dates
    const filledTrends = this.fillMissingDates(trends, days);

    return {
      period,
      metric,
      data: filledTrends,
      summary: {
        totalAnalyses: filledTrends.reduce((sum, day) => sum + day.count, 0),
        averagePerDay: Math.round(filledTrends.reduce((sum, day) => sum + day.count, 0) / days),
        peakDay: filledTrends.reduce((max, day) => day.count > max.count ? day : max, { count: 0 })
      }
    };
  }

  async getAccuracyMetrics() {
    // Get confidence calibration data
    const calibrationData = await this.db.all(`
      SELECT 
        CASE 
          WHEN a.confidence BETWEEN 0 AND 20 THEN '0-20'
          WHEN a.confidence BETWEEN 21 AND 40 THEN '21-40'
          WHEN a.confidence BETWEEN 41 AND 60 THEN '41-60'
          WHEN a.confidence BETWEEN 61 AND 80 THEN '61-80'
          ELSE '81-100'
        END as confidence_bucket,
        COUNT(*) as count,
        COUNT(CASE WHEN f.rating = 1 THEN 1 END) as correct_predictions,
        AVG(a.ai_likelihood) as avg_likelihood
      FROM analyses a
      LEFT JOIN feedback f ON a.id = f.analysis_id
      WHERE a.timestamp > ?
      GROUP BY confidence_bucket
      ORDER BY confidence_bucket
    `, [Date.now() - 30 * 24 * 60 * 60 * 1000]);

    // Get error analysis
    const errorAnalysis = await this.db.all(`
      SELECT 
        CASE 
          WHEN ABS(a.ai_likelihood - f.corrected_likelihood) > 30 THEN 'major_error'
          WHEN ABS(a.ai_likelihood - f.corrected_likelihood) > 15 THEN 'minor_error'
          ELSE 'accurate'
        END as error_category,
        COUNT(*) as count,
        AVG(ABS(a.ai_likelihood - f.corrected_likelihood)) as avg_error_magnitude
      FROM analyses a
      JOIN feedback f ON a.id = f.analysis_id
      WHERE f.corrected_likelihood IS NOT NULL
      GROUP BY error_category
    `);

    return {
      calibration: calibrationData,
      errorAnalysis: errorAnalysis,
      timestamp: Date.now()
    };
  }

  async getModelPerformance() {
    const performance = await this.db.all(`
      SELECT 
        a.model_name,
        COUNT(*) as usage_count,
        AVG(a.analysis_time) as avg_response_time,
        AVG(a.confidence) as avg_confidence,
        MAX(a.timestamp) as last_used,
        COUNT(CASE WHEN f.rating = 1 THEN 1 END) as positive_feedback,
        COUNT(CASE WHEN f.rating = -1 THEN 1 END) as negative_feedback
      FROM analyses a
      LEFT JOIN feedback f ON a.id = f.analysis_id
      WHERE a.model_name IS NOT NULL
      GROUP BY a.model_name
      ORDER BY usage_count DESC
    `);

    return {
      models: performance.map(model => ({
        name: model.model_name,
        usageCount: model.usage_count,
        avgResponseTime: Math.round(model.avg_response_time || 0),
        avgConfidence: Math.round(model.avg_confidence || 0),
        lastUsed: model.last_used,
        positiveFeedback: model.positive_feedback || 0,
        negativeFeedback: model.negative_feedback || 0,
        feedbackRatio: model.positive_feedback > 0 ? 
          Math.round((model.positive_feedback / (model.positive_feedback + model.negative_feedback)) * 100) : 0
      })),
      timestamp: Date.now()
    };
  }

  async getContentInsights() {
    const insights = await this.db.getContentInsights();
    
    // Get domain analysis
    const domainAnalysis = await this.db.all(`
      SELECT 
        CASE 
          WHEN url LIKE '%reddit.com%' THEN 'Reddit'
          WHEN url LIKE '%twitter.com%' OR url LIKE '%x.com%' THEN 'Twitter/X'
          WHEN url LIKE '%medium.com%' THEN 'Medium'
          WHEN url LIKE '%substack.com%' THEN 'Substack'
          WHEN url LIKE '%github.com%' THEN 'GitHub'
          WHEN url LIKE '%stackoverflow.com%' THEN 'StackOverflow'
          WHEN url LIKE '%news.%' OR url LIKE '%bbc.%' OR url LIKE '%cnn.%' THEN 'News'
          ELSE 'Other'
        END as domain_category,
        COUNT(*) as count,
        AVG(ai_likelihood) as avg_likelihood,
        AVG(confidence) as avg_confidence
      FROM analyses
      WHERE url != ''
      GROUP BY domain_category
      ORDER BY count DESC
    `);

    return {
      contentLength: insights,
      domains: domainAnalysis,
      timestamp: Date.now()
    };
  }

  async exportData(format = 'json', startDate = null, endDate = null) {
    let whereClause = '';
    const params = [];

    if (startDate) {
      whereClause += 'WHERE timestamp >= ?';
      params.push(new Date(startDate).getTime());
    }

    if (endDate) {
      whereClause += whereClause ? ' AND timestamp <= ?' : 'WHERE timestamp <= ?';
      params.push(new Date(endDate).getTime());
    }

    const analyses = await this.db.all(`
      SELECT 
        a.*,
        f.rating as feedback_rating,
        f.corrected_likelihood,
        f.reason_category,
        f.reason_text
      FROM analyses a
      LEFT JOIN feedback f ON a.id = f.analysis_id
      ${whereClause}
      ORDER BY a.timestamp DESC
    `, params);

    if (format === 'csv') {
      return this.convertToCSV(analyses);
    }

    return JSON.stringify(analyses, null, 2);
  }

  // Helper methods
  detectContentType(url) {
    if (!url) return 'unknown';
    
    if (url.includes('reddit.com')) return 'social';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'social';
    if (url.includes('medium.com') || url.includes('substack.com')) return 'blog';
    if (url.includes('github.com')) return 'code';
    if (url.includes('stackoverflow.com')) return 'technical';
    if (url.includes('news.') || url.includes('bbc.') || url.includes('cnn.')) return 'news';
    
    return 'article';
  }

  generateSessionId() {
    // Simple session ID based on date
    const today = new Date().toISOString().split('T')[0];
    return `session_${today}_${Math.random().toString(36).substr(2, 9)}`;
  }

  parsePeriod(period) {
    const match = period.match(/(\d+)([dwmy])/);
    if (!match) return 7; // Default to 7 days

    const [, num, unit] = match;
    const multipliers = { d: 1, w: 7, m: 30, y: 365 };
    return parseInt(num) * (multipliers[unit] || 1);
  }

  fillMissingDates(trends, days) {
    const filled = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const existing = trends.find(t => t.date === dateStr);
      filled.push(existing || {
        date: dateStr,
        count: 0,
        avg_likelihood: 0,
        avg_confidence: 0,
        high_ai_count: 0,
        human_count: 0
      });
    }
    
    return filled;
  }

  convertToCSV(data) {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  }

  async updateModelPerformance(analysis) {
    // Update or insert model performance metrics
    const existing = await this.db.get(
      'SELECT * FROM model_performance WHERE model_name = ?',
      [analysis.modelName]
    );

    if (existing) {
      await this.db.run(`
        UPDATE model_performance 
        SET 
          average_response_time = ((average_response_time * usage_count) + ?) / (usage_count + 1),
          usage_count = usage_count + 1,
          last_used = ?
        WHERE model_name = ?
      `, [analysis.analysisTime, analysis.timestamp, analysis.modelName]);
    } else {
      await this.db.run(`
        INSERT INTO model_performance (id, model_name, average_response_time, usage_count, last_used)
        VALUES (?, ?, ?, 1, ?)
      `, [uuidv4(), analysis.modelName, analysis.analysisTime, analysis.timestamp]);
    }
  }

  extractDomain(url) {
    if (!url) return 'unknown';
    try {
      return new URL(url).hostname;
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Get detailed timing analysis
   */
  async getTimingAnalysis() {
    try {
      const results = await this.db.all(`
        SELECT 
          model_name,
          AVG(total_request_time) as avg_total_time,
          AVG(llm_response_time) as avg_llm_time,
          AVG(statistical_time) as avg_statistical_time,
          AVG(connection_test_time) as avg_connection_time,
          AVG(CASE WHEN from_cache = 1 THEN cache_hit_time ELSE NULL END) as avg_cache_time,
          COUNT(*) as sample_size,
          SUM(CASE WHEN from_cache = 1 THEN 1 ELSE 0 END) as cache_hits,
          ROUND((SUM(CASE WHEN from_cache = 1 THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 2) as cache_hit_rate
        FROM analyses 
        WHERE timestamp > ? 
        GROUP BY model_name
        ORDER BY avg_total_time ASC
      `, [Date.now() - (7 * 24 * 60 * 60 * 1000)]);

      return results.map(row => ({
        modelName: row.model_name,
        avgTotalTime: Math.round(row.avg_total_time || 0),
        avgLlmTime: Math.round(row.avg_llm_time || 0),
        avgStatisticalTime: Math.round(row.avg_statistical_time || 0),
        avgConnectionTime: Math.round(row.avg_connection_time || 0),
        avgCacheTime: Math.round(row.avg_cache_time || 0),
        sampleSize: row.sample_size,
        cacheHits: row.cache_hits,
        cacheHitRate: row.cache_hit_rate
      }));
    } catch (error) {
      console.error('Failed to get timing analysis:', error);
      return [];
    }
  }

  /**
   * Get system information summary
   */
  async getSystemSummary() {
    try {
      const [ollamaVersions, modelFamilies, extensionVersions] = await Promise.all([
        this.db.all(`
          SELECT ollama_version, COUNT(*) as count 
          FROM analyses 
          WHERE timestamp > ? 
          GROUP BY ollama_version 
          ORDER BY count DESC
        `, [Date.now() - (30 * 24 * 60 * 60 * 1000)]),
        
        this.db.all(`
          SELECT 
            json_extract(model_info, '$.family') as model_family,
            json_extract(model_info, '$.size') as model_size,
            COUNT(*) as usage_count
          FROM analyses 
          WHERE timestamp > ? AND model_info != '{}'
          GROUP BY model_family, model_size
          ORDER BY usage_count DESC
        `, [Date.now() - (30 * 24 * 60 * 60 * 1000)]),
        
        this.db.all(`
          SELECT 
            json_extract(browser_info, '$.extensionVersion') as extension_version,
            COUNT(*) as count 
          FROM analyses 
          WHERE timestamp > ? 
          GROUP BY extension_version 
          ORDER BY count DESC
        `, [Date.now() - (30 * 24 * 60 * 60 * 1000)])
      ]);

      return {
        ollamaVersions: ollamaVersions.map(row => ({
          version: row.ollama_version,
          count: row.count
        })),
        modelFamilies: modelFamilies.map(row => ({
          family: row.model_family || 'unknown',
          size: row.model_size || 'unknown',
          usageCount: row.usage_count
        })),
        extensionVersions: extensionVersions.map(row => ({
          version: row.extension_version || 'unknown',
          count: row.count
        }))
      };
    } catch (error) {
      console.error('Failed to get system summary:', error);
      return { ollamaVersions: [], modelFamilies: [], extensionVersions: [] };
    }
  }

  /**
   * Get performance insights
   */
  async getPerformanceInsights() {
    try {
      const [timeDistribution, errorRates, cacheEfficiency] = await Promise.all([
        this.db.all(`
          SELECT 
            CASE 
              WHEN total_request_time < 1000 THEN '< 1s'
              WHEN total_request_time < 3000 THEN '1-3s'
              WHEN total_request_time < 5000 THEN '3-5s'
              WHEN total_request_time < 10000 THEN '5-10s'
              ELSE '> 10s'
            END as time_range,
            COUNT(*) as count
          FROM analyses 
          WHERE timestamp > ?
          GROUP BY time_range
          ORDER BY 
            CASE time_range
              WHEN '< 1s' THEN 1
              WHEN '1-3s' THEN 2
              WHEN '3-5s' THEN 3
              WHEN '5-10s' THEN 4
              ELSE 5
            END
        `, [Date.now() - (7 * 24 * 60 * 60 * 1000)]),
        
        this.db.get(`
          SELECT 
            COUNT(*) as total_analyses,
            SUM(CASE WHEN from_cache = 1 THEN 1 ELSE 0 END) as cache_hits,
            AVG(total_request_time) as avg_response_time,
            MIN(total_request_time) as min_response_time,
            MAX(total_request_time) as max_response_time
          FROM analyses 
          WHERE timestamp > ?
        `, [Date.now() - (7 * 24 * 60 * 60 * 1000)]),
        
        this.db.all(`
          SELECT 
            DATE(timestamp/1000, 'unixepoch') as analysis_date,
            COUNT(*) as total_requests,
            SUM(CASE WHEN from_cache = 1 THEN 1 ELSE 0 END) as cache_hits,
            AVG(total_request_time) as avg_time
          FROM analyses 
          WHERE timestamp > ?
          GROUP BY analysis_date
          ORDER BY analysis_date DESC
          LIMIT 7
        `, [Date.now() - (7 * 24 * 60 * 60 * 1000)])
      ]);

      return {
        timeDistribution: timeDistribution.map(row => ({
          range: row.time_range,
          count: row.count
        })),
        overall: {
          totalAnalyses: errorRates?.total_analyses || 0,
          cacheHits: errorRates?.cache_hits || 0,
          cacheHitRate: errorRates ? ((errorRates.cache_hits / errorRates.total_analyses) * 100) : 0,
          avgResponseTime: Math.round(errorRates?.avg_response_time || 0),
          minResponseTime: Math.round(errorRates?.min_response_time || 0),
          maxResponseTime: Math.round(errorRates?.max_response_time || 0)
        },
        dailyTrends: cacheEfficiency.map(row => ({
          date: row.analysis_date,
          totalRequests: row.total_requests,
          cacheHits: row.cache_hits,
          cacheHitRate: ((row.cache_hits / row.total_requests) * 100),
          avgTime: Math.round(row.avg_time)
        }))
      };
    } catch (error) {
      console.error('Failed to get performance insights:', error);
      return { timeDistribution: [], overall: {}, dailyTrends: [] };
    }
  }
}

module.exports = AnalyticsProcessor; 
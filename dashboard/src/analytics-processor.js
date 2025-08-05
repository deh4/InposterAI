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

  /**
   * Get AI detection heatmap by domain and time
   */
  async getDetectionHeatmap(period = '30d') {
    const days = this.parsePeriod(period);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const heatmapData = await this.db.all(`
      SELECT 
        domain,
        DATE(timestamp / 1000, 'unixepoch') as date,
        COUNT(*) as total_analyses,
        AVG(ai_likelihood) as avg_ai_likelihood,
        COUNT(CASE WHEN ai_likelihood > 70 THEN 1 END) as high_ai_detections
      FROM analyses 
      WHERE timestamp > ?
      GROUP BY domain, date
      ORDER BY date DESC, avg_ai_likelihood DESC
    `, [cutoff]);

    return {
      period,
      data: heatmapData,
      summary: {
        totalDomains: new Set(heatmapData.map(d => d.domain)).size,
        avgDetectionRate: heatmapData.length > 0 ? 
          Math.round(heatmapData.reduce((sum, d) => sum + d.avg_ai_likelihood, 0) / heatmapData.length) : 0,
        topAIDomains: heatmapData
          .reduce((acc, curr) => {
            const existing = acc.find(d => d.domain === curr.domain);
            if (existing) {
              existing.total_analyses += curr.total_analyses;
              existing.avg_ai_likelihood = (existing.avg_ai_likelihood + curr.avg_ai_likelihood) / 2;
            } else {
              acc.push({ ...curr });
            }
            return acc;
          }, [])
          .sort((a, b) => b.avg_ai_likelihood - a.avg_ai_likelihood)
          .slice(0, 10)
      }
    };
  }

  /**
   * Get temporal analysis patterns (hourly/daily/weekly)
   */
  async getTemporalPatterns(granularity = 'hourly', period = '7d') {
    const days = this.parsePeriod(period);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    let groupBy, dateFormat;
    switch (granularity) {
      case 'hourly':
        groupBy = "strftime('%H', timestamp / 1000, 'unixepoch')";
        dateFormat = 'hour';
        break;
      case 'daily':
        groupBy = "strftime('%w', timestamp / 1000, 'unixepoch')";
        dateFormat = 'day_of_week';
        break;
      case 'weekly':
        groupBy = "strftime('%W', timestamp / 1000, 'unixepoch')";
        dateFormat = 'week';
        break;
      default:
        throw new Error('Invalid granularity. Use: hourly, daily, or weekly');
    }

    const patterns = await this.db.all(`
      SELECT 
        ${groupBy} as time_period,
        COUNT(*) as total_analyses,
        AVG(ai_likelihood) as avg_ai_likelihood,
        AVG(confidence) as avg_confidence,
        AVG(analysis_time) as avg_analysis_time,
        COUNT(CASE WHEN ai_likelihood > 70 THEN 1 END) as high_ai_count
      FROM analyses 
      WHERE timestamp > ?
      GROUP BY time_period
      ORDER BY time_period
    `, [cutoff]);

    return {
      granularity,
      period,
      patterns,
      insights: {
        peakActivityPeriod: patterns.reduce((max, p) => 
          p.total_analyses > max.total_analyses ? p : max, { total_analyses: 0 }),
        highestAIPeriod: patterns.reduce((max, p) => 
          p.avg_ai_likelihood > max.avg_ai_likelihood ? p : max, { avg_ai_likelihood: 0 }),
        fastestAnalysisPeriod: patterns.reduce((min, p) => 
          p.avg_analysis_time < min.avg_analysis_time ? p : min, { avg_analysis_time: Infinity })
      }
    };
  }

  /**
   * Get content type intelligence and patterns
   */
  async getContentTypeIntelligence() {
    const contentTypes = await this.db.all(`
      SELECT 
        content_type,
        COUNT(*) as total_analyses,
        AVG(ai_likelihood) as avg_ai_likelihood,
        AVG(confidence) as avg_confidence,
        AVG(content_length) as avg_content_length,
        AVG(reading_time) as avg_reading_time,
        COUNT(CASE WHEN ai_likelihood > 70 THEN 1 END) as high_ai_detections,
        COUNT(CASE WHEN ai_likelihood < 30 THEN 1 END) as human_detections
      FROM analyses 
      WHERE timestamp > ?
      GROUP BY content_type
      ORDER BY total_analyses DESC
    `, [Date.now() - 30 * 24 * 60 * 60 * 1000]);

    const languagePatterns = await this.db.all(`
      SELECT 
        language,
        COUNT(*) as total_analyses,
        AVG(ai_likelihood) as avg_ai_likelihood,
        COUNT(CASE WHEN ai_likelihood > 70 THEN 1 END) as high_ai_detections
      FROM analyses 
      WHERE timestamp > ? AND language IS NOT NULL
      GROUP BY language
      ORDER BY total_analyses DESC
    `, [Date.now() - 30 * 24 * 60 * 60 * 1000]);

    return {
      contentTypes,
      languagePatterns,
      insights: {
        mostAIProneType: contentTypes.reduce((max, type) => 
          type.avg_ai_likelihood > max.avg_ai_likelihood ? type : max, { avg_ai_likelihood: 0 }),
        mostHumanType: contentTypes.reduce((min, type) => 
          type.avg_ai_likelihood < min.avg_ai_likelihood ? type : min, { avg_ai_likelihood: 100 }),
        totalLanguages: languagePatterns.length,
        mostAnalyzedLanguage: languagePatterns[0]
      }
    };
  }

  /**
   * Get model performance comparison (local vs cloud, different models)
   */
  async getModelPerformance() {
    const modelStats = await this.db.all(`
      SELECT 
        model_name,
        COUNT(*) as total_analyses,
        AVG(ai_likelihood) as avg_ai_likelihood,
        AVG(confidence) as avg_confidence,
        AVG(llm_response_time) as avg_response_time,
        AVG(analysis_time) as avg_total_time,
        COUNT(CASE WHEN from_cache = 1 THEN 1 END) as cache_hits
      FROM analyses 
      WHERE timestamp > ? AND model_name IS NOT NULL
      GROUP BY model_name
      ORDER BY total_analyses DESC
    `, [Date.now() - 30 * 24 * 60 * 60 * 1000]);

    const feedbackByModel = await this.db.all(`
      SELECT 
        a.model_name,
        COUNT(f.id) as total_feedback,
        COUNT(CASE WHEN f.rating = 1 THEN 1 END) as positive_feedback,
        AVG(CASE WHEN f.corrected_likelihood IS NOT NULL THEN f.corrected_likelihood ELSE a.ai_likelihood END) as avg_corrected_likelihood
      FROM analyses a
      LEFT JOIN feedback f ON a.id = f.analysis_id
      WHERE a.timestamp > ? AND a.model_name IS NOT NULL
      GROUP BY a.model_name
    `, [Date.now() - 30 * 24 * 60 * 60 * 1000]);

    return {
      modelStats,
      feedbackByModel,
      comparison: {
        fastestModel: modelStats.reduce((min, model) => 
          model.avg_response_time < min.avg_response_time ? model : min, { avg_response_time: Infinity }),
        mostAccurateModel: feedbackByModel.reduce((max, model) => {
          const accuracy = model.total_feedback > 0 ? (model.positive_feedback / model.total_feedback) : 0;
          const maxAccuracy = max.total_feedback > 0 ? (max.positive_feedback / max.total_feedback) : 0;
          return accuracy > maxAccuracy ? model : max;
        }, { total_feedback: 0 }),
        mostUsedModel: modelStats[0]
      }
    };
  }

  /**
   * Get user learning curve and feedback evolution
   */
  async getUserLearningCurve() {
    const feedbackEvolution = await this.db.all(`
      SELECT 
        DATE(f.timestamp / 1000, 'unixepoch') as date,
        COUNT(*) as total_feedback,
        COUNT(CASE WHEN f.rating = 1 THEN 1 END) as positive_feedback,
        AVG(ABS(f.corrected_likelihood - a.ai_likelihood)) as avg_correction_delta,
        AVG(f.feedback_delay) as avg_feedback_delay
      FROM feedback f
      JOIN analyses a ON f.analysis_id = a.id
      WHERE f.timestamp > ?
      GROUP BY date
      ORDER BY date
    `, [Date.now() - 90 * 24 * 60 * 60 * 1000]);

    const expertiseProgression = await this.db.all(`
      SELECT 
        user_expertise,
        COUNT(*) as total_feedback,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as positive_feedback,
        AVG(ABS(corrected_likelihood - (SELECT ai_likelihood FROM analyses WHERE id = feedback.analysis_id))) as avg_accuracy
      FROM feedback
      WHERE timestamp > ?
      GROUP BY user_expertise
    `, [Date.now() - 90 * 24 * 60 * 60 * 1000]);

    return {
      feedbackEvolution,
      expertiseProgression,
      learningInsights: {
        improvementTrend: this.calculateTrend(feedbackEvolution.map(d => d.positive_feedback / d.total_feedback)),
        accuracyImprovement: this.calculateTrend(feedbackEvolution.map(d => 100 - d.avg_correction_delta)),
        feedbackSpeedImprovement: this.calculateTrend(feedbackEvolution.map(d => -d.avg_feedback_delay))
      }
    };
  }

  /**
   * Get linguistic pattern analysis for AI detection
   */
  async getLinguisticPatterns() {
    const patterns = await this.db.all(`
      SELECT 
        statistical_breakdown,
        COUNT(*) as frequency,
        AVG(ai_likelihood) as avg_ai_likelihood
      FROM analyses 
      WHERE timestamp > ? AND statistical_breakdown IS NOT NULL
      GROUP BY statistical_breakdown
      ORDER BY frequency DESC
      LIMIT 100
    `, [Date.now() - 30 * 24 * 60 * 60 * 1000]);

    // Parse statistical breakdown to find common patterns
    const indicators = {};
    patterns.forEach(pattern => {
      try {
        const stats = JSON.parse(pattern.statistical_breakdown);
        Object.keys(stats).forEach(key => {
          if (!indicators[key]) indicators[key] = [];
          indicators[key].push({
            value: stats[key],
            ai_likelihood: pattern.avg_ai_likelihood,
            frequency: pattern.frequency
          });
        });
      } catch (e) {
        // Skip malformed data
      }
    });

    return {
      topPatterns: patterns.slice(0, 20),
      indicators,
      insights: {
        strongestAIIndicator: Object.keys(indicators).reduce((strongest, key) => {
          const avg = indicators[key].reduce((sum, item) => sum + item.ai_likelihood, 0) / indicators[key].length;
          return avg > strongest.strength ? { indicator: key, strength: avg } : strongest;
        }, { indicator: '', strength: 0 }),
        mostCommonPattern: patterns[0]
      }
    };
  }

  /**
   * Get cache performance and optimization insights
   */
  async getCachePerformance() {
    const cacheStats = await this.db.all(`
      SELECT 
        from_cache,
        COUNT(*) as total_analyses,
        AVG(analysis_time) as avg_analysis_time,
        AVG(cache_hit_time) as avg_cache_time,
        AVG(content_length) as avg_content_length
      FROM analyses 
      WHERE timestamp > ?
      GROUP BY from_cache
    `, [Date.now() - 7 * 24 * 60 * 60 * 1000]);

    const cacheEfficiency = await this.db.get(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN from_cache = 1 THEN 1 END) as cache_hits,
        AVG(CASE WHEN from_cache = 0 THEN analysis_time END) as avg_full_analysis_time,
        AVG(CASE WHEN from_cache = 1 THEN cache_hit_time END) as avg_cache_hit_time
      FROM analyses 
      WHERE timestamp > ?
    `, [Date.now() - 7 * 24 * 60 * 60 * 1000]);

    const hitRate = cacheEfficiency.cache_hits / cacheEfficiency.total_requests * 100;
    const timeSaved = (cacheEfficiency.avg_full_analysis_time - cacheEfficiency.avg_cache_hit_time) * cacheEfficiency.cache_hits;

    return {
      cacheStats,
      efficiency: {
        hitRate: Math.round(hitRate),
        timeSavedMs: Math.round(timeSaved),
        performanceGain: Math.round((cacheEfficiency.avg_full_analysis_time / cacheEfficiency.avg_cache_hit_time) * 100)
      },
      recommendations: this.generateCacheRecommendations(hitRate, cacheStats)
    };
  }

  /**
   * Get false positive/negative deep dive analysis
   */
  async getFalsePositiveAnalysis() {
    const falsePositives = await this.db.all(`
      SELECT 
        a.domain,
        a.content_type,
        a.ai_likelihood,
        a.confidence,
        f.corrected_likelihood,
        a.reasoning,
        COUNT(*) as frequency
      FROM analyses a
      JOIN feedback f ON a.id = f.analysis_id
      WHERE f.rating = 0 
        AND a.ai_likelihood > 70 
        AND a.timestamp > ?
      GROUP BY a.domain, a.content_type, a.ai_likelihood, a.confidence
      ORDER BY frequency DESC
    `, [Date.now() - 30 * 24 * 60 * 60 * 1000]);

    const falseNegatives = await this.db.all(`
      SELECT 
        a.domain,
        a.content_type,
        a.ai_likelihood,
        a.confidence,
        f.corrected_likelihood,
        a.reasoning,
        COUNT(*) as frequency
      FROM analyses a
      JOIN feedback f ON a.id = f.analysis_id
      WHERE f.rating = 0 
        AND a.ai_likelihood < 30 
        AND f.corrected_likelihood > 70
        AND a.timestamp > ?
      GROUP BY a.domain, a.content_type, a.ai_likelihood, a.confidence
      ORDER BY frequency DESC
    `, [Date.now() - 30 * 24 * 60 * 60 * 1000]);

    return {
      falsePositives: falsePositives.slice(0, 10),
      falseNegatives: falseNegatives.slice(0, 10),
      patterns: {
        commonFPDomains: [...new Set(falsePositives.map(fp => fp.domain))].slice(0, 5),
        commonFNDomains: [...new Set(falseNegatives.map(fn => fn.domain))].slice(0, 5),
        fpContentTypes: [...new Set(falsePositives.map(fp => fp.content_type))],
        fnContentTypes: [...new Set(falseNegatives.map(fn => fn.content_type))]
      },
      recommendations: this.generateErrorRecommendations(falsePositives, falseNegatives)
    };
  }

  // Helper methods
  calculateTrend(values) {
    if (values.length < 2) return 0;
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumXX = values.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return Math.round(slope * 1000) / 1000; // Round to 3 decimal places
  }

  generateCacheRecommendations(hitRate, stats) {
    const recommendations = [];
    if (hitRate < 30) {
      recommendations.push("Consider increasing cache duration to improve hit rate");
    }
    if (hitRate > 80) {
      recommendations.push("Excellent cache performance! Consider expanding cache scope");
    }
    return recommendations;
  }

  generateErrorRecommendations(falsePositives, falseNegatives) {
    const recommendations = [];
    if (falsePositives.length > 0) {
      recommendations.push(`Review AI detection for ${falsePositives[0].domain} domain`);
    }
    if (falseNegatives.length > 0) {
      recommendations.push(`Improve sensitivity for ${falseNegatives[0].content_type} content`);
    }
    return recommendations;
  }
}

module.exports = AnalyticsProcessor; 
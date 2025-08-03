/**
 * Analytics Database Manager
 * SQLite database for storing analysis history and feedback
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class AnalyticsDB {
  constructor() {
    this.dbPath = path.join(__dirname, '..', 'data', 'analytics.db');
    this.db = null;
    this.ensureDataDirectory();
  }

  ensureDataDirectory() {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('Connected to SQLite database');
        this.createTables().then(resolve).catch(reject);
      });
    });
  }

  async createTables() {
    const tables = [
      // Analysis records
      `CREATE TABLE IF NOT EXISTS analyses (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        url TEXT,
        title TEXT,
        content_length INTEGER,
        content_type TEXT,
        source_method TEXT,
        ai_likelihood INTEGER,
        confidence INTEGER,
        model_name TEXT,
        analysis_time INTEGER,
        method TEXT,
        reasoning TEXT,
        statistical_breakdown TEXT,
        llm_analysis TEXT,
        from_cache BOOLEAN DEFAULT 0,
        session_id TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        -- Enhanced metadata (optional)
        language TEXT,
        domain TEXT,
        reading_time INTEGER,
        browser_info TEXT,
        performance_info TEXT,
        content_context TEXT
      )`,

      // Feedback records
      `CREATE TABLE IF NOT EXISTS feedback (
        id TEXT PRIMARY KEY,
        analysis_id TEXT,
        feedback_type TEXT,
        rating INTEGER,
        corrected_likelihood INTEGER,
        corrected_confidence INTEGER,
        reason_category TEXT,
        reason_text TEXT,
        user_expertise TEXT,
        is_helpful BOOLEAN,
        timestamp INTEGER NOT NULL,
        session_id TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (analysis_id) REFERENCES analyses (id)
      )`,

      // Model performance tracking
      `CREATE TABLE IF NOT EXISTS model_performance (
        id TEXT PRIMARY KEY,
        model_name TEXT NOT NULL,
        average_response_time REAL,
        accuracy_score REAL,
        usage_count INTEGER,
        last_used INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`,

      // User sessions
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        start_time INTEGER,
        end_time INTEGER,
        analysis_count INTEGER DEFAULT 0,
        feedback_count INTEGER DEFAULT 0,
        user_agent TEXT,
        expertise_level TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`,

      // System metrics
      `CREATE TABLE IF NOT EXISTS system_metrics (
        id TEXT PRIMARY KEY,
        metric_name TEXT NOT NULL,
        metric_value TEXT,
        timestamp INTEGER NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`
    ];

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_analyses_timestamp ON analyses (timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_analyses_url ON analyses (url)',
      'CREATE INDEX IF NOT EXISTS idx_analyses_model ON analyses (model_name)',
      'CREATE INDEX IF NOT EXISTS idx_feedback_analysis_id ON feedback (analysis_id)',
      'CREATE INDEX IF NOT EXISTS idx_feedback_timestamp ON feedback (timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions (start_time)'
    ];

    for (const table of tables) {
      await this.run(table);
    }

    for (const index of indexes) {
      await this.run(index);
    }

    console.log('Database tables and indexes created');
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Analysis-specific methods
  async insertAnalysis(analysis) {
    const sql = `
      INSERT INTO analyses (
        id, timestamp, url, title, content_length, content_type, source_method,
        ai_likelihood, confidence, model_name, analysis_time, method, reasoning,
        statistical_breakdown, llm_analysis, from_cache, session_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      analysis.id,
      analysis.timestamp,
      analysis.url,
      analysis.title,
      analysis.contentLength,
      analysis.contentType,
      analysis.sourceMethod,
      analysis.aiLikelihood,
      analysis.confidence,
      analysis.modelName,
      analysis.analysisTime,
      analysis.method,
      analysis.reasoning,
      JSON.stringify(analysis.statisticalBreakdown),
      JSON.stringify(analysis.llmAnalysis),
      analysis.fromCache ? 1 : 0,
      analysis.sessionId
    ];

    return this.run(sql, params);
  }

  async insertFeedback(feedback) {
    const sql = `
      INSERT INTO feedback (
        id, analysis_id, feedback_type, rating, corrected_likelihood,
        corrected_confidence, reason_category, reason_text, user_expertise,
        is_helpful, timestamp, session_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      feedback.id,
      feedback.analysisId,
      feedback.feedbackType,
      feedback.rating,
      feedback.correctedLikelihood,
      feedback.correctedConfidence,
      feedback.reasonCategory,
      feedback.reasonText,
      feedback.userExpertise,
      feedback.isHelpful ? 1 : 0,
      feedback.timestamp,
      feedback.sessionId
    ];

    return this.run(sql, params);
  }

  async getAnalysisTrends(days = 7) {
    const sql = `
      SELECT 
        date(timestamp / 1000, 'unixepoch') as date,
        COUNT(*) as count,
        AVG(ai_likelihood) as avg_likelihood,
        AVG(confidence) as avg_confidence,
        COUNT(CASE WHEN ai_likelihood > 70 THEN 1 END) as high_ai_count,
        COUNT(CASE WHEN ai_likelihood < 30 THEN 1 END) as human_count
      FROM analyses 
      WHERE timestamp > ? 
      GROUP BY date(timestamp / 1000, 'unixepoch')
      ORDER BY date
    `;

    const since = Date.now() - (days * 24 * 60 * 60 * 1000);
    return this.all(sql, [since]);
  }

  async getModelPerformance() {
    const sql = `
      SELECT 
        model_name,
        COUNT(*) as usage_count,
        AVG(analysis_time) as avg_response_time,
        AVG(confidence) as avg_confidence,
        MAX(timestamp) as last_used,
        COUNT(CASE WHEN f.rating = 1 THEN 1 END) as positive_feedback,
        COUNT(CASE WHEN f.rating = -1 THEN 1 END) as negative_feedback
      FROM analyses a
      LEFT JOIN feedback f ON a.id = f.analysis_id
      WHERE model_name IS NOT NULL
      GROUP BY model_name
      ORDER BY usage_count DESC
    `;

    return this.all(sql);
  }

  async getFeedbackStats() {
    const sql = `
      SELECT 
        COUNT(*) as total_feedback,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as positive,
        COUNT(CASE WHEN rating = -1 THEN 1 END) as negative,
        AVG(CASE WHEN corrected_likelihood IS NOT NULL THEN 
          ABS(corrected_likelihood - (
            SELECT ai_likelihood FROM analyses WHERE id = feedback.analysis_id
          )) END) as avg_correction_magnitude
      FROM feedback
      WHERE timestamp > ?
    `;

    const since = Date.now() - (30 * 24 * 60 * 60 * 1000); // Last 30 days
    return this.get(sql, [since]);
  }

  async getContentInsights() {
    const sql = `
      SELECT 
        CASE 
          WHEN content_length < 500 THEN 'short'
          WHEN content_length < 2000 THEN 'medium' 
          ELSE 'long'
        END as content_category,
        COUNT(*) as count,
        AVG(ai_likelihood) as avg_likelihood,
        AVG(confidence) as avg_confidence
      FROM analyses
      WHERE content_length IS NOT NULL
      GROUP BY content_category
    `;

    return this.all(sql);
  }

  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          } else {
            console.log('Database connection closed');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = AnalyticsDB; 
/**
 * InposterAI Analytics Dashboard Server
 * Local Express.js server for rich analytics and insights
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

const AnalyticsDB = require('./src/analytics-db');
const AnalyticsProcessor = require('./src/analytics-processor');

class DashboardServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.server = null;
    this.wss = null;
    this.db = new AnalyticsDB();
    this.processor = new AnalyticsProcessor(this.db);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  setupMiddleware() {
    // Enable CORS for extension communication
    this.app.use(cors({
      origin: ['chrome-extension://*', 'opera-extension://*', 'http://localhost:*'],
      credentials: true
    }));

    // Parse JSON payloads
    this.app.use(express.json({ limit: '10mb' }));
    
    // Serve static files
    this.app.use(express.static(path.join(__dirname, 'public')));
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: Date.now(),
        version: '1.0.0'
      });
    });

    // Analytics Routes
    this.app.post('/api/analysis', async (req, res) => {
      try {
        const analysisData = req.body;
        const result = await this.processor.recordAnalysis(analysisData);
        
        // Broadcast to connected WebSocket clients
        this.broadcastUpdate('analysis', result);
        
        res.json({ success: true, id: result.id });
      } catch (error) {
        console.error('Analysis recording error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/feedback', async (req, res) => {
      try {
        const feedbackData = req.body;
        const result = await this.processor.recordFeedback(feedbackData);
        
        // Broadcast feedback update
        this.broadcastUpdate('feedback', result);
        
        res.json({ success: true, id: result.id });
      } catch (error) {
        console.error('Feedback recording error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Analytics Data Routes
    this.app.get('/api/analytics/overview', async (req, res) => {
      try {
        const overview = await this.processor.getOverview();
        res.json(overview);
      } catch (error) {
        console.error('Overview fetch error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/analytics/trends', async (req, res) => {
      try {
        const { period = '7d', metric = 'count' } = req.query;
        const trends = await this.processor.getTrends(period, metric);
        res.json(trends);
      } catch (error) {
        console.error('Trends fetch error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/analytics/accuracy', async (req, res) => {
      try {
        const accuracy = await this.processor.getAccuracyMetrics();
        res.json(accuracy);
      } catch (error) {
        console.error('Accuracy fetch error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/analytics/models', async (req, res) => {
      try {
        const models = await this.processor.getModelPerformance();
        res.json(models);
      } catch (error) {
        console.error('Model performance fetch error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/analytics/content', async (req, res) => {
      try {
        const content = await this.processor.getContentInsights();
        res.json(content);
      } catch (error) {
        console.error('Content insights fetch error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/analytics/export', async (req, res) => {
      try {
        const { format = 'json', startDate, endDate } = req.query;
        const data = await this.processor.exportData(format, startDate, endDate);
        
        if (format === 'csv') {
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename="analytics.csv"');
        } else {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', 'attachment; filename="analytics.json"');
        }
        
        res.send(data);
      } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Enhanced analytics endpoints
    this.app.get('/api/analytics/timing', async (req, res) => {
      try {
        const timing = await this.processor.getTimingAnalysis();
        res.json(timing);
      } catch (error) {
        console.error('Timing analysis error:', error);
        res.status(500).json({ error: 'Failed to get timing analysis' });
      }
    });

    this.app.get('/api/analytics/system', async (req, res) => {
      try {
        const system = await this.processor.getSystemSummary();
        res.json(system);
      } catch (error) {
        console.error('System summary error:', error);
        res.status(500).json({ error: 'Failed to get system summary' });
      }
    });

    this.app.get('/api/analytics/performance', async (req, res) => {
      try {
        const performance = await this.processor.getPerformanceInsights();
        res.json(performance);
      } catch (error) {
        console.error('Performance insights error:', error);
        res.status(500).json({ error: 'Failed to get performance insights' });
      }
    });

    // Enhanced Analytics Endpoints
    this.app.get('/api/analytics/heatmap/:period?', async (req, res) => {
      try {
        const period = req.params.period || '30d';
        const data = await this.processor.getDetectionHeatmap(period);
        res.json(data);
      } catch (error) {
        console.error('Heatmap analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch heatmap data' });
      }
    });

    this.app.get('/api/analytics/temporal/:granularity?/:period?', async (req, res) => {
      try {
        const granularity = req.params.granularity || 'hourly';
        const period = req.params.period || '7d';
        const data = await this.processor.getTemporalPatterns(granularity, period);
        res.json(data);
      } catch (error) {
        console.error('Temporal analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch temporal data' });
      }
    });

    this.app.get('/api/analytics/content-intelligence', async (req, res) => {
      try {
        const data = await this.processor.getContentTypeIntelligence();
        res.json(data);
      } catch (error) {
        console.error('Content intelligence error:', error);
        res.status(500).json({ error: 'Failed to fetch content intelligence' });
      }
    });

    this.app.get('/api/analytics/model-performance', async (req, res) => {
      try {
        const data = await this.processor.getModelPerformance();
        res.json(data);
      } catch (error) {
        console.error('Model performance error:', error);
        res.status(500).json({ error: 'Failed to fetch model performance' });
      }
    });

    this.app.get('/api/analytics/learning-curve', async (req, res) => {
      try {
        const data = await this.processor.getUserLearningCurve();
        res.json(data);
      } catch (error) {
        console.error('Learning curve error:', error);
        res.status(500).json({ error: 'Failed to fetch learning curve' });
      }
    });

    this.app.get('/api/analytics/linguistic-patterns', async (req, res) => {
      try {
        const data = await this.processor.getLinguisticPatterns();
        res.json(data);
      } catch (error) {
        console.error('Linguistic patterns error:', error);
        res.status(500).json({ error: 'Failed to fetch linguistic patterns' });
      }
    });

    this.app.get('/api/analytics/cache-performance', async (req, res) => {
      try {
        const data = await this.processor.getCachePerformance();
        res.json(data);
      } catch (error) {
        console.error('Cache performance error:', error);
        res.status(500).json({ error: 'Failed to fetch cache performance' });
      }
    });

    this.app.get('/api/analytics/error-analysis', async (req, res) => {
      try {
        const data = await this.processor.getFalsePositiveAnalysis();
        res.json(data);
      } catch (error) {
        console.error('Error analysis error:', error);
        res.status(500).json({ error: 'Failed to fetch error analysis' });
      }
    });

    // Dashboard route
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // Catch-all for SPA routing
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
  }

  setupWebSocket() {
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });

    this.wss.on('connection', (ws) => {
      console.log('WebSocket client connected');
      
      // Send initial data
      ws.send(JSON.stringify({
        type: 'connected',
        timestamp: Date.now()
      }));

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  broadcastUpdate(type, data) {
    if (!this.wss) return;

    const message = JSON.stringify({
      type: type,
      data: data,
      timestamp: Date.now()
    });

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  async start() {
    try {
      // Initialize database
      await this.db.initialize();
      console.log('Database initialized');

      // Start server
      this.server.listen(this.port, 'localhost', () => {
        console.log(`🚀 InposterAI Dashboard running at http://localhost:${this.port}`);
        console.log(`📊 Analytics API available at http://localhost:${this.port}/api`);
        console.log(`🔌 WebSocket server ready for real-time updates`);
      });
    } catch (error) {
      console.error('Failed to start dashboard server:', error);
      process.exit(1);
    }
  }

  async stop() {
    if (this.server) {
      this.server.close();
    }
    if (this.db) {
      await this.db.close();
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down dashboard server...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down dashboard server...');
  await server.stop();
  process.exit(0);
});

// Start server
const server = new DashboardServer();
server.start();

module.exports = DashboardServer; 
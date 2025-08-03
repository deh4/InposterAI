# InposterAI Analytics Dashboard

A local Express.js server that provides rich analytics and insights for the InposterAI browser extension. The dashboard runs entirely on your machine, ensuring complete privacy while offering comprehensive analysis tracking and performance monitoring.

## 🚀 Features

### 📊 **Real-time Analytics**
- **Live Analysis Tracking**: Real-time updates via WebSocket connections
- **Daily/Weekly/Monthly Trends**: Comprehensive trend analysis with customizable time periods
- **Performance Metrics**: Model response times, accuracy scores, and usage statistics
- **Confidence Calibration**: Understand how well your confidence scores match actual accuracy

### 🎯 **Insights & Reporting**
- **Content Analysis**: Breakdown by content length, domain, and content type
- **Model Performance**: Compare different AI models' speed and accuracy
- **Feedback Analytics**: Track user feedback and correction patterns
- **Accuracy Analysis**: Detailed error analysis and pattern recognition

### 🔒 **Privacy & Security**
- **Local-Only**: All data stays on your machine
- **SQLite Database**: Lightweight, file-based storage
- **No External Dependencies**: Works completely offline
- **Data Export**: Full control over your analytics data

## 📋 Prerequisites

- **Node.js**: v14.0.0 or newer
- **npm**: v6.0.0 or newer
- **InposterAI Extension**: Browser extension must be installed and configured

## ⚡ Quick Start

### 1. Installation

```bash
# Navigate to dashboard directory
cd dashboard

# Install dependencies
npm install

# Optional: Install nodemon globally for development
npm run install-global
```

### 2. Start the Server

```bash
# Production mode
npm start

# Development mode (auto-restart on changes)
npm run dev
```

### 3. Generate Test Data (Optional)

To visualize the dashboard with sample data:

```bash
# Generate 100 dummy analysis entries
npm run populate-data

# Clear existing data and generate fresh entries
npm run populate-clear

# Generate custom number of entries
npm run populate-custom 50
```

### 4. Access Dashboard

Open your browser and navigate to:
```
http://localhost:3000
```

The dashboard will automatically start collecting data from your browser extension.

## 🏗️ Architecture

### **Server Components**

```
dashboard/
├── server.js                 # Main Express.js server
├── src/
│   ├── analytics-db.js       # SQLite database manager
│   └── analytics-processor.js # Data processing and insights
├── public/
│   ├── index.html           # Dashboard interface
│   ├── styles.css           # Dashboard styling
│   └── dashboard.js         # Client-side logic
├── data/
│   └── analytics.db         # SQLite database (auto-created)
└── package.json             # Dependencies and scripts
```

### **API Endpoints**

#### Health & Status
- `GET /api/health` - Server health check
- `GET /` - Dashboard web interface

#### Data Collection
- `POST /api/analysis` - Record new analysis data
- `POST /api/feedback` - Record user feedback

#### Analytics & Insights
- `GET /api/analytics/overview` - General statistics overview
- `GET /api/analytics/trends?period=7d` - Analysis trends over time
- `GET /api/analytics/accuracy` - Confidence calibration and error analysis
- `GET /api/analytics/models` - Model performance comparison
- `GET /api/analytics/content` - Content type and domain insights

#### Data Export
- `GET /api/analytics/export?format=json` - Export all data

### **Database Schema**

The dashboard uses SQLite with the following main tables:

- **`analyses`**: Core analysis records with results and metadata
- **`feedback`**: User feedback and corrections
- **`model_performance`**: Aggregated model performance metrics
- **`sessions`**: User session tracking
- **`system_metrics`**: System health and performance data

## 🎨 Dashboard Features

### **Overview Cards**
- Total analyses count with daily breakdown
- AI detection rate vs human content rate
- Average confidence scores and trends
- Feedback rate and satisfaction metrics

### **Interactive Charts**
- **Analysis Trends**: Time-series charts with customizable periods
- **Model Performance**: Bar charts comparing different AI models
- **Confidence Calibration**: Accuracy vs confidence correlation
- **Content Analysis**: Pie charts for content types and domains

### **Real-time Updates**
- WebSocket connection for instant notifications
- Live chart updates when new analyses are recorded
- Real-time performance monitoring

### **Data Export**
- JSON format export with date range filtering
- CSV export for external analysis
- Complete data portability

## 🔧 Configuration

### **Environment Variables**

```bash
# Server port (default: 3000)
PORT=3000

# Database location (default: ./data/analytics.db)
DB_PATH=/path/to/analytics.db
```

### **Extension Integration**

The dashboard automatically receives data from the InposterAI browser extension. Ensure:

1. Extension is installed and active
2. Ollama is running and configured
3. No firewall blocking localhost:3000

## 🛠️ Development

### **Running in Development Mode**

```bash
# Start with auto-restart
npm run dev

# The server will restart automatically when files change
```

### **Adding New Analytics**

1. **Add Database Schema**: Update `analytics-db.js` with new tables/columns
2. **Process Data**: Add processing logic in `analytics-processor.js`
3. **Create API Endpoint**: Add new routes in `server.js`
4. **Update Frontend**: Add charts/visualizations in `dashboard.js`

### **Custom Insights**

Example of adding a new insight:

```javascript
// In analytics-processor.js
async getCustomInsight() {
  const sql = `
    SELECT 
      DATE(timestamp / 1000, 'unixepoch') as date,
      COUNT(*) as count,
      AVG(confidence) as avg_confidence
    FROM analyses 
    WHERE ai_likelihood > 80
    GROUP BY date
  `;
  return this.db.all(sql);
}

// In server.js
this.app.get('/api/analytics/custom', async (req, res) => {
  const data = await this.processor.getCustomInsight();
  res.json(data);
});
```

## 📊 Analytics Insights Explained

### **Confidence Calibration**
Shows how often your stated confidence matches actual accuracy. Well-calibrated models show a diagonal line (90% confidence = 90% accuracy).

### **Model Performance**
Compares different AI models on:
- **Response Time**: How fast the model generates results
- **Usage Count**: How often each model is used
- **Feedback Ratio**: Positive vs negative user feedback

### **Content Analysis**
Breaks down analyses by:
- **Content Length**: Short (<500 words), Medium (500-2000), Long (>2000)
- **Domain Categories**: Social media, blogs, news, technical content
- **Detection Patterns**: Which content types are flagged most often

### **Accuracy Metrics**
- **False Positive Rate**: Human content incorrectly flagged as AI
- **False Negative Rate**: AI content not detected
- **Confidence Intervals**: Statistical confidence in predictions

## 🔍 Troubleshooting

### **Dashboard Won't Start**

```bash
# Check if port is already in use
lsof -i :3000

# Try a different port
PORT=3001 npm start
```

### **No Data Appearing**

1. **Check Extension**: Ensure browser extension is active
2. **Check Network**: Verify localhost:3000 is accessible
3. **Check Database**: Look for `data/analytics.db` file
4. **Check Console**: Look for errors in browser developer tools

### **WebSocket Connection Fails**

1. **Firewall**: Check if port 3000 is blocked
2. **Browser Security**: Some browsers block WebSocket connections to localhost
3. **Proxy/VPN**: Disable if causing connection issues

### **Performance Issues**

1. **Database Size**: Large databases (>100MB) may slow queries
2. **Chart Rendering**: Too much data can slow chart rendering
3. **Memory Usage**: Monitor Node.js memory consumption

## 📝 API Reference

### **Analysis Data Format**

```json
{
  "id": "uuid",
  "timestamp": 1234567890,
  "url": "https://example.com/article",
  "title": "Article Title",
  "contentLength": 1250,
  "aiLikelihood": 75,
  "confidence": 89,
  "modelName": "gemma2:3b",
  "method": "ensemble",
  "reasoning": "Analysis reasoning...",
  "statisticalBreakdown": {...},
  "fromCache": false
}
```

### **Feedback Data Format**

```json
{
  "analysisId": "uuid",
  "feedbackType": "correction",
  "rating": 1,
  "correctedLikelihood": 25,
  "reasonCategory": "false_positive",
  "reasonText": "This is clearly human-written",
  "userExpertise": "expert"
}
```

## 🤝 Contributing

1. **Fork the Repository**
2. **Create Feature Branch**: `git checkout -b feature/new-insight`
3. **Make Changes**: Add new analytics or improve existing ones
4. **Test Thoroughly**: Ensure all endpoints work correctly
5. **Submit Pull Request**: Include detailed description of changes

## 📄 License

This project is licensed under the MIT License - see the main project LICENSE file for details.

---

**Built with ❤️ for privacy-conscious developers who want deep insights into their AI detection workflows.** 
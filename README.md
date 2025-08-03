# InposterAI - AI Content Detection Browser Extension

A privacy-focused browser extension that helps users identify AI-generated content using local analysis with Ollama. Designed for Opera but compatible with Chromium-based browsers.

## ✨ Features

### 🎯 **Core Analysis**
- **Ensemble AI Detection**: Combines statistical analysis with local LLM inference
- **Multi-dimensional Scoring**: Perplexity, burstiness, vocabulary diversity, and linguistic patterns
- **Real-time Analysis**: Fast content extraction and processing
- **Cache System**: Efficient analysis with intelligent caching

### 🤖 **Local AI Integration**
- **Ollama Integration**: Uses your locally running models (Gemma, Phi-4, etc.)
- **Dynamic Model Selection**: Automatically detects and allows selection of available models
- **Model Information**: Shows model size, family, and capabilities
- **Privacy-First**: All processing happens locally on your machine

### 🎨 **User Interface**
- **Popup Analysis**: Comprehensive analysis with detailed breakdowns
- **Highlighted Text Analysis**: Right-click any selected text for quick analysis
- **In-Page Results Badge**: Persistent floating badge with analysis summary
- **Progress Indicators**: Visual feedback during analysis
- **Statistical Breakdown**: Color-coded metrics and confidence scores

### 📊 **Advanced Features**
- **Analysis History**: Track and review past analyses
- **Feedback Collection**: Help improve accuracy with thumbs up/down ratings
- **Detailed Corrections**: Specify AI/human percentages and provide reasoning
- **Smart Anonymization**: Privacy-preserving feedback data collection
- **Analytics Dashboard**: View feedback statistics and model performance

### 🎯 **Analytics Dashboard**
- **Local Analytics Server**: Express.js dashboard running on localhost:3000
- **Real-time Updates**: WebSocket connections for live data updates
- **Comprehensive Insights**: Model performance, accuracy trends, content analysis
- **Data Export**: JSON/CSV export for external analysis
- **Privacy-First**: All analytics data stays on your machine

## 📊 **Data Model & Analytics**

### **Data Points Captured**

#### **🔍 Analysis Data**
- **Core Metrics**: AI likelihood (0-100%), confidence level, analysis method
- **Content Metadata**: URL, title, word count, domain, language, reading time
- **Performance**: Analysis duration, cache hits, extraction method
- **Statistical Breakdown**: Perplexity, burstiness, vocabulary diversity, AI indicators
- **LLM Analysis**: Raw model response, reasoning, detected patterns
- **Browser Context**: Extension version, user agent, timestamp

#### **👍 Feedback Data**
- **User Ratings**: Thumbs up/down feedback system
- **Detailed Corrections**: User-corrected AI/human percentages
- **Error Classification**: False positive/negative categorization
- **User Expertise**: Beginner/intermediate/expert tracking
- **Feedback Context**: Reason categories, free-text explanations, helpfulness ratings

#### **📈 Session Tracking**
- **Session Management**: Daily session IDs, cross-tab consistency
- **Usage Patterns**: Analysis frequency, content types, domains
- **Performance Metrics**: Cache efficiency, response times, retry counts

### **Analytics Insights Available**

#### **🎯 Model Performance**
- **Accuracy Trends**: Track model performance over time
- **Confidence Calibration**: Compare confidence vs actual accuracy
- **Error Analysis**: Identify common false positives/negatives
- **A/B Testing**: Compare different models and settings

#### **📊 Content Analysis**
- **Domain Insights**: Which websites trigger AI detection most
- **Content Type Patterns**: Blog vs news vs academic detection rates
- **Length Correlation**: How content length affects accuracy
- **Language Detection**: Multilingual content analysis patterns

#### **👤 User Behavior**
- **Feedback Patterns**: User agreement with AI predictions
- **Expertise Correlation**: How user expertise affects feedback quality
- **Usage Analytics**: Peak usage times, most analyzed content types
- **Feature Adoption**: Which features are used most frequently

#### **⚡ System Performance**
- **Cache Efficiency**: Hit rates and performance improvements
- **Response Times**: Analysis speed across different content types
- **Resource Usage**: Extension performance impact tracking
- **Error Monitoring**: Failed analyses and connection issues

### 🔧 **Analysis Methods**
- **Statistical Analysis**: 
  - Perplexity scoring
  - Sentence length variance
  - Vocabulary diversity
  - AI indicator word detection
  - Passive voice analysis
- **LLM Analysis**: Context-aware content evaluation with local models
- **Ensemble Scoring**: Intelligent combination of multiple detection methods

## 🚀 Quick Start

### Prerequisites

- **Node.js**: v18.19.0 or newer (use `nvm` for version management)
- **Ollama**: v0.9.7 or newer with CORS enabled
- **Browser**: Opera, Chrome, or other Chromium-based browser

### Ollama Setup

1. **Install Ollama** from [ollama.ai](https://ollama.ai)

2. **Enable CORS** (required for browser extension access):
   
   **For macOS** (persistent setup):
   ```bash
   # Set environment variables permanently
   sudo launchctl setenv OLLAMA_ORIGINS "*"
   sudo launchctl setenv OLLAMA_HOST "0.0.0.0:11434"
   
   # Restart Ollama service
   brew services restart ollama
   
   # Verify settings
   launchctl getenv OLLAMA_ORIGINS
   launchctl getenv OLLAMA_HOST
   ```

   **For Linux/Windows**:
   ```bash
   # Set environment variables before starting
   export OLLAMA_ORIGINS="*"
   export OLLAMA_HOST="0.0.0.0:11434"
   ollama serve
   ```

3. **Install a model** (recommended):
   ```bash
   ollama pull gemma2:3b
   # or
   ollama pull phi3:mini
   ```

### Extension Setup

1. **Clone and build**:
   ```bash
   git clone <repository-url>
   cd InposterAI
   nvm use  # Uses Node.js v18.19.0
   npm install
   npm run build
   ```
2. **Load in browser**:
   - Open Opera and go to `opera://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder
   - Pin the extension for easy access

### Analytics Dashboard (Optional)
3. **Start analytics dashboard**:
   ```bash
   cd dashboard
   npm install
   npm start
   ```
4. **Access dashboard**: Open http://localhost:3000 in your browser

## 🛠️ Development

### Scripts

```bash
npm run build      # Build for production
npm run dev        # Build for development
npm run watch      # Watch mode for development
npm run lint       # Run ESLint
npm run format     # Format with Prettier
npm run test       # Run Jest tests
npm run clean      # Clean build outputs
```

### Project Structure

```
InposterAI/
├── src/
│   ├── background/          # Service worker
│   │   └── background.js    # Main background script
│   ├── content/             # Content scripts
│   │   └── content.js       # Page content analysis
│   ├── popup/               # Extension popup
│   │   ├── popup.html       # Popup interface
│   │   ├── popup.css        # Popup styling
│   │   └── popup.js         # Popup logic
│   ├── shared/              # Shared utilities
│   │   ├── ollama-client.js # Ollama API integration
│   │   ├── statistical-analyzer.js # Statistical analysis
│   │   ├── text-formatter.js # Text formatting utilities
│   │   ├── feedback-manager.js # Feedback collection system
│   │   └── feedback-ui.js   # Feedback UI components
│   ├── assets/              # Icons and static files
│   └── manifest.json        # Extension manifest
├── dashboard/               # Analytics dashboard server
│   ├── server.js           # Express.js server
│   ├── src/                # Server-side modules
│   │   ├── analytics-db.js # SQLite database manager
│   │   └── analytics-processor.js # Data processing
│   ├── public/             # Dashboard web interface
│   │   ├── index.html      # Dashboard UI
│   │   ├── styles.css      # Dashboard styling
│   │   └── dashboard.js    # Client-side logic
│   ├── scripts/            # Utility scripts
│   │   └── populate-dummy-data.js # Generate test data
│   ├── data/               # Database storage (auto-created)
│   └── package.json        # Dashboard dependencies
├── tests/                   # Test files
├── dist/                    # Built extension (auto-generated)
├── webpack.config.cjs       # Webpack configuration
├── eslint.config.js         # ESLint configuration
├── .prettierrc              # Prettier configuration
├── jest.config.cjs          # Jest configuration
├── package.json             # Project dependencies
└── README.md               # This file
```

## 🔍 How It Works

### Analysis Pipeline

1. **Content Extraction**: Intelligent parsing of article content from web pages
2. **Statistical Analysis**: Fast pre-processing with linguistic pattern detection
3. **LLM Analysis**: Deep analysis using your local Ollama model
4. **Ensemble Scoring**: Weighted combination of all analysis methods
5. **Result Presentation**: Clear scoring with detailed explanations

### Privacy & Security

- **Local Processing**: All analysis happens on your machine
- **No Data Collection**: Content never leaves your device
- **Anonymous Feedback**: Optional feedback is anonymized and stored locally
- **CORS Security**: Controlled access to local Ollama instance

### Feedback System

- **Immediate Feedback**: Rate analysis accuracy with thumbs up/down
- **Detailed Corrections**: Specify exact AI/human percentages
- **Reason Categories**: Categorized feedback for different error types
- **Session Tracking**: Daily session management with expertise levels
- **Data Retention**: 90-day automatic cleanup of feedback data
- **Export Capability**: Export feedback data for model improvement

## 🧪 Usage Examples

### Popup Analysis
1. Click the extension icon
2. Click "Analyze Current Page"
3. Review detailed analysis results
4. Provide feedback to improve accuracy
5. Adjust model settings as needed

### Quick Text Analysis
1. Highlight any text on a webpage
2. Right-click and select "Quick AI Analysis"
3. View instant analysis overlay
4. Rate the analysis accuracy
5. See persistent page badge with results

### Model Management
1. Open extension settings
2. View available Ollama models
3. Select preferred model for analysis
4. Refresh model list when needed

### Analytics Dashboard
1. Start the dashboard server: `cd dashboard && npm start`
2. Open http://localhost:3000 in your browser
3. View real-time analytics as you use the extension
4. Export data for external analysis
5. Monitor model performance and accuracy trends

### Data Model Architecture

The analytics system uses a SQLite database with the following core tables:

#### **Analyses Table**
```sql
CREATE TABLE analyses (
  id TEXT PRIMARY KEY,              -- Unique analysis identifier
  timestamp INTEGER,               -- Analysis timestamp
  url TEXT,                        -- Analyzed page URL
  title TEXT,                      -- Page title
  content_length INTEGER,          -- Text word count
  ai_likelihood INTEGER,           -- AI probability (0-100)
  confidence INTEGER,              -- Model confidence (0-100)
  model_name TEXT,                 -- AI model used
  analysis_time INTEGER,           -- Processing time (ms)
  reasoning TEXT,                  -- LLM explanation
  statistical_breakdown TEXT,      -- JSON statistical metrics
  session_id TEXT,                 -- Daily session identifier
  language TEXT,                   -- Content language
  domain TEXT,                     -- Website domain
  reading_time INTEGER,            -- Estimated reading time
  browser_info TEXT,               -- Browser context JSON
  performance_info TEXT           -- Performance metrics JSON
);
```

#### **Feedback Table**
```sql
CREATE TABLE feedback (
  id TEXT PRIMARY KEY,              -- Unique feedback identifier
  analysis_id TEXT,                -- Links to analyses table
  feedback_type TEXT,              -- 'simple' or 'detailed'
  rating INTEGER,                  -- User rating (-1, 0, 1)
  corrected_likelihood INTEGER,    -- User correction (0-100)
  reason_category TEXT,            -- Error classification
  reason_text TEXT,                -- User explanation
  user_expertise TEXT,             -- User skill level
  is_helpful BOOLEAN,              -- Feedback helpfulness
  timestamp INTEGER,               -- Feedback timestamp
  session_id TEXT                  -- Session identifier
);
```

### Data Flow Process

1. **Content Analysis**: Extension extracts page content and metadata
2. **AI Processing**: Ollama performs statistical and LLM analysis
3. **Data Enhancement**: Browser context and performance metrics added
4. **Dashboard Storage**: SQLite database stores normalized data
5. **Real-time Analytics**: WebSocket updates provide live insights
6. **Feedback Loop**: User corrections improve model understanding

### Advanced Analytics
1. **Confidence Calibration**: Check how often your confidence matches actual accuracy
2. **Model Comparison**: Compare performance between different Ollama models
3. **Content Insights**: Analyze detection patterns by content type and domain
4. **Feedback Analytics**: Track user corrections and improvement opportunities
5. **Data Export**: Export complete analytics data in JSON or CSV format

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests if needed
5. Run linting and formatting
6. Submit a pull request

### Development Guidelines

- Follow existing code style (enforced by ESLint/Prettier)
- Add JSDoc comments for new functions
- Update tests for new features
- Ensure all builds pass
- Test with multiple Ollama models

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Ollama**: For providing excellent local LLM infrastructure
- **Opera**: For the browser extension platform
- **Open Source Community**: For the tools and libraries that make this possible

## 🐛 Troubleshooting

### Common Issues

**"Could not establish connection"**
- Ensure content script is loaded (refresh page)
- Check browser console for errors

**"Ollama analysis failed: HTTP 403"**
- Verify Ollama CORS settings (see Ollama Setup above)
- Ensure Ollama v0.9.7+ is installed
- Restart Ollama service after environment changes

**"No models available"**
- Install at least one model: `ollama pull gemma2:3b`
- Refresh model list in extension settings
- Check Ollama is running: `ollama list`

**Extension not loading**
- Check `dist` folder exists (run `npm run build`)
- Verify all files are present in build output
- Check browser console for loading errors

**"Analytics dashboard not loading"**
- Ensure dashboard server is running: `cd dashboard && npm start`
- Check if port 3000 is available: `lsof -i :3000`
- Try a different port: `PORT=3001 npm start`
- Check firewall isn't blocking localhost connections

**"No data in dashboard"**
- Use the extension to analyze some content first
- Check browser console for connection errors
- Verify extension can reach localhost:3000
- Restart both extension and dashboard server

### Performance Tips

- Use smaller models (3B parameters) for faster analysis
- Enable analysis caching for repeated content
- Adjust confidence thresholds based on your needs
- Provide feedback to improve model accuracy over time

---

**Built with ❤️ for privacy-conscious users who want local AI content detection.** 
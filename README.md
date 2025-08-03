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

### Performance Tips

- Use smaller models (3B parameters) for faster analysis
- Enable analysis caching for repeated content
- Adjust confidence thresholds based on your needs
- Provide feedback to improve model accuracy over time

---

**Built with ❤️ for privacy-conscious users who want local AI content detection.** 
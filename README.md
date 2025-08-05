# InposterAI - AI Content Detection Browser Extension

A privacy-focused browser extension that helps users identify AI-generated content using both local analysis with Ollama and cloud models like Google Gemini API. Designed for Chromium-based browsers including Opera, Chrome, Brave, and Edge.

## ✨ Features

### 🎯 **Core Analysis**
- **Ensemble AI Detection**: Combines statistical analysis with LLM inference for enhanced accuracy
- **Multi-dimensional Scoring**: Analyzes perplexity, burstiness, vocabulary diversity, and linguistic patterns
- **Real-time Analysis**: Fast content extraction and processing with intelligent tooltip positioning
- **Cache System**: Efficient analysis with intelligent caching to avoid redundant API calls

### 🤖 **Local AI Integration**
- **Ollama Integration**: Uses your locally running models (Gemma, Phi-4, Llama3, etc.)
- **Dynamic Model Detection**: Automatically detects and allows selection of available local models
- **Offline Capability**: Analyze content without internet connection using local models
- **Custom System Instructions**: Personalize LLM analysis with custom prompts

### ☁️ **Cloud AI Integration**
- **Google Gemini API**: Integrate with Google's powerful Gemini models for enhanced detection
- **Smart Model Selection**: Unified interface for both local and cloud models
- **API Key Management**: Secure storage and validation of cloud API credentials
- **Intelligent Routing**: Automatically prioritizes available services based on user preferences

### 📊 **Dashboard & Analytics**
- **Local Dashboard**: View detailed analysis history and performance trends
- **Model Performance Tracking**: Compare accuracy and response times across different models
- **Usage Analytics**: Monitor API usage and stay within rate limits
- **Privacy-focused**: All data stored locally, no external servers required

### 🔧 **Advanced Features**
- **Custom System Instructions**: Fine-tune analysis behavior with personalized prompts
- **Precision Tooltip Positioning**: Analysis tooltip appears right after selected text
- **Settings Persistence**: All preferences automatically saved and restored
- **Feedback System**: Improve model accuracy through user corrections

## 🚀 Getting Started

### Prerequisites
- **Node.js** (LTS version recommended)
- **npm** (Node Package Manager)
- **Ollama** (for local AI models) - [Install Ollama](https://ollama.ai/)
- **Google API Key** (optional, for cloud models) - [Get API Key](https://ai.google.dev/)

### Installation

#### 1. Clone and Build
```bash
git clone https://github.com/your-username/InposterAI.git
cd InposterAI
npm install
npm run build
```

#### 2. Load into Browser
**Chrome/Opera/Brave/Edge:**
1. Go to `chrome://extensions` (or equivalent for your browser)
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select the `dist` folder

**Firefox:**
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select any file inside the `dist` folder (e.g., `manifest.json`)

#### 3. Setup Models

**Local Models (Ollama):**
```bash
# Install and start Ollama
ollama pull gemma2:3b
ollama pull phi3:mini
# The extension will automatically detect available models
```

**Cloud Models (Optional):**
1. Get a Google AI API key from [ai.google.dev](https://ai.google.dev/)
2. Open extension settings
3. Go to "Cloud Models" tab
4. Enter your API key and select preferred models

### Configuration

#### Access Settings
Click the InposterAI extension icon in your browser toolbar to access settings.

#### Analysis Methods
- **Ensemble (Recommended)**: Combines statistical + LLM analysis
- **LLM Only**: Uses selected language model for analysis
- **Statistical Only**: Fast analysis using statistical methods

#### Model Selection
Choose from unified dropdown containing:
- **Local Models**: Ollama models installed on your system
- **Cloud Models**: Google Gemini models (requires API key)

## 📊 Dashboard (Optional)

Run the local analytics dashboard to view detailed insights:

```bash
cd dashboard
npm install
npm start
```

Access dashboard at `http://localhost:3000`

### Dashboard Features
- **Model Performance**: Compare accuracy across different models
- **Usage Analytics**: Track API calls and response times
- **Accuracy Trends**: Monitor detection accuracy over time
- **Feedback Analysis**: Review user corrections and improvements

## 🛠️ Development

### Project Structure
```
InposterAI/
├── src/                          # Extension source code
│   ├── background/               # Service worker
│   ├── content/                  # Content scripts
│   ├── settings/                 # Settings page
│   ├── shared/                   # Shared utilities
│   │   ├── ollama-client.js      # Local AI integration
│   │   ├── google-client.js      # Cloud AI integration
│   │   └── statistical-analyzer.js
│   └── manifest.json
├── dashboard/                    # Analytics dashboard
│   ├── src/                      # Dashboard backend
│   ├── public/                   # Dashboard frontend
│   └── data/                     # Local database
├── dist/                         # Built extension
└── webpack.config.cjs            # Build configuration
```

### Available Scripts
```bash
npm run build         # Build extension for production
npm run dev           # Build and watch for development
npm run lint          # Check code quality
npm run lint:fix      # Auto-fix linting issues
npm run clean         # Clean build artifacts
```

### Adding New Cloud Providers

The extension is designed for easy expansion to new cloud AI providers:

1. Create a new client class in `src/shared/` (following `google-client.js` pattern)
2. Add provider to unified model selection in `settings.js`
3. Update routing logic in `background.js`

## 🔒 Privacy & Security

- **Local-First**: All analysis data stored locally on your device
- **No Tracking**: Extension doesn't collect or transmit personal data
- **Secure API Keys**: Cloud API keys stored in browser's secure storage
- **Open Source**: Full transparency with open source code

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Ollama Team** for excellent local AI infrastructure
- **Google AI** for Gemini API access
- **Community Contributors** for feedback and improvements

---

**Version**: 1.0.0 | **Last Updated**: August 2025 
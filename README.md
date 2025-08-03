# AI Content Detector Browser Extension

An open-source Opera browser extension that analyzes web articles to determine if they were written by AI or humans, running completely locally using Ollama.

## 🎯 Features

- **Local AI Analysis**: Uses Ollama (Gemma 3B/Phi-4) for completely private, offline content analysis
- **Real-time Detection**: Analyze articles as you browse
- **Privacy-First**: No data leaves your machine
- **Open Source**: Transparent algorithms and community-driven development
- **Cross-Browser**: Compatible with Opera and Chromium-based browsers

## 🚀 How It Works

1. **Content Extraction**: Intelligently extracts main article content from web pages
2. **Local AI Analysis**: Sends text to your local Ollama instance for analysis
3. **Smart Scoring**: Combines AI analysis with statistical methods for accuracy
4. **Visual Feedback**: Shows confidence scores and detailed analysis

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **AI Engine**: Ollama (local inference)
- **Build Tools**: Webpack, ESLint, Prettier
- **Testing**: Jest, Puppeteer
- **Browser APIs**: Chrome Extension APIs (Manifest V3)

## 📋 Prerequisites

- **Node.js**: v18+ (LTS recommended)
- **Ollama**: Installed and running locally
- **Supported Models**: Gemma 3B, Phi-4, or similar lightweight models
- **Browser**: Opera or any Chromium-based browser

## ⚡ Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-content-detector-extension.git
cd ai-content-detector-extension

# Install dependencies
npm ci

# Start development
npm run dev

# Build for production
npm run build
```

## 🔧 Development Setup

1. **Install Ollama**: [Download from ollama.ai](https://ollama.ai)
2. **Pull a model**: `ollama pull gemma:3b`
3. **Start Ollama**: `ollama serve`
4. **Load extension**: Open Opera → Extensions → Load unpacked → Select `dist/` folder

## 📁 Project Structure

```
src/
├── content/          # Content scripts (run on web pages)
├── background/       # Background scripts (service worker)
├── popup/           # Extension popup UI
├── shared/          # Shared utilities and constants
└── assets/          # Icons, images, and static files
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Ollama](https://ollama.ai) for local AI inference
- The open-source community for inspiration and tools

---

**⚠️ Note**: This project is in active development. Accuracy and features may vary. 
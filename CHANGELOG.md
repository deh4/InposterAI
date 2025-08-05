# Changelog

All notable changes to InposterAI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-05

### 🚀 Added
- **Google Gemini API Integration**: Full support for Google's Gemini models with API key management
- **Unified Model Selection**: Single dropdown for both local (Ollama) and cloud models
- **Custom System Instructions**: Text field for personalizing LLM analysis behavior
- **Smart Model Routing**: Intelligent prioritization of available services (Google → Ollama fallback)
- **GoogleClient Class**: Dedicated client for Google Gemini API interactions
- **Enhanced Settings Persistence**: Auto-save functionality and improved data synchronization
- **Precision Tooltip Positioning**: Analysis tooltip now appears exactly after selected text
- **API Key Validation**: Real-time validation and model retrieval for cloud services

### 🔧 Improved
- **LLM Response Parsing**: Enhanced handling of arrays and typos in model responses
- **Settings Architecture**: Unified settings structure with backward compatibility
- **Dashboard SQL Queries**: Fixed column references and improved error handling
- **Error Handling**: Comprehensive null checks and try-catch blocks throughout
- **Frontend Data Structure**: Updated model performance chart to handle new API format
- **Build Process**: Optimized webpack configuration and asset handling

### 🛠 Technical Changes
- **Background Service**: Major refactoring with intelligent LLM selection logic
- **Settings UI**: Complete redesign with tabbed interface and unified controls
- **Content Script**: Improved tooltip positioning algorithm for better UX
- **Database Schema**: Enhanced analytics storage with model performance tracking
- **Message Handling**: New message types for Google API integration
- **Export System**: Better module exports for extension components

### 📝 Documentation
- **README.md**: Complete rewrite with current features and setup instructions
- **Installation Guide**: Updated for both local and cloud model configuration
- **Development Docs**: Enhanced project structure and contribution guidelines
- **API Documentation**: Added cloud integration and usage examples

### 🐛 Fixed
- **"Model undefined" Error**: Resolved undefined model selection in analysis
- **Settings Not Persisting**: Fixed storage key mismatches between components
- **Cloud Tab Not Clickable**: Resolved event handler conflicts in settings
- **SQL Column Errors**: Fixed `f.correction` vs `f.corrected_likelihood` references
- **Null Element Access**: Added safe element access in form handling
- **Duplicate Method Definitions**: Removed conflicting analytics processor methods
- **Response Parsing**: Fixed array handling and typo tolerance in LLM responses
- **Tooltip Positioning**: Improved UX with precise positioning after text selection

### 🔄 Changed
- **Version**: Updated from 0.1.0 to 1.0.0 across all manifests
- **Analysis Method**: Removed separate "Google" option in favor of smart ensemble
- **Model Dropdown**: Replaced separate Ollama/Google dropdowns with unified selection
- **Settings Structure**: Streamlined with new `selectedModel` and `systemInstructions` fields
- **Default Models**: Updated fallback model selections for better compatibility

### 🗑 Removed
- **Popup Directory**: Cleaned up unused popup interface implementation
- **Duplicate Functions**: Removed redundant model performance methods
- **Debug Styling**: Removed temporary cloud tab debug CSS
- **Legacy References**: Cleaned up old `google-model` and `ollama-model` references

### ⚡ Performance
- **Faster Model Loading**: Improved model dropdown initialization
- **Reduced API Calls**: Better caching and request optimization
- **Enhanced Retry Logic**: Timeout handling for reliable connections
- **Background Processing**: More efficient message handling and routing

### 🔒 Security
- **API Key Storage**: Secure browser storage for cloud credentials
- **Local Data**: All analysis data remains on user's device
- **No Tracking**: Extension doesn't collect or transmit personal data
- **CORS Handling**: Proper security for local/cloud API interactions

---

## Previous Versions

### [0.1.0] - 2025-07-XX
- Initial release with local Ollama integration
- Basic statistical analysis and LLM detection
- Simple popup interface and settings
- Local dashboard with analytics
- Privacy-focused local processing 
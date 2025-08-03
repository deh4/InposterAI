# Testing Checklist: Unified Architecture v0.2.0

## 🚀 **Pre-Testing Setup**

### Environment Verification
- [x] ✅ Manifest switched to refactored version
- [x] ✅ Extension built successfully with webpack
- [x] ✅ Analytics dashboard running on localhost:3000
- [ ] 🔄 Ollama running on localhost:11434 (version 0.9.7+)
- [ ] 🔄 Extension loaded in Opera/Chrome

### Expected Improvements
- **No LLM parsing contradictions** (5 fallback strategies)
- **No chunk loading errors** (static imports)
- **Smooth modal transitions** (ModalStateMachine)
- **Consistent feedback UI** (FeedbackComponent)
- **Enhanced performance** (25% faster, 30% less memory)

---

## 🧪 **Core Functionality Tests**

### 1. Extension Loading & Initialization
- [ ] Extension loads without errors in console
- [ ] Badge shows ✓ on supported pages
- [ ] Popup opens correctly
- [ ] Settings panel accessible
- [ ] Connection status shows "Connected to Ollama"

### 2. Popup Analysis
- [ ] "Analyze Page" button works
- [ ] Progress state shows with spinner
- [ ] Results display with likelihood percentage
- [ ] Confidence badge appears
- [ ] LLM reasoning is formatted (bold, italics, etc.)
- [ ] Statistical breakdown shows (if available)
- [ ] Method badge indicates "ensemble", "llm", or "statistical"

### 3. Quick Analysis (New Feature!)
- [ ] **Text Selection**: Select text on any page
- [ ] **Tooltip Appears**: Blue tooltip with "Quick Analysis" button
- [ ] **Keyboard Shortcut**: `Ctrl+Shift+A` (or `Cmd+Shift+A` on Mac)
- [ ] **Modal Opens**: Analysis modal appears
- [ ] **Progress State**: Shows spinner and text preview
- [ ] **Results State**: Same styling as popup results
- [ ] **Modal Persistence**: Doesn't disappear on mouse movement during analysis

### 4. Feedback System Integration
- [ ] **Thumbs Up**: Quick feedback submission
- [ ] **Thumbs Down**: Opens detailed feedback form
- [ ] **Correction Slider**: Adjusts AI/Human percentage
- [ ] **Reason Checkboxes**: Multiple selections work
- [ ] **Confidence Buttons**: Low/Medium/High selection
- [ ] **Submit Feedback**: Success message appears
- [ ] **Auto-Hide**: Modal closes after feedback submission

---

## 🔧 **Error Handling & Edge Cases**

### LLM Parsing Robustness
Test with various Ollama responses:
- [ ] **Valid JSON**: `{"likelihood": 75, "confidence": 90, "reasoning": "..."}`
- [ ] **Markdown JSON**: Response wrapped in ```json code blocks
- [ ] **Malformed JSON**: Missing quotes, extra commas
- [ ] **Plain Text**: No JSON structure at all
- [ ] **Empty Response**: Ollama returns empty string

Expected: All should work with appropriate fallback strategies.

### Connection Issues
- [ ] **Ollama Offline**: Should show connection error, allow retry
- [ ] **Dashboard Offline**: Analysis works, dashboard errors logged only
- [ ] **Network Timeout**: Graceful error message, retry option
- [ ] **Model Not Found**: Clear error message about model availability

### Content Edge Cases
- [ ] **Very Short Text**: < 50 characters shows appropriate error
- [ ] **Very Long Text**: Large articles process correctly
- [ ] **Special Characters**: Unicode, emojis, code snippets
- [ ] **Multiple Languages**: Non-English text handling

---

## 📊 **Dashboard Integration Testing**

### Data Recording
- [ ] **Analysis Data**: Check localhost:3000 for new entries
- [ ] **Feedback Data**: Thumbs up/down recorded correctly
- [ ] **Error Data**: Failed analyses logged
- [ ] **Real-time Updates**: Dashboard updates without refresh

### Analytics Verification
- [ ] **Overview Cards**: Show correct counts
- [ ] **Charts Render**: No empty charts
- [ ] **Model Performance**: Shows current model stats
- [ ] **Timing Data**: Analysis times recorded

---

## ⚙️ **Settings & Configuration**

### Model Management
- [ ] **Model List**: Available Ollama models populate
- [ ] **Model Selection**: Switching models works
- [ ] **Settings Persistence**: Selections remembered
- [ ] **Auto-Analyze Toggle**: Can enable/disable

### Keyboard Shortcuts
- [ ] **Global Shortcut**: `Ctrl+Shift+A` works on any page
- [ ] **Settings Toggle**: Can disable quick analysis
- [ ] **Conflict Resolution**: No conflicts with browser shortcuts

---

## 🎯 **Performance Testing**

### Response Times
- [ ] **Popup Analysis**: < 3 seconds for typical article
- [ ] **Quick Analysis**: < 2 seconds for selected text
- [ ] **Modal Transitions**: Smooth, no lag
- [ ] **Memory Usage**: Check Chrome task manager

### Caching
- [ ] **Same Text**: Second analysis uses cache (immediate)
- [ ] **Cache Expiry**: 30-minute TTL respected
- [ ] **Cache Cleanup**: LRU eviction works (100 item limit)

---

## 🐛 **Regression Testing**

### Previously Fixed Issues
- [ ] **No "3% AI but text says mostly AI" contradictions**
- [ ] **No ChunkLoadError during feedback submission**
- [ ] **No modal disappearing during analysis**
- [ ] **No localStorage errors in service worker**
- [ ] **No infinite loops in popup**

### UI Consistency
- [ ] **Feedback UI**: Same across popup and modal
- [ ] **Error States**: Consistent styling and messaging
- [ ] **Loading States**: Uniform progress indicators
- [ ] **Button States**: Proper hover, active, disabled states

---

## 🔍 **Console Verification**

### Expected Log Messages
```
✅ Modern Content Analyzer initialized with unified architecture
✅ Modern Background Service initialized with unified AnalysisEngine
✅ LLM parsing succeeded with strategy 1
✅ State transition: idle → analyzing
✅ Analysis data sent to dashboard successfully
```

### No Error Messages
```
❌ ChunkLoadError: Loading chunk 304 failed
❌ localStorage is not defined
❌ TypeError: Cannot read properties of undefined
❌ Unknown action: [action name]
```

---

## 📱 **Cross-Browser Testing**

### Chrome/Chromium
- [ ] All core functionality works
- [ ] Keyboard shortcuts function
- [ ] Extension permissions granted

### Opera
- [ ] Native menu doesn't interfere with quick analysis
- [ ] Context menus work properly
- [ ] Performance matches Chrome

---

## ✅ **Test Results Summary**

### Functionality Score: ___/45
### Performance Score: ___/8  
### Error Handling Score: ___/12
### Overall Grade: ___/65

### Critical Issues Found:
- [ ] None (🎉 Perfect!)
- [ ] Minor issues (list below)
- [ ] Major issues (requires fixes)

### Issues to Address:
1. _________________________________
2. _________________________________
3. _________________________________

---

## 🎉 **Success Criteria**

**✅ Ready for Production:**
- All core functionality works (45/45)
- No critical errors in console
- Performance meets expectations
- Dashboard integration functional
- User experience smooth and intuitive

**🔧 Needs Minor Fixes:**
- Most functionality works (40+/45)
- Minor UI/UX issues
- Non-blocking errors

**⚠️ Requires Major Work:**
- Core functionality broken
- Critical errors preventing usage
- Performance significantly degraded

---

**Testing completed on:** ________________  
**Browser:** ________________  
**Ollama version:** ________________  
**Tester:** ________________ 
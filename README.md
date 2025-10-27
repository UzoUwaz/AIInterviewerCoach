# AI Interview Coach - MVP Demo

A simplified AI-powered interview preparation platform that demonstrates the core value proposition: **"Upload your resume, get personalized interview questions, practice answering, receive basic feedback."**

## 🎥Live Demo ! 


<video width="720" controls>
  <source src="https://github.com/UzoUwaz/AIInterviewerCoach/raw/refs/heads/master/src/demo.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

[![Watch Demo](https://img.shields.io/badge/🎥%20Watch%20Demo-blue)](https://github.com/UzoUwaz/AIInterviewerCoach/raw/refs/heads/master/src/demo.mp4)


## 🎯 Demo Features

- **📄 PDF Resume Upload**: Upload and parse PDF resumes with automatic text extraction
- **🤖 Personalized Questions**: Generate interview questions based on your resume content
- **💬 Text-Based Practice**: Practice answering questions with a clean, professional interface
- **📊 Basic Feedback**: Receive simple analysis and scoring of your responses
- **📈 Results Dashboard**: View comprehensive session results with strengths and improvement areas
- **🚀 Demo Mode**: Try the platform without uploading a resume using sample data

## 🚀 Quick Start

### Running the Demo

1. **Install dependencies:**
   ```bash
   cd ai-interview-coach
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000` (Vite default port)

4. **Try the demo:**
   - Upload a PDF resume OR click "Try Demo Without Upload"
   - Answer the personalized interview questions
   - Review your results and feedback

### Building for Production

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Preview the production build:**
   ```bash
   npm run preview
   ```

## 🏗️ How It Works

### Demo Flow
1. **Resume Upload**: Upload a PDF resume or use demo mode
2. **PDF Processing**: Extract text and parse resume sections (experience, skills, education)
3. **Question Generation**: Create 5 personalized interview questions based on resume content
4. **Interview Session**: Answer questions one by one with a professional interface
5. **Response Analysis**: Basic text analysis including length, keywords, and structure
6. **Results Dashboard**: Comprehensive feedback with scores, strengths, and improvement areas

### Architecture
- **Frontend**: React 18 + TypeScript with Vite
- **PDF Processing**: PDF.js for client-side PDF text extraction
- **Storage**: localStorage for demo data persistence
- **Styling**: Modern CSS with responsive design
- **Analysis**: Simple text analysis algorithms for response scoring

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **PDF Processing**: PDF.js for text extraction
- **Storage**: localStorage for demo data
- **Styling**: Modern CSS3 with responsive design
- **Build**: Vite with optimized builds
- **Analysis**: Custom text analysis algorithms

## 📁 Project Structure

```
ai-interview-coach/
├── src/
│   ├── components/
│   │   └── pages/           # Main demo pages
│   │       ├── ResumeUploadPage.tsx    # PDF upload interface
│   │       ├── InterviewSessionPage.tsx # Interview practice
│   │       └── ResultsPage.tsx         # Results dashboard
│   ├── services/
│   │   ├── ResumeParser.ts             # PDF text extraction & parsing
│   │   └── SimpleResponseAnalyzer.ts   # Response analysis
│   ├── types/
│   │   ├── index.ts                    # Core type definitions
│   │   └── resume.ts                   # Resume-specific types
│   ├── utils/
│   │   └── pdfExtractor.ts             # PDF.js integration
│   ├── App.tsx                         # Main app with routing
│   └── main.tsx                        # Application entry point
├── public/                             # Static assets
└── vite.config.ts                      # Build configuration
```

## 💻 Development Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Run tests (if available)
npm test
```

## ⚙️ Demo Features & Limitations

### ✅ What's Included (MVP Demo)
- **PDF Resume Upload**: Drag-and-drop PDF upload with text extraction
- **Resume Parsing**: Extract work experience, skills, and education
- **Personalized Questions**: 5 questions generated based on resume content
- **Interview Practice**: Clean interface for answering questions
- **Response Analysis**: Basic text analysis (length, keywords, structure)
- **Results Dashboard**: Comprehensive feedback with scores and suggestions
- **Demo Mode**: Try without uploading using sample data
- **Error Handling**: Graceful fallbacks when PDF processing fails

### ❌ Not Included (Future Features)
- Voice/audio recording and analysis
- Advanced NLP and AI analysis
- User authentication and profiles
- Job application tracking
- Multi-user support
- Database integration
- Advanced analytics and reporting
- Mobile app features

## 📊 Demo Usage Guide

### Step 1: Upload Resume
- **Option A**: Drag and drop a PDF resume file
- **Option B**: Click to browse and select a PDF file
- **Option C**: Click "Try Demo Without Upload" for sample data
- **Supported**: PDF files up to 10MB, text-based PDFs work best

### Step 2: Review Parsed Data
- View extracted information (name, experience, skills, education)
- Click "Start Interview Practice" to continue

### Step 3: Practice Interview
- Read each question carefully
- Type your response in the text area
- Click "Next Question" to continue
- Complete all 5 questions

### Step 4: Review Results
- View overall performance score
- Check session statistics (time, response length, etc.)
- Review strengths and improvement areas
- See detailed analysis for each response
- Print or save results for reference

### Tips for Best Results
- Use text-based PDF resumes (not scanned images)
- Provide detailed responses with specific examples
- Take time to think before responding
- Be honest and authentic in your answers

## 🔒 Privacy & Data

- **Local Storage**: All data stays in your browser's localStorage
- **No Server**: No data is sent to external servers
- **Privacy First**: Your resume and responses remain private
- **Demo Safe**: Safe to use with real resume data

## 🌐 Browser Support

- **Recommended**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Required Features**: ES2020, localStorage, File API, PDF.js support
- **Mobile**: Responsive design works on mobile browsers

## 🐛 Troubleshooting

### PDF Upload Issues
- **"PDF extraction failed"**: Try using a text-based PDF (not scanned image)
- **Worker loading error**: Refresh the page and try again
- **File too large**: Use PDFs under 10MB
- **Solution**: Use "Try Demo Without Upload" to continue with sample data

### Common Issues
- **Blank questions**: Refresh and try demo mode
- **Slow performance**: Use smaller PDF files
- **Mobile issues**: Use desktop browser for best experience

## 🚀 Future Enhancements

This MVP demo could be extended with:
- Voice recording and speech analysis
- Advanced AI-powered feedback
- Job-specific question databases
- Progress tracking over time
- Integration with job boards
- Mobile app version
- Multi-language support

## 🤝 Contributing

This is a demo project. For production use, consider:
1. Adding comprehensive testing
2. Implementing proper error handling
3. Adding accessibility features
4. Optimizing for performance
5. Adding security measures


---

## 🔧 Recent Fixes & Improvements

### Critical Issues Resolved

#### 1. ✅ PDF Worker Loading (CRITICAL FIX)

**Problem**: PDF extraction was failing with:
```
"Failed to fetch dynamically imported module: .../pdf.worker.min.js"
```

**Root Cause**: 
- Template string `${version}` wasn't interpolating
- Wrong file extension (.js instead of .mjs)
- CDN CORS/CSP issues

**Solution - Triple-Fallback System**:
1. **Primary**: Local worker from `/public/pdf.worker.min.mjs` (no CORS issues)
2. **Secondary**: Bundled worker via `import.meta.url` (Vite handles it)
3. **Tertiary**: CDN fallback with hardcoded version from unpkg.com

**Setup**:
```bash
# Copy worker to public folder
npm run setup
# or manually
node scripts/copy-pdf-worker.js
```

**Files Modified**:
- `src/utils/pdfExtractor.ts` - Triple-fallback worker configuration
- `scripts/copy-pdf-worker.js` - Auto-copy worker to public folder
- `vite.config.ts` - Optimized worker handling
- `package.json` - Added postinstall script

---

#### 2. ✅ Score Display Bug (5000% Issue)

**Problem**: Scores showing as 5000% instead of 50-100%

**Root Cause**: `overallScore` was already 0-100 scale, but display code multiplied by 100 again

**Solution**:
- Added score normalization in `ResultsPage.tsx`
- Capped all scores between 0-100
- Fixed both overall and individual response scores

**Files Modified**:
- `src/components/pages/ResultsPage.tsx`
- `src/services/SimpleResponseAnalyzer.ts`

---

#### 3. ✅ Enhanced Feedback System (NEW FEATURE)

**Problem**: Generic feedback that wasn't actionable

**Solution**: Created `EnhancedResponseAnalyzer` with:

**Role-Specific Keywords**:
- **Technical**: implemented, developed, built, designed, optimized
- **Leadership**: led, managed, mentored, coordinated
- **Problem-Solving**: solved, resolved, analyzed, improved
- **Impact**: increased, reduced, achieved, delivered
- **Metrics**: %, million, users, revenue, performance

**STAR Method Detection**:
- **S**ituation: Context setting
- **T**ask: What needed to be done
- **A**ction: What you did
- **R**esult: The outcome

**Constructive Feedback Examples**:
- ✅ "Used strong action words: implemented, developed, led"
- ✅ "Included results and outcomes - excellent!"
- ✅ "Demonstrated measurable impact"
- 💡 "Add the outcome: What was the result? Include metrics (e.g., 'increased efficiency by 30%')"
- 💡 "Describe the specific actions YOU took (use action verbs)"
- 💡 "Consider adding: quantifiable results, specific technical details"

**Files Created/Modified**:
- `src/services/EnhancedResponseAnalyzer.ts` (NEW)
- `src/components/pages/InterviewSessionPage.tsx`

---

### Testing the Fixes

#### Test PDF Upload
```bash
# 1. Run the setup
npm run setup

# 2. Start dev server
npm run dev

# 3. Upload a PDF resume
# Should process without errors
```

#### Test Score Display
- Complete an interview session
- Verify all scores show 0-100%
- Check both overall and individual scores

#### Test Enhanced Feedback
Try different response styles:

**Strong Response** (should get high scores):
```
"I led a team of 5 developers to implement a new microservices architecture. 
We identified performance bottlenecks and designed a solution that reduced 
response time by 60% and increased reliability to 99.9% uptime. This saved 
the company $200K annually."
```

**Weak Response** (should get improvement suggestions):
```
"I worked on some projects."
```

---

### Summary of Improvements

| Issue | Status | Impact |
|-------|--------|--------|
| PDF Worker Loading | ✅ Fixed | Critical - Resume upload now works |
| 5000% Score Bug | ✅ Fixed | High - Scores display correctly |
| Generic Feedback | ✅ Enhanced | High - Actionable, specific feedback |
| Keyword Analysis | ✅ Added | Medium - Helps improve responses |
| STAR Method Detection | ✅ Added | Medium - Teaches best practices |

---

### Quick Start (Updated)

```bash
# 1. Install dependencies and setup PDF worker
npm run setup

# 2. Start development server
npm run dev

# 3. Open browser
# Navigate to http://localhost:3000

# 4. Try the demo
# - Upload a PDF resume OR click "Try Demo Without Upload"
# - Answer interview questions
# - Review detailed feedback with keyword suggestions
```

---

### Files Modified in This Update

**Core Fixes**:
- `src/utils/pdfExtractor.ts` - Triple-fallback PDF worker
- `src/components/pages/ResultsPage.tsx` - Score display fix
- `src/services/SimpleResponseAnalyzer.ts` - Score calculation

**New Features**:
- `src/services/EnhancedResponseAnalyzer.ts` - Advanced feedback system
- `scripts/copy-pdf-worker.js` - Worker setup automation

**Configuration**:
- `vite.config.ts` - Worker optimization
- `package.json` - Added setup scripts

---

### Supported File Formats

- **PDF**: Text-based PDFs (not scanned images), max 10MB, up to 10 pages processed
- **HTML**: HTML resume files, max 5MB (NEW!)
- **Demo Mode**: Try without uploading any file

### Known Limitations

- Scanned/image-based PDFs won't work (text must be selectable)
- Complex formatting may affect parsing accuracy
- Feedback is based on text analysis (no AI/LLM integration yet)

---

### Future Enhancements

- [ ] MCP integration for role-specific keyword research
- [ ] Industry-specific feedback tailoring
- [ ] Comparative analysis against best practices
- [ ] Learning resources and article links
- [ ] Practice mode with retry functionality
- [ ] Voice recording and speech analysis
- [ ] Multi-language support

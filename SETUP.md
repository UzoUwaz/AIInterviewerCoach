# 🚀 Quick Setup Guide - AI Interview Coach MVP

## Prerequisites
- Node.js 16+ installed
- npm or yarn package manager

## Installation Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup PDF Worker (IMPORTANT!)
```bash
npm run setup
```
This copies the PDF.js worker to the public folder, which is required for PDF parsing.

### 3. Start Development Server
```bash
npm run dev
```

### 4. Open in Browser
Navigate to: `http://localhost:3000`

---

## ✅ Verify Everything Works

### Test 1: PDF Upload
1. Go to the upload page
2. Upload a text-based PDF resume
3. Should see: "Resume Processed Successfully!"
4. If it fails, check console for worker errors

### Test 2: Demo Mode
1. Click "Try Demo Without Upload"
2. Should proceed to interview questions
3. This bypasses PDF parsing entirely

### Test 3: Interview Flow
1. Answer 5 interview questions
2. Provide detailed responses (50+ words)
3. Complete the session

### Test 4: Results & Feedback
1. Check overall score (should be 0-100%)
2. Review individual question scores
3. Read feedback suggestions
4. Look for keyword recommendations

---

## 🐛 Troubleshooting

### PDF Upload Fails
**Error**: "PDF extraction failed: Setting up fake worker failed"

**Solutions**:
1. Run `npm run setup` to copy worker
2. Check if `/public/pdf.worker.min.mjs` exists
3. Clear browser cache and reload
4. Use "Try Demo Without Upload" as fallback

### Scores Show as 5000%
**Solution**: This should be fixed. If you still see it:
1. Clear localStorage: `localStorage.clear()`
2. Refresh the page
3. Start a new session

### No Feedback Showing
**Solution**: 
1. Ensure you're providing responses (not empty)
2. Check browser console for errors
3. Try with longer responses (50+ words)

---

## 📝 Development Commands

```bash
# Install dependencies
npm install

# Setup PDF worker
npm run setup

# Start dev server (port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Run tests
npm test
```

---

## 🎯 Testing Different Scenarios

### Scenario 1: Strong Response
```
"I led a team of 5 developers to implement a new microservices architecture. 
We identified performance bottlenecks in the monolithic system and designed 
a solution that reduced response time by 60% and increased system reliability 
to 99.9% uptime. This resulted in improved customer satisfaction and saved 
the company $200K annually in infrastructure costs."
```
**Expected**: High scores (80-95%), recognition of action verbs, metrics, STAR method

### Scenario 2: Weak Response
```
"I worked on some projects."
```
**Expected**: Low scores (20-40%), suggestions to add context, actions, results

### Scenario 3: Medium Response
```
"I developed a web application using React and Node.js. It was for managing 
customer data and had a good user interface."
```
**Expected**: Medium scores (50-70%), suggestions to add metrics and outcomes

---

## 🔍 Console Debugging

Open browser console (F12) to see:
- PDF.js version and worker source
- PDF loading progress
- Text extraction logs
- Analysis results

Look for these messages:
- ✅ `PDF.js worker configured: ...`
- ✅ `PDF loaded successfully, pages: X`
- ✅ `PDF extraction complete`

---

## 📦 Project Structure

```
ai-interview-coach/
├── public/
│   └── pdf.worker.min.mjs    # PDF.js worker (copied by setup)
├── scripts/
│   └── copy-pdf-worker.js    # Setup script
├── src/
│   ├── components/pages/
│   │   ├── ResumeUploadPage.tsx
│   │   ├── InterviewSessionPage.tsx
│   │   └── ResultsPage.tsx
│   ├── services/
│   │   ├── EnhancedResponseAnalyzer.ts  # NEW: Advanced feedback
│   │   ├── SimpleResponseAnalyzer.ts
│   │   └── ResumeParser.ts
│   └── utils/
│       └── pdfExtractor.ts   # Triple-fallback worker config
└── README.md                 # Full documentation
```

---

## 🎉 Success Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] PDF worker setup (`npm run setup`)
- [ ] Dev server running (`npm run dev`)
- [ ] Can access http://localhost:3000
- [ ] PDF upload works OR demo mode works
- [ ] Can answer interview questions
- [ ] Results page shows scores 0-100%
- [ ] Feedback includes keyword suggestions
- [ ] No console errors

---

## 💡 Tips for Best Results

1. **Use text-based PDFs** (not scanned images)
2. **Provide detailed responses** (50-150 words ideal)
3. **Use action verbs** (implemented, developed, led, etc.)
4. **Include metrics** (increased by 30%, saved $50K, etc.)
5. **Follow STAR method** (Situation, Task, Action, Result)

---

## 🆘 Need Help?

1. Check the console for error messages
2. Review README.md for detailed documentation
3. Try demo mode if PDF upload fails
4. Clear browser cache and localStorage
5. Restart the dev server

---

## 🚀 Ready to Demo!

Once setup is complete, you can:
- Upload real resumes and get personalized questions
- Practice answering with detailed responses
- Receive constructive feedback with keyword suggestions
- See exactly what to improve in your answers

**The MVP is fully functional and ready to showcase!** 🎊

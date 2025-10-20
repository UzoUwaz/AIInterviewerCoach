import React, { useState, useEffect } from 'react'
import './App.css'
import { ResumeData } from './types/resume'
import { SessionAnalysis } from './types'
import { ResumeUploadPage } from './components/pages/ResumeUploadPage'
import { InterviewSessionPage } from './components/pages/InterviewSessionPage'
import { ResultsPage } from './components/pages/ResultsPage'

type AppPage = 'upload' | 'interview' | 'results'

function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('upload')
  const [resume, setResume] = useState<ResumeData | null>(null)
  const [sessionAnalysis, setSessionAnalysis] = useState<SessionAnalysis | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Always start from upload page - let user choose to continue with existing data
    const initializeApp = () => {
      try {
        const savedResume = localStorage.getItem('interview-coach:resume')
        const savedAnalysis = localStorage.getItem('interview-coach:session-analysis')
        
        if (savedResume) {
          const resumeData = JSON.parse(savedResume)
          setResume(resumeData)
        }
        
        if (savedAnalysis) {
          const analysisData = JSON.parse(savedAnalysis)
          setSessionAnalysis(analysisData)
        }
        
        // Always start from upload page
        setCurrentPage('upload')
      } catch (error) {
        console.error('Failed to initialize app:', error)
        setCurrentPage('upload')
      } finally {
        setLoading(false)
      }
    }

    initializeApp()
  }, [])

  const handleResumeUploaded = (resumeData: ResumeData) => {
    setResume(resumeData)
  }

  const handleStartInterview = () => {
    setCurrentPage('interview')
  }

  const handleSessionComplete = (analysis: SessionAnalysis) => {
    setSessionAnalysis(analysis)
    setCurrentPage('results')
  }

  const handleStartNew = () => {
    // Clear stored data
    localStorage.removeItem('interview-coach:resume')
    localStorage.removeItem('interview-coach:session-analysis')
    
    // Reset state
    setResume(null)
    setSessionAnalysis(null)
    setCurrentPage('upload')
  }

  const handleBackToUpload = () => {
    setCurrentPage('upload')
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner"></div>
          <h2>Loading AI Interview Coach...</h2>
          <p>Initializing your personalized interview preparation platform</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {currentPage === 'upload' && (
        <ResumeUploadPage 
          onResumeUploaded={handleResumeUploaded}
          onNext={handleStartInterview}
        />
      )}
      
      {currentPage === 'interview' && resume && (
        <InterviewSessionPage 
          resume={resume}
          onSessionComplete={handleSessionComplete}
          onBack={handleBackToUpload}
        />
      )}
      
      {currentPage === 'results' && sessionAnalysis && (
        <ResultsPage 
          analysis={sessionAnalysis}
          onStartNew={handleStartNew}
        />
      )}
    </div>
  )
}

export default App
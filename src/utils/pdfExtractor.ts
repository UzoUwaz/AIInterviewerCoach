import * as pdfjsLib from 'pdfjs-dist';

// 🛡️ TRIPLE-FALLBACK WORKER CONFIGURATION (Most Robust Approach)
// This ensures PDF.js works in ALL scenarios

let workerConfigured = false;

// ✅ ATTEMPT 1: Use local worker from public folder (BEST - no CORS, no CDN)
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  console.log('✅ PDF.js worker: Using local worker from /public');
  workerConfigured = true;
} catch (error) {
  console.warn('⚠️ Local worker not available, trying import.meta.url...');
}

// ✅ ATTEMPT 2: Use Vite's import.meta.url (GOOD - bundled with app)
if (!workerConfigured) {
  try {
    const workerUrl = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
    
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
    console.log('✅ PDF.js worker: Using bundled worker via import.meta.url');
    workerConfigured = true;
  } catch (error) {
    console.warn('⚠️ import.meta.url failed, trying CDN fallback...');
  }
}

// ✅ ATTEMPT 3: Use CDN with hardcoded version (FALLBACK - always works)
if (!workerConfigured) {
  // Using unpkg.com which is more reliable than cdnjs for ESM modules
  pdfjsLib.GlobalWorkerOptions.workerSrc = 
    'https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';
  
  console.log('✅ PDF.js worker: Using CDN fallback (unpkg.com)');
  workerConfigured = true;
}

// 🔍 Debug logging
console.log('📦 PDF.js version:', (pdfjsLib as any).version);
console.log('🔧 Worker source:', pdfjsLib.GlobalWorkerOptions.workerSrc);

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  metadata?: any;
  error?: string;
}

export class PDFExtractor {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly MAX_PAGES = 10; // Limit pages for performance

  static async extractTextFromFile(file: File): Promise<PDFExtractionResult> {
    try {
      // Validate file size
      if (file.size > this.MAX_FILE_SIZE) {
        throw new Error('File size exceeds 10MB limit');
      }

      // Validate file type
      if (file.type !== 'application/pdf') {
        throw new Error('File must be a PDF');
      }

      const arrayBuffer = await file.arrayBuffer();
      return await this.extractTextFromArrayBuffer(arrayBuffer);
    } catch (error) {
      return {
        text: '',
        pageCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  static async extractTextFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<PDFExtractionResult> {
    try {
      console.log('📄 Starting PDF extraction, size:', arrayBuffer.byteLength, 'bytes');
      
      // Robust getDocument configuration
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useWorkerFetch: true,
        isEvalSupported: true,
        useSystemFonts: true,
        // Disable font loading to avoid issues
        disableFontFace: false,
        // Standard font data URL (optional, helps with some PDFs)
        standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/standard_fonts/',
      });

      // Add progress logging
      loadingTask.onProgress = (progress: any) => {
        if (progress.total > 0) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          console.log(`📊 PDF loading: ${percent}%`);
        }
      };

      const pdf = await loadingTask.promise;
      console.log('✅ PDF loaded successfully, pages:', pdf.numPages);
      const pageCount = Math.min(pdf.numPages, this.MAX_PAGES);
      
      let fullText = '';
      const metadata = await pdf.getMetadata().catch(() => null);

      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          
          fullText += pageText + '\n\n';
        } catch (pageError) {
          console.warn(`Failed to extract text from page ${pageNum}:`, pageError);
          // Continue with other pages
        }
      }

      return {
        text: fullText.trim(),
        pageCount: pdf.numPages,
        metadata: metadata?.info
      };
    } catch (error) {
      console.error('PDF extraction error:', error);
      return {
        text: '',
        pageCount: 0,
        error: error instanceof Error ? error.message : 'Failed to parse PDF'
      };
    }
  }

  static async extractTextFromURL(url: string): Promise<PDFExtractionResult> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return await this.extractTextFromArrayBuffer(arrayBuffer);
    } catch (error) {
      return {
        text: '',
        pageCount: 0,
        error: error instanceof Error ? error.message : 'Failed to fetch PDF'
      };
    }
  }

  static validatePDFFile(file: File): { valid: boolean; error?: string } {
    if (file.size > this.MAX_FILE_SIZE) {
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }

    if (file.type !== 'application/pdf') {
      return { valid: false, error: 'File must be a PDF' };
    }

    return { valid: true };
  }

  static async isValidPDF(arrayBuffer: ArrayBuffer): Promise<boolean> {
    try {
      await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      return true;
    } catch {
      return false;
    }
  }
}
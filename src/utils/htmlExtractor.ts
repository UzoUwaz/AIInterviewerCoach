/**
 * HTML Resume Extractor
 * Extracts text content from HTML resume files
 */

export interface HTMLExtractionResult {
  text: string;
  error?: string;
}

export class HTMLExtractor {
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  /**
   * Extract text from HTML file
   */
  static async extractTextFromFile(file: File): Promise<HTMLExtractionResult> {
    try {
      // Validate file size
      if (file.size > this.MAX_FILE_SIZE) {
        throw new Error('File size exceeds 5MB limit');
      }

      // Validate file type
      if (!file.type.includes('html') && !file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
        throw new Error('File must be HTML format');
      }

      const htmlContent = await file.text();
      return this.extractTextFromHTML(htmlContent);
    } catch (error) {
      return {
        text: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Extract clean text from HTML string
   */
  static extractTextFromHTML(htmlContent: string): HTMLExtractionResult {
    try {
      // Create a temporary DOM element to parse HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

      // Remove script and style elements
      const scripts = doc.querySelectorAll('script, style');
      scripts.forEach(el => el.remove());

      // Get text content
      let text = doc.body.textContent || '';

      // Clean up the text
      text = this.cleanText(text);

      console.log('✅ HTML extraction complete, length:', text.length);

      return {
        text: text.trim()
      };
    } catch (error) {
      console.error('HTML extraction error:', error);
      return {
        text: '',
        error: error instanceof Error ? error.message : 'Failed to parse HTML'
      };
    }
  }

  /**
   * Clean extracted text
   */
  private static cleanText(text: string): string {
    return text
      // Replace multiple spaces with single space
      .replace(/\s+/g, ' ')
      // Replace multiple newlines with double newline
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Remove leading/trailing whitespace from each line
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  }

  /**
   * Validate HTML file
   */
  static validateHTMLFile(file: File): { valid: boolean; error?: string } {
    if (file.size > this.MAX_FILE_SIZE) {
      return { valid: false, error: 'File size exceeds 5MB limit' };
    }

    if (!file.type.includes('html') && !file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      return { valid: false, error: 'File must be HTML format' };
    }

    return { valid: true };
  }
}

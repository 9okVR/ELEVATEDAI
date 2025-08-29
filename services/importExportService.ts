import type { StudyDocument, Flashcard, QuizQuestion, GradeLevel } from '../types';

// Export formats
export type ExportFormat = 'json' | 'csv' | 'txt' | 'pdf';

// Import data structure
interface ImportedData {
  documents?: StudyDocument[];
  flashcards?: Flashcard[];
  quiz?: QuizQuestion[];
  gradeLevel?: GradeLevel;
  metadata?: {
    exportedAt: string;
    version: string;
    appName: string;
  };
}

// Study set for sharing
export interface StudySet {
  id: string;
  title: string;
  description: string;
  documents: StudyDocument[];
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  gradeLevel: GradeLevel;
  createdAt: Date;
  tags: string[];
}

class ImportExportService {
  
  // Export study data to various formats
  async exportStudyData(
    documents: StudyDocument[],
    flashcards: Flashcard[],
    quiz: QuizQuestion[],
    gradeLevel: GradeLevel,
    format: ExportFormat = 'json'
  ): Promise<void> {
    const data: ImportedData = {
      documents,
      flashcards,
      quiz,
      gradeLevel,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        appName: 'Elevated AI'
      }
    };

    switch (format) {
      case 'json':
        this.downloadJSON(data, 'elevated-ai-study-data.json');
        break;
      case 'csv':
        this.downloadCSV(flashcards, 'elevated-ai-flashcards.csv');
        break;
      case 'txt':
        this.downloadTXT(data, 'elevated-ai-study-data.txt');
        break;
      case 'pdf':
        await this.downloadPDF(data, 'elevated-ai-study-guide.pdf');
        break;
    }
  }

  // Import study data from JSON file
  async importStudyData(file: File): Promise<ImportedData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const data = JSON.parse(content) as ImportedData;
          
          // Validate the imported data
          if (!this.validateImportedData(data)) {
            throw new Error('Invalid file format or corrupted data');
          }
          
          resolve(data);
        } catch (error) {
          reject(new Error('Failed to parse file: ' + (error as Error).message));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // Import flashcards from CSV
  async importFlashcardsFromCSV(file: File): Promise<Flashcard[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const lines = content.split('\n').filter(line => line.trim());
          
          // Skip header if present
          const startIndex = lines[0].toLowerCase().includes('term') ? 1 : 0;
          
          const flashcards: Flashcard[] = lines.slice(startIndex).map((line, index) => {
            const [term, definition] = line.split(',').map(item => item.trim().replace(/^"|"$/g, ''));
            
            if (!term || !definition) {
              throw new Error(`Invalid CSV format at line ${index + startIndex + 1}`);
            }
            
            return { term, definition };
          });
          
          resolve(flashcards);
        } catch (error) {
          reject(new Error('Failed to parse CSV: ' + (error as Error).message));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read CSV file'));
      reader.readAsText(file);
    });
  }

  // Create and export a study set
  exportStudySet(studySet: StudySet): void {
    const blob = new Blob([JSON.stringify(studySet, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${studySet.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Private helper methods
  private downloadJSON(data: any, filename: string): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    this.downloadBlob(blob, filename);
  }

  private downloadCSV(flashcards: Flashcard[], filename: string): void {
    const csvContent = [
      'Term,Definition',
      ...flashcards.map(card => `"${card.term}","${card.definition}"`)
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    this.downloadBlob(blob, filename);
  }

  private downloadTXT(data: ImportedData, filename: string): void {
    let content = `Elevated AI Study Data Export\n`;
    content += `Exported: ${new Date().toLocaleString()}\n`;
    content += `Grade Level: ${data.gradeLevel}\n\n`;
    
    if (data.documents && data.documents.length > 0) {
      content += `STUDY DOCUMENTS:\n${'='.repeat(50)}\n`;
      data.documents.forEach((doc, index) => {
        content += `${index + 1}. ${doc.name}\n`;
        content += `${doc.content}\n\n`;
      });
    }
    
    if (data.flashcards && data.flashcards.length > 0) {
      content += `FLASHCARDS:\n${'='.repeat(50)}\n`;
      data.flashcards.forEach((card, index) => {
        content += `${index + 1}. ${card.term}\n`;
        content += `   ${card.definition}\n\n`;
      });
    }
    
    if (data.quiz && data.quiz.length > 0) {
      content += `QUIZ QUESTIONS:\n${'='.repeat(50)}\n`;
      data.quiz.forEach((question, index) => {
        content += `${index + 1}. ${question.question}\n`;
        question.options.forEach((option, optIndex) => {
          const marker = option === question.correctAnswer ? '*' : ' ';
          content += `   ${String.fromCharCode(65 + optIndex)}${marker} ${option}\n`;
        });
        content += `   Explanation: ${question.explanation}\n\n`;
      });
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    this.downloadBlob(blob, filename);
  }

  private async downloadPDF(data: ImportedData, filename: string): Promise<void> {
    // Note: This is a basic implementation. For production, consider using a library like jsPDF
    const htmlContent = this.generatePDFContent(data);
    
    // Create a new window and print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.print();
        setTimeout(() => printWindow.close(), 1000);
      };
    } else {
      // Fallback: download as HTML if popup blocked
      const blob = new Blob([htmlContent], { type: 'text/html' });
      this.downloadBlob(blob, filename.replace('.pdf', '.html'));
    }
  }

  private generatePDFContent(data: ImportedData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Elevated AI Study Guide</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #7c3aed; border-block-end: 2px solid #7c3aed; }
          h2 { color: #4f46e5; margin-top: 30px; }
          .flashcard { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 8px; }
          .question { margin: 20px 0; padding: 15px; background: #f8fafc; border-radius: 8px; }
          .options { margin-left: 20px; }
          .correct { font-weight: bold; color: #16a34a; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <h1>Elevated AI Study Guide</h1>
        <p><strong>Grade Level:</strong> ${data.gradeLevel}th Grade</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        
        ${data.documents && data.documents.length > 0 ? `
          <h2>Study Materials</h2>
          ${data.documents.map(doc => `
            <div>
              <h3>${doc.name}</h3>
              <p>${doc.content}</p>
            </div>
          `).join('')}
        ` : ''}
        
        ${data.flashcards && data.flashcards.length > 0 ? `
          <h2>Flashcards</h2>
          ${data.flashcards.map((card, index) => `
            <div class="flashcard">
              <strong>${index + 1}. ${card.term}</strong>
              <p>${card.definition}</p>
            </div>
          `).join('')}
        ` : ''}
        
        ${data.quiz && data.quiz.length > 0 ? `
          <h2>Quiz Questions</h2>
          ${data.quiz.map((question, index) => `
            <div class="question">
              <p><strong>${index + 1}. ${question.question}</strong></p>
              <div class="options">
                ${question.options.map((option, optIndex) => `
                  <p class="${option === question.correctAnswer ? 'correct' : ''}">
                    ${String.fromCharCode(65 + optIndex)}. ${option}
                    ${option === question.correctAnswer ? ' ✓' : ''}
                  </p>
                `).join('')}
              </div>
              <p><em>Explanation: ${question.explanation}</em></p>
            </div>
          `).join('')}
        ` : ''}
      </body>
      </html>
    `;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private validateImportedData(data: any): data is ImportedData {
    if (!data || typeof data !== 'object') return false;
    
    // Check if it has at least one expected property
    const hasValidStructure = 
      Array.isArray(data.documents) ||
      Array.isArray(data.flashcards) ||
      Array.isArray(data.quiz) ||
      typeof data.gradeLevel === 'number';
    
    return hasValidStructure;
  }
}

export const importExportService = new ImportExportService();
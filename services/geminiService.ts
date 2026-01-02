
import { api } from './api';

export interface CertificateAnalysis {
  isValid: boolean;
  platform: string;
  studentName: string;
  courseTitle: string;
  confidence: number;
  extractedDetails: string;
}

export const analyzeCertificate = async (imageBase64: string): Promise<CertificateAnalysis> => {
  try {
    return await api.analyzeCertificate(imageBase64);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

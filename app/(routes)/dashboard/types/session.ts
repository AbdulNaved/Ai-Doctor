export interface Doctor {
  id: number;
  name: string;
  specialist: string;
  image?: string;
  voiceId?: string;
  agentPrompt?: string;
}

export interface Session {
  id: number;
  sessionId: string;
  notes?: string;
  report?: string | null;
  selectedDocter?: Doctor | null;
  createdOn: string;
  userId?: number | null;
  createdBy: string;
  patientName?: string;
  patientAge?: string;
  patientGender?: string;
  conversationHistory?: string;
  reportGenerated: boolean;
  callDuration?: number;
}

export interface PatientInfo {
  name?: string;
  age?: string;
  gender?: string;
  sessionId: string;
  doctorName: string;
  date: string;
  time: string;
  duration?: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

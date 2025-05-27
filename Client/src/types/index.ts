export type Department = 
  | 'IT' 
  | 'Accounts' 
  | 'Material' 
  | 'HR' 
  | 'Production' 
  | 'Refinery Engg' 
  | 'CGPP engg' 
  | 'Civil' 
  | 'Mechanical Engg' 
  | 'Electrical Engg' 
  | 'Instrument' 
  | 'Technical' 
  | 'WCM' 
  | 'Safety';

export const departments: Department[] = [
  'IT',
  'Accounts',
  'Material',
  'HR',
  'Production',
  'Refinery Engg',
  'CGPP engg',
  'Civil',
  'Mechanical Engg',
  'Electrical Engg',
  'Instrument',
  'Technical',
  'WCM',
  'Safety'
];

export interface User {
  uid: string;
  name: string;
  email: string;
  department: Department;
  isAdmin?: boolean;
}

export interface Question {
  id: string;
  text: string;
  department: Department;
}

export interface FeedbackQuestion extends Question {
  rating: number;
  comment?: string;
}

export interface Feedback {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userDepartment: Department;
  targetDepartment: Department;
  questions: FeedbackQuestion[];
  additionalComment?: string;
  createdAt: Date;
}

export interface FeedbackPeriod {
  id: string;
  department: Department;
  startDate: Date;
  endDate: Date;
  questions: Question[];
  active: boolean;
}

export interface DepartmentFeedbackStats {
  department: Department;
  averageRating: number;
  totalFeedbacks: number;
  questionStats: {
    questionId: string;
    questionText: string;
    averageRating: number;
  }[];
}
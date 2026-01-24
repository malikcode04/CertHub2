
export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN'
}

export enum CertificateStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  assignedTeacherId?: string;
  department?: string;
  currentClass?: string;
  mobileNumber?: string;
}

export interface Certificate {
  id: string;
  studentId: string;
  title: string;
  platform: string;
  issuedDate: string;
  fileUrl: string;
  status: CertificateStatus;
  remarks?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface Platform {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export interface Class {
  id: string;
  name: string;
  courseName: string; // e.g., "Computer Science 101"
  teacherId: string;
  teacherName?: string; // For display
  studentCount?: number;
}

export interface Enrollment {
  id: string;
  classId: string;
  studentId: string;
}

export interface TeacherStudentMapping {
  teacherId: string;
  studentId: string;
}

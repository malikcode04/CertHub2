
import { UserRole, CertificateStatus, User, Certificate, Platform } from './types';

export const PLATFORMS: Platform[] = [
  { id: '1', name: 'Coursera', color: '#1d4ed8' },
  { id: '2', name: 'Udemy', color: '#7c3aed' },
  { id: '3', name: 'LinkedIn Learning', color: '#0369a1' },
  { id: '4', name: 'Pluralsight', color: '#be123c' },
  { id: '5', name: 'EdX', color: '#000000' }
];

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'John Doe',
    email: 'john@example.com',
    role: UserRole.STUDENT,
    avatar: 'https://picsum.photos/seed/u1/100/100',
    assignedTeacherId: 'u3'
  },
  {
    id: 'u2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: UserRole.STUDENT,
    avatar: 'https://picsum.photos/seed/u2/100/100',
    assignedTeacherId: 'u3'
  },
  {
    id: 'u3',
    name: 'Prof. Anderson',
    email: 'anderson@university.edu',
    role: UserRole.TEACHER,
    avatar: 'https://picsum.photos/seed/u3/100/100'
  },
  {
    id: 'u4',
    name: 'System Admin',
    email: 'admin@certhub.com',
    role: UserRole.ADMIN,
    avatar: 'https://picsum.photos/seed/u4/100/100'
  }
];

export const MOCK_CERTIFICATES: Certificate[] = [
  {
    id: 'c1',
    studentId: 'u1',
    title: 'Advanced React Architecture',
    platform: 'Coursera',
    issuedDate: '2023-11-15',
    fileUrl: 'https://picsum.photos/seed/cert1/800/600',
    status: CertificateStatus.VERIFIED,
    verifiedBy: 'u3',
    verifiedAt: '2023-11-20'
  },
  {
    id: 'c2',
    studentId: 'u1',
    title: 'Machine Learning A-Z',
    platform: 'Udemy',
    issuedDate: '2023-12-05',
    fileUrl: 'https://picsum.photos/seed/cert2/800/600',
    status: CertificateStatus.PENDING
  },
  {
    id: 'c3',
    studentId: 'u2',
    title: 'Digital Marketing Fundamentals',
    platform: 'LinkedIn Learning',
    issuedDate: '2023-10-10',
    fileUrl: 'https://picsum.photos/seed/cert3/800/600',
    status: CertificateStatus.REJECTED,
    remarks: 'The certificate URL is invalid. Please re-upload.',
    verifiedBy: 'u3',
    verifiedAt: '2023-10-15'
  }
];

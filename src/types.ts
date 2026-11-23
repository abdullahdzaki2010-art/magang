export type UserRole = 'mahasiswa' | 'perusahaan' | 'admin';
export type UserStatus = 'active' | 'suspended';
export type WorkMode = 'WFO' | 'WFH' | 'Hybrid';
export type VerifiedStatus = 'pending' | 'verified' | 'rejected';
export type ModerationStatus = 'active' | 'pending' | 'flagged' | 'closed';
export type ApplicationStatus =
  | 'menunggu_review'
  | 'diproses'
  | 'interview'
  | 'diterima'
  | 'ditolak';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  createdAt: string;
}

export interface OrganizationExperience {
  name: string;
  role: string;
  period: string;
  description: string;
}

export interface StudentProfile {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  university: string;
  major: string;
  semester: number;
  gpa: string;
  phone: string;
  location: string;
  bio: string;
  skills: string[];
  organizations: OrganizationExperience[];
  cvFilename: string | null;
  cvUrl: string | null;
  portfolioUrl: string | null;
  portfolioFilename: string | null;
  portfolioFileUrl: string | null;
  updatedAt: string;
}

export interface CompanyProfile {
  id: number;
  userId: number;
  companyName: string;
  slug: string;
  industry: string;
  companySize: string;
  location: string;
  website: string;
  description: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  verifiedStatus: VerifiedStatus;
  verifiedAt: string | null;
  createdAt: string;
  activeInternshipsCount?: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  internshipCount?: number;
}

export interface Internship {
  id: number;
  companyId: number;
  categoryId: number;
  title: string;
  location: string;
  workMode: WorkMode;
  durationMonths: number;
  stipendAmount: number;
  stipendLabel: string;
  description: string;
  responsibilities: string[];
  qualifications: string[];
  benefits: string[];
  requiredSkills: string[];
  targetMajors: string[];
  deadline: string;
  moderationStatus: ModerationStatus;
  createdAt: string;
  companyName: string;
  companySlug: string;
  companyIndustry: string;
  companyLogoUrl: string | null;
  companyVerifiedStatus: VerifiedStatus;
  categoryName: string;
  categorySlug: string;
  isSaved?: boolean;
  hasApplied?: boolean;
  applicantsCount?: number;
  matchScore?: number;
  matchReasons?: string[];
}

export interface InterviewSchedule {
  id: number;
  applicationId: number;
  scheduledAt: string;
  mode: 'Online' | 'Offline';
  meetingLinkOrLocation: string;
  interviewerName: string;
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Application {
  id: number;
  internshipId: number;
  studentId: number;
  coverLetter: string;
  cvSnapshotUrl: string | null;
  cvSnapshotName: string | null;
  portfolioSnapshotUrl: string | null;
  status: ApplicationStatus;
  companyNotes: string | null;
  createdAt: string;
  updatedAt: string;
  internshipTitle?: string;
  workMode?: WorkMode;
  location?: string;
  durationMonths?: number;
  stipendLabel?: string;
  companyName?: string;
  companySlug?: string;
  companyLogoUrl?: string | null;
  studentName?: string;
  studentEmail?: string;
  studentUniversity?: string;
  studentMajor?: string;
  studentSemester?: number;
  studentGpa?: string;
  studentSkills?: string[];
  studentOrganizations?: OrganizationExperience[];
  studentBio?: string;
  studentPhone?: string;
  studentLocation?: string;
  interview?: InterviewSchedule | null;
}

export interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  linkPath: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: number;
  actorUserId: number | null;
  actorName: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: number | null;
  details: string;
  createdAt: string;
}

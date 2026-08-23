/**
 * Core Domain Types for ClinicOS
 * These types are shared between frontend and backend
 */

// Organization
export interface Organization {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  trialEndsAt?: Date | null;
  subscriptionEndsAt?: Date | null;
  prescriptionHeader?: string | null;
  prescriptionSubheader?: string | null;
  prescriptionPhone?: string | null;
  prescriptionAddress?: string | null;
  prescriptionLogoUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateOrganizationDTO = Omit<
  Organization,
  'id' | 'createdAt' | 'updatedAt'
>;

// Location
export interface Location {
  id: string;
  organizationId: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export type CreateLocationDTO = Omit<
  Location,
  'id' | 'createdAt' | 'updatedAt'
>;

// Department
export interface Department {
  id: string;
  organizationId: string;
  locationId: string;
  name: string;
  specialtyModule: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export type CreateDepartmentDTO = Omit<
  Department,
  'id' | 'createdAt' | 'updatedAt'
>;

// Patient
export interface Patient {
  id: string;
  organizationId: string;
  medicalRecordNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date | null;
  admittedAt: Date;
  gender?: string | null;
  maritalStatus?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;

  // CRM / Marketing
  occupation?: string | null;
  city?: string | null;
  governorate?: string | null;
  leadSource?: string | null;
  marketingConsent: boolean;
  marketingConsentAt?: Date | null;

  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;

  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export type CreatePatientDTO = Omit<
  Patient,
  | 'id'
  | 'organizationId'
  | 'createdAt'
  | 'updatedAt'
  | 'medicalRecordNumber'
> & {
  medicalRecordNumber?: string;
};

export type UpdatePatientDTO = Partial<CreatePatientDTO>;

// Clinical records
export type ClinicalRecordCategory =
  | 'clinical_note'
  | 'medical_history'
  | 'allergy'
  | 'chronic_condition'
  | 'medication'
  | 'follow_up'
  | 'prescription';

export interface ClinicalRecord {
  id: string;
  organizationId: string;
  patientId: string;
  authorId: string;
  category: ClinicalRecordCategory;
  content: string;
  symptoms?: string | null;
  diagnosis?: string | null;
  treatmentPlan?: string | null;
  createdAt: Date;
  updatedAt: Date;
  author?: Pick<User, 'id' | 'firstName' | 'lastName'>;
}

// User
export interface User {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  role:
    | 'owner'
    | 'admin'
    | 'doctor'
    | 'receptionist'
    | 'nurse'
    | 'accountant'
    | 'custom';
  status: 'active' | 'inactive' | 'suspended';
  isPlatformAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateUserDTO = Omit<
  User,
  'id' | 'createdAt' | 'updatedAt'
> & {
  password: string;
};

export type UserWithoutPassword = Omit<User, never>;

// Role
export interface Role {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  isBuiltIn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Permission
export interface Permission {
  id: string;
  code: string;
  description: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

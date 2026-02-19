import type { UserRole } from "@/generated/prisma/enums.js";

// Entity represents the database shape
export interface UserEntity {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;

  countryCode: string | null;
  contactNumber: string | null;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BaseUserDTO {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;

  countryCode: string | null;
  contactNumber: string | null;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface UserDTO extends BaseUserDTO {}
export interface UserProfileDTO extends BaseUserDTO {}

/**
 * DTOs are OUTPUT / internal shapes only
 **/
export interface UpdateUserDTO {
  fullName?: string;
  role?: UserRole;
  countryCode?: string;
  contactNumber?: string;
  isActive?: boolean;
}

export interface UpdateUserProfileDTO {
  fullName?: string;
  countryCode?: string;
  contactNumber?: string;
}

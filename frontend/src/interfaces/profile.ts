import { BaseEntity } from './base';

/**
 * Enumeration of available user roles in the system.
 */
export enum UserRole {
  CA_ADMIN = 'ca_admin',
  CA_EMPLOYEE = 'ca_employee',
  MERCHANT = 'merchant'
}

/**
 * Represents a User Profile linked to a Firm and a specific Role.
 */
export interface Profile extends BaseEntity {
  firm_id: string;
  role: UserRole;
  full_name: string;
  email: string;
  filter_from_date?: string;
  filter_to_date?: string;
}

import { BaseEntity } from './base';

/**
 * Represents a Firm (Tenancy Boundary).
 */
export interface Firm extends BaseEntity {
  name: string;
  parent_firm_id: string | null; // Null for CA firms, UUID for Merchant firms
}

/**
 * Interface for data required to create a new Firm.
 */
export type FirmCreate = Omit<Firm, 'id' | 'created_at' | 'updated_at'>;

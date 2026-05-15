import { BaseEntity } from './base';

/**
 * Enumeration of possible invoice statuses.
 */
export enum InvoiceStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

/**
 * Represents a Billing Invoice.
 */
export interface Invoice extends BaseEntity {
  firm_id: string;
  amount: number;
  status: InvoiceStatus;
}

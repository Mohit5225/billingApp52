/**
 * Base interface for all entities that includes common fields.
 */
export interface BaseEntity {
  id: string; // UUID
  created_at?: string; // ISO Timestamp
  updated_at?: string; // ISO Timestamp
}

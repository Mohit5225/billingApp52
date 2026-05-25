import { BaseEntity } from "./base";

export type GstTaxability = "Taxable" | "Nil Rated" | "Exempt" | "Zero Rated" | "Non-GST";
export type CessType = "none" | "ad_valorem" | "specific" | "compound";
export type ItemType = "Goods" | "Services";

export interface Hsn extends BaseEntity {
  firm_id: string;
  hsn_code: string;
  description?: string | null;
  code_type: string;
  is_active: boolean;
}

export interface Uom extends BaseEntity {
  firm_id: string;
  name: string;
  formal_name?: string | null;
  uqc_code: string;
  decimal_places: number;
}

export interface Item extends BaseEntity {
  firm_id: string;
  hsn_code?: string | null;
  uom_id: string;
  name: string;
  alias?: string | null;
  type: ItemType;
  default_price: number;
  is_gst_applicable: boolean;
  is_rcm: boolean;
  taxability: GstTaxability;
  igst_rate: number;
  cgst_rate: number;
  sgst_rate: number;
  cess_type: CessType;
  cess_percent: number;
  cess_amount_per_unit: number;
  opening_quantity: number;
  opening_rate: number;
  opening_value: number;
  is_active: boolean;
}

export interface ItemDetail extends Item {
  hsn_code?: string | null;
  uom_name?: string | null;
}

export interface StockPositionRow {
  item_id: string;
  item_name: string;
  alias?: string | null;
  hsn_code?: string | null;
  uom_name?: string | null;
  opening_quantity: number;
  opening_value: number;
  inward_quantity: number;
  outward_quantity: number;
  closing_quantity: number;
  closing_value: number;
  default_price: number;
  is_active: boolean;
}

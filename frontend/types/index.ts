// SnapSplit TypeScript Types
// Mirrors the backend Pydantic models

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  user?: UserInfo;
}

export interface UserInfo {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface GroupDetail extends Group {
  members: GroupMember[];
}

export interface ParsedReceiptItem {
  item_name: string;
  quantity: number;
  total_price: number;
}

export interface ReceiptScanResponse {
  items: ParsedReceiptItem[];
  raw_text?: string;
  confidence?: number;
}

export interface ReceiptItem {
  id: string;
  expense_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ItemAssignment {
  id: string;
  receipt_item_id: string;
  user_id: string;
}

export interface ReceiptItemWithAssignments extends ReceiptItem {
  assignments: ItemAssignment[];
}

export interface ExpenseCreate {
  group_id: string;
  description: string;
  total_amount: number;
  tax_amount: number;
  tip_amount: number;
  receipt_image_url?: string;
  items: {
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    assigned_user_ids: string[];
  }[];
}

export interface Expense {
  id: string;
  group_id: string;
  created_by: string;
  description: string;
  total_amount: number;
  tax_amount: number;
  tip_amount: number;
  receipt_image_url: string | null;
  status: "pending" | "settled";
  created_at: string;
}

export interface ExpenseDetail extends Expense {
  items: ReceiptItemWithAssignments[];
}

export interface Settlement {
  id: string;
  expense_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  is_paid: boolean;
  created_at: string;
}

export interface UserShare {
  user_id: string;
  base_share: number;
  tax_share: number;
  tip_share: number;
  total: number;
}

// Local state for the split screen (before saving)
export interface SplitItem extends ParsedReceiptItem {
  localId: string; // For local state management
  assignedUserIds: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain types
//
// Mirrors backend/prisma/schema.prisma exactly. Prisma serialises `Decimal`
// as a string and `DateTime` as an ISO string over the wire.
// ─────────────────────────────────────────────────────────────────────────────

export type Role = "SUPERADMIN" | "BUSINESS_ADMIN" | "STAFF";

export type AppointmentStatus = "BOOKED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Envelope produced by `ApiResponse` on the backend. Chat routes omit message/timestamp. */
export interface ApiEnvelope<T> {
  success: boolean;
  statusCode?: number;
  message?: string;
  data: T;
  timestamp?: string;
  meta?: PaginationMeta;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

// ─── Entities ────────────────────────────────────────────────────────────────
export interface Business {
  id: string;
  name: string;
  industry: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  /** Decimal — serialised by Prisma as a string, e.g. "1500.00". */
  price: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Availability {
  id: string;
  staffId: string;
  dayOfWeek: DayOfWeek;
  /** "HH:mm" — 24h string, validated by the backend. */
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
  staff?: Staff;
}

export interface Staff {
  id: string;
  businessId: string;
  name: string;
  role: string;
  bio: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  business?: Business;
  services?: StaffServiceLink[];
  availabilities?: Availability[];
  appointments?: Appointment[];
}

export interface StaffServiceLink {
  id: string;
  staffId: string;
  serviceId: string;
  createdAt: string;
  updatedAt: string;
  service?: Service;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
  appointments?: Appointment[];
  conversations?: Conversation[];
}

export interface Appointment {
  id: string;
  businessId: string;
  customerId: string;
  staffId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  business?: Business;
  customer?: Customer;
  staff?: Staff;
  service?: Service;
}

// ─── Conversation / AI ───────────────────────────────────────────────────────
export interface ToolCallPayload {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCallPayload[];
  tool_call_id?: string;
  name?: string;
}

export interface ExecutedTool {
  toolCallId: string;
  name: string;
  arguments: Record<string, unknown>;
  result: unknown;
  success: boolean;
}

export interface ConversationMetadata {
  messages?: ChatMessage[];
  lastToolExecutions?: ExecutedTool[];
}

export interface Conversation {
  id: string;
  businessId: string;
  customerId: string | null;
  transcript: string;
  intent: string | null;
  response: string | null;
  metadata: ConversationMetadata | null;
  createdAt: string;
  updatedAt: string;
  business?: Business;
  customer?: Customer | null;
}

export interface ChatTurnResponse {
  conversationId: string;
  businessId: string;
  businessName: string;
  response: string;
  intent: string | null;
  executedTools: ExecutedTool[];
}

export interface ChatTurnRequest {
  message: string;
  conversationId?: string;
  customerPhone?: string;
  customerName?: string;
}

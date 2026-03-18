// =============================================================================
// Service Fusion Types
// =============================================================================

export interface SFCustomer {
  id: number;
  name: string;
  type: 'Residential' | 'Commercial';
  email?: string;
  phoneNumber?: string;
  address?: SFAddress;
  createdOn: string;
  modifiedOn: string;
  active: boolean;
}

export interface SFAddress {
  street: string;
  unit?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface SFLocation {
  id: number;
  customerId: number;
  name?: string;
  address: SFAddress;
  contacts: SFContact[];
  createdOn: string;
  modifiedOn: string;
}

export interface SFContact {
  id: number;
  type: 'Phone' | 'Email' | 'Fax' | 'MobilePhone';
  value: string;
  memo?: string;
}

export interface SFJob {
  id: number;
  jobNumber: string;
  customerId: number;
  locationId: number;
  jobStatus: SFJobStatus;
  jobType?: SFJobType;
  businessUnitId?: number;
  campaignId?: number;
  summary?: string;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  createdOn: string;
  modifiedOn: string;
  completedOn?: string;
  appointments: SFAppointment[];
}

export type SFJobStatus =
  | 'Pending'
  | 'Scheduled'
  | 'Dispatched'
  | 'Working'
  | 'Hold'
  | 'Completed'
  | 'Canceled';

export interface SFJobType {
  id: number;
  name: string;
  code?: string;
}

export interface SFAppointment {
  id: number;
  jobId: number;
  technicianId?: number;
  start: string;
  end: string;
  arrivalWindowStart?: string;
  arrivalWindowEnd?: string;
  status: SFAppointmentStatus;
}

export type SFAppointmentStatus =
  | 'Scheduled'
  | 'Dispatched'
  | 'Working'
  | 'Done'
  | 'Canceled';

export interface SFTechnician {
  id: number;
  name: string;
  email?: string;
  phoneNumber?: string;
  businessUnitId?: number;
  active: boolean;
}

export interface SFInvoice {
  id: number;
  jobId?: number;
  customerId: number;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  subtotal: number;
  tax: number;
  total: number;
  balance: number;
  status: 'Pending' | 'Posted' | 'Exported' | 'Void';
  items: SFInvoiceItem[];
}

export interface SFInvoiceItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  serviceId?: number;
  materialId?: number;
}

export interface SFEstimate {
  id: number;
  jobId: number;
  name: string;
  status: 'Open' | 'Sold' | 'Dismissed';
  subtotal: number;
  tax: number;
  total: number;
  soldOn?: string;
  soldBy?: number;
  items: SFEstimateItem[];
}

export interface SFEstimateItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Pricebook
export interface SFPricebookService {
  id: number;
  name: string;
  code?: string;
  description?: string;
  price: number;
  cost?: number;
  active: boolean;
  categoryId?: number;
}

export interface SFPricebookMaterial {
  id: number;
  name: string;
  code?: string;
  description?: string;
  price: number;
  cost: number;
  vendor?: string;
  active: boolean;
  categoryId?: number;
}

// Booking
export interface SFBooking {
  id: number;
  customerId?: number;
  locationId?: number;
  name: string;
  address?: SFAddress;
  start: string;
  summary?: string;
  source?: string;
  createdOn: string;
}

// Telecom
export interface SFCall {
  id: number;
  callSid?: string;
  direction: 'Inbound' | 'Outbound';
  from: string;
  to: string;
  duration?: number;
  recordingUrl?: string;
  status: 'Ringing' | 'InProgress' | 'Completed' | 'Missed' | 'Voicemail';
  createdOn: string;
  customerId?: number;
  campaignId?: number;
  agentId?: number;
}

// =============================================================================
// Phoenix Agent Types
// =============================================================================

export interface IncomingCall {
  callId: string;
  callSid: string;
  recordingUrl?: string;
  callerPhone: string;
  callerName?: string;
  callDirection: 'inbound' | 'outbound';
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'ringing' | 'in-progress' | 'completed' | 'missed' | 'voicemail';
  campaignId?: number;
  agentId?: number;
}

export interface ExtractedCustomerData {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  customerType: 'Residential' | 'Commercial';
  phone?: string;
  email?: string;
  address?: {
    street?: string;
    unit?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  serviceNeeded?: string;
  urgency: 'emergency' | 'urgent' | 'standard' | 'flexible';
  preferredTimeWindows?: TimeWindow[];
  notes?: string;
  confidence: {
    overall: number;
    name: number;
    address: number;
    serviceType: number;
  };
}

export interface TimeWindow {
  date: string;
  startTime: string;
  endTime: string;
  preference: 'preferred' | 'acceptable' | 'if-necessary';
}

export interface CustomerMatch {
  customerId: number;
  locationId?: number;
  matchScore: number;
  matchedOn: ('phone' | 'email' | 'name' | 'address')[];
  customer: {
    id: number;
    name: string;
    type: string;
    phone?: string;
    email?: string;
  };
}

export interface CustomerResolution {
  decision: 'existing' | 'new' | 'needs-review';
  matches: CustomerMatch[];
  selectedCustomerId?: number;
  selectedLocationId?: number;
  reason: string;
}

export interface SchedulingSlot {
  technicianId: number;
  technicianName: string;
  date: string;
  startTime: string;
  endTime: string;
  travelTimeMinutes: number;
  distanceKm: number;
  score: number;
}

export interface SchedulingRecommendation {
  recommended: SchedulingSlot[];
  alternatives: SchedulingSlot[];
}

export interface AgentDecision {
  action: 'create_booking' | 'create_customer' | 'schedule_job' | 'needs_review' | 'escalate';
  customerId?: number;
  locationId?: number;
  jobId?: number;
  bookingId?: number;
  schedulingSlot?: SchedulingSlot;
  notes: string;
  confidence: number;
}

// =============================================================================
// Rexel / Pricebook Sync Types
// =============================================================================

export interface RexelPriceFile {
  fileName: string;
  receivedAt: string;
  itemCount: number;
  items: RexelPriceItem[];
  status: 'pending' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
}

export interface RexelPriceItem {
  sku: string;
  description: string;
  unitPrice: number;
  listPrice?: number;
  category?: string;
  manufacturer?: string;
  uom: string;
  effectiveDate?: string;
}

export interface PricebookSyncResult {
  syncId: string;
  syncedAt: string;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  itemsFailed: number;
  changes: PricebookChange[];
  status: 'completed' | 'partial' | 'failed';
}

export interface PricebookChange {
  sku: string;
  name: string;
  action: 'create' | 'update' | 'skip' | 'error';
  oldPrice?: number;
  newPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  reason?: string;
}

// =============================================================================
// Finance Types (QuickBooks, Bank, etc.)
// =============================================================================

export interface Bill {
  id: string;
  vendorId: string;
  vendorName: string;
  invoiceNumber?: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  tax?: number;
  total: number;
  status: 'pending' | 'approved' | 'paid' | 'void';
  items: BillItem[];
  attachmentUrl?: string;
  sourceType: 'email' | 'sftp' | 'manual';
  approvedBy?: string;
  approvedAt?: string;
}

export interface BillItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  accountId?: string;
  jobId?: string;
}

export interface BankTransaction {
  id: string;
  accountId: string;
  date: string;
  amount: number;
  type: 'debit' | 'credit';
  description: string;
  category?: string;
  matchedBillId?: string;
  matchedInvoiceId?: string;
  reconciled: boolean;
  reconciledAt?: string;
}

// =============================================================================
// MCP / Tool Types
// =============================================================================

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  requiresApproval: boolean;
  category: string;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface ApprovalRequest {
  id: string;
  toolName: string;
  operation: string;
  requestedBy: string;
  requestedAt: string;
  expiresAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  details: Record<string, unknown>;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface PaginatedResponse<T> {
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
  data: T[];
}

/**
 * Service Fusion v1 API pagination envelope.
 * SF uses { items[], _meta, _expandable } — NOT the same as PaginatedResponse.
 */
export interface SFPaginationMeta {
  totalCount: number;
  pageCount: number;
  currentPage: number;
  perPage: number;
}

export interface SFPaginatedResponse<T> {
  items: T[];
  _meta: SFPaginationMeta;
  _expandable?: string[];
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// =============================================================================
// Webhook Types
// =============================================================================

export interface SFWebhookPayload {
  eventType: string;
  eventId: string;
  tenantId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebhookProcessingResult {
  eventId: string;
  processed: boolean;
  action?: string;
  error?: string;
}

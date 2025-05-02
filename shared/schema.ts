import { pgTable, text, serial, integer, date, timestamp, doublePrecision, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles
export const USER_ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  BDM: "businessdevelopmentmanager",
  BDE: "businessdevelopmentexecutive"
};

// Employee table schema
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  employeeId: text("employee_id").notNull().unique(),
  name: text("name").notNull(),
  mobile: text("mobile").notNull(),
  jobLocation: text("job_location").notNull(),
  userType: text("user_type").notNull(),
  salary: doublePrecision("salary").notNull(),
  joiningDate: date("joining_date").notNull(),
  travelAllowance: doublePrecision("travel_allowance").notNull(),
  referralName: text("referral_name"),
  remarks: text("remarks"),
  managerId: integer("manager_id"),
  bdmId: integer("bdm_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // User authentication fields
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Bank Details schema
export const bankDetails = pgTable("bank_details", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  bankName: text("bank_name").notNull(),
  ifscCode: text("ifsc_code").notNull(),
  accountNumber: text("account_number").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define insert schemas
export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  employeeId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBankDetailsSchema = createInsertSchema(bankDetails).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Create a schema for registration that includes username and password
export const registerSchema = z.object({
  username: z.string().min(4, "Username must be at least 4 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  mobile: z.string().min(10, "Mobile number is required"),
  userType: z.string().min(1, "User type is required"),
  jobLocation: z.string().min(1, "Job location is required"),
  salary: z.number().positive("Salary must be positive"),
  joiningDate: z.string().min(1, "Joining date is required"),
  travelAllowance: z.number().nonnegative("Travel allowance must be non-negative"),
  referralName: z.string().optional(),
  remarks: z.string().optional(),
  managerId: z.number().optional(),
  bdmId: z.number().optional(),
});

// Create a login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// TypeScript types
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type LoginData = z.infer<typeof loginSchema>;

export type BankDetail = typeof bankDetails.$inferSelect;
export type InsertBankDetail = z.infer<typeof insertBankDetailsSchema>;

// For employee creation with bank details

// Attendance Records schema
export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }),
  loginTime: timestamp("login_time").notNull().defaultNow(),
  logoutTime: timestamp("logout_time"),
  date: date("date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAttendanceSchema = createInsertSchema(attendanceRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

export const createEmployeeWithBankSchema = z.object({
  employee: insertEmployeeSchema,
  bankDetails: insertBankDetailsSchema.omit({ employeeId: true }),
});

export type CreateEmployeeWithBank = z.infer<typeof createEmployeeWithBankSchema>;

// Products for Visit Reports
export const PRODUCT_TYPES = {
  SOUNDBOX: "soundbox",
  MERCHANT: "merchant",
  ANDROID_SWIPE: "android_swipe_machine",
  ANDROID_PRINTER: "android_printer_swipe_machine",
  DISTRIBUTOR: "distributor",
  MATM: "matm"
};

// Visit Reports schema
export const visitReports = pgTable("visit_reports", {
  id: serial("id").primaryKey(),
  bdeId: integer("bde_id").references(() => employees.id, { onDelete: "cascade" }),
  storeName: text("store_name").notNull(),
  ownerName: text("owner_name").notNull(),
  location: text("location").notNull(),
  phoneNumber: text("phone_number").notNull(),
  photoUrl: text("photo_url").notNull(),
  productsInterested: text("products_interested").array().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVisitReportSchema = createInsertSchema(visitReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const visitReportFormSchema = z.object({
  bdeId: z.number().positive(),
  storeName: z.string().min(1, "Store name is required"),
  ownerName: z.string().min(1, "Owner name is required"),
  location: z.string().min(1, "Location is required"),
  phoneNumber: z.string().min(10, "Valid phone number is required"),
  photoUrl: z.string().min(1, "Photo is required"),
  productsInterested: z.array(z.string()).min(1, "At least one product must be selected"),
});

export type VisitReport = typeof visitReports.$inferSelect;
export type InsertVisitReport = z.infer<typeof insertVisitReportSchema>;
export type VisitReportFormData = z.infer<typeof visitReportFormSchema>;

// Products schema
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  points: integer("points").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  points: z.number().int().positive("Points must be a positive number"),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type ProductFormData = z.infer<typeof productFormSchema>;

// Payment modes
export const PAYMENT_MODES = {
  UPI: "upi",
  NEFT: "neft",
  IMPS: "imps",
  CHEQUE: "cheque",
  RTGS: "rtgs",
};

// Verification statuses
export const VERIFICATION_STATUSES = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected"
};

// Verification Report schema
export const verificationReports = pgTable("verification_reports", {
  id: serial("id").primaryKey(),
  bdeId: integer("bde_id").references(() => employees.id, { onDelete: "cascade" }),
  merchantName: text("merchant_name").notNull(),
  mobileNumber: text("mobile_number").notNull(),
  businessName: text("business_name").notNull(),
  fullAddress: text("full_address").notNull(),
  verificationVideo: text("verification_video").notNull(),
  shopPhoto: text("shop_photo").notNull(),
  shopOwnerPhoto: text("shop_owner_photo").notNull(),
  aadhaarCardPhoto: text("aadhaar_card_photo").notNull(),
  panCardPhoto: text("pan_card_photo").notNull(),
  storeOutsidePhoto: text("store_outside_photo").notNull(),
  status: text("status").notNull().default("pending"),
  approvedBy: integer("approved_by").references(() => employees.id),
  approvedAt: timestamp("approved_at"),
  rejectedBy: integer("rejected_by").references(() => employees.id),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVerificationReportSchema = createInsertSchema(verificationReports).omit({
  id: true,
  status: true,
  approvedBy: true,
  approvedAt: true,
  rejectedBy: true,
  rejectedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
});

export const verificationReportFormSchema = z.object({
  merchantName: z.string().min(1, "Merchant name is required"),
  mobileNumber: z.string().min(10, "Valid mobile number is required"),
  businessName: z.string().min(1, "Business name is required"),
  fullAddress: z.string().min(1, "Full address is required"),
  verificationVideo: z.string().min(1, "Verification video is required"),
  shopPhoto: z.string().min(1, "Shop photo is required"),
  shopOwnerPhoto: z.string().min(1, "Shop owner photo is required"),
  aadhaarCardPhoto: z.string().min(1, "Aadhaar card photo is required"),
  panCardPhoto: z.string().min(1, "PAN card photo is required"),
  storeOutsidePhoto: z.string().min(1, "Store outside photo is required"),
});

export type VerificationReport = typeof verificationReports.$inferSelect;
export type InsertVerificationReport = z.infer<typeof insertVerificationReportSchema>;
export type VerificationReportFormData = z.infer<typeof verificationReportFormSchema>;

// Sales Report schema
export const salesReports = pgTable("sales_reports", {
  id: serial("id").primaryKey(),
  bdeId: integer("bde_id").references(() => employees.id, { onDelete: "cascade" }),
  merchantName: text("merchant_name").notNull(),
  merchantMobile: text("merchant_mobile").notNull(),
  location: text("location").notNull(),
  amount: doublePrecision("amount").notNull(),
  transactionId: text("transaction_id").notNull(),
  paymentMode: text("payment_mode").notNull(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  approvedBy: integer("approved_by").references(() => employees.id),
  approvedAt: timestamp("approved_at"),
  points: integer("points"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSalesReportSchema = createInsertSchema(salesReports).omit({
  id: true,
  status: true,
  approvedBy: true,
  approvedAt: true,
  points: true,
  createdAt: true,
  updatedAt: true,
});

export const salesReportFormSchema = z.object({
  merchantName: z.string().min(1, "Merchant name is required"),
  merchantMobile: z.string().min(10, "Valid mobile number is required"),
  location: z.string().min(1, "Location is required"),
  amount: z.number().positive("Amount must be positive"),
  transactionId: z.string().min(1, "Transaction ID is required"),
  paymentMode: z.string().min(1, "Payment mode is required"),
  productId: z.number().positive("Product is required"),
});

export type SalesReport = typeof salesReports.$inferSelect;
export type InsertSalesReport = z.infer<typeof insertSalesReportSchema>;
export type SalesReportFormData = z.infer<typeof salesReportFormSchema>;

// Document types for employee documents
export const DOCUMENT_TYPES = {
  PAYSLIP: "payslip",
  OFFER_LETTER: "offer_letter",
};

// Employee Documents schema
export const employeeDocuments = pgTable("employee_documents", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  documentType: text("document_type").notNull(), // payslip or offer_letter
  documentUrl: text("document_url").notNull(), // base64 or URL to document
  month: text("month"), // Format: YYYY-MM (only for payslips)
  uploadedBy: integer("uploaded_by").references(() => employees.id).notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEmployeeDocumentSchema = createInsertSchema(employeeDocuments).omit({
  id: true,
  uploadedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const employeeDocumentFormSchema = z.object({
  employeeId: z.number().positive("Employee is required"),
  documentType: z.string().min(1, "Document type is required"),
  documentUrl: z.string().min(1, "Document is required"),
  month: z.string().optional(), // Required only for payslips
  uploadedBy: z.number().positive("Uploader information is required"),
});

export type EmployeeDocument = typeof employeeDocuments.$inferSelect;
export type InsertEmployeeDocument = z.infer<typeof insertEmployeeDocumentSchema>;
export type EmployeeDocumentFormData = z.infer<typeof employeeDocumentFormSchema>;

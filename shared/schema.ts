import { pgTable, text, serial, integer, date, timestamp, doublePrecision } from "drizzle-orm/pg-core";
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

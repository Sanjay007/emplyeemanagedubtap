import { 
  employees, 
  type Employee, 
  type InsertEmployee, 
  bankDetails, 
  type BankDetail, 
  type InsertBankDetail, 
  attendanceRecords,
  type AttendanceRecord, 
  type InsertAttendance,
  visitReports,
  type VisitReport,
  type InsertVisitReport,
  products,
  type Product,
  type InsertProduct,
  salesReports,
  type SalesReport,
  type InsertSalesReport,
  verificationReports,
  type VerificationReport,
  type InsertVerificationReport,
  employeeDocuments,
  type EmployeeDocument,
  type InsertEmployeeDocument,
  USER_ROLES,
  VERIFICATION_STATUSES,
  DOCUMENT_TYPES
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, and, or, gte, lte, like, ilike, inArray, sql } from "drizzle-orm";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);
const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // Session store
  sessionStore: session.Store; 
  
  // User/Employee methods
  getUser(id: number): Promise<Employee | undefined>;
  getUserByUsername(username: string): Promise<Employee | undefined>;
  createUser(user: InsertEmployee, employeeId: string): Promise<Employee>;
  getAllUsers(): Promise<Employee[]>;
  updateUser(id: number, user: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Bank details methods
  getBankDetails(employeeId: number): Promise<BankDetail | undefined>;
  createBankDetails(details: InsertBankDetail): Promise<BankDetail>;
  updateBankDetails(id: number, details: Partial<InsertBankDetail>): Promise<BankDetail | undefined>;
  
  // Hierarchy methods
  getUsersByManager(managerId: number): Promise<Employee[]>;
  getUsersByBDM(bdmId: number): Promise<Employee[]>;
  assignUserToManager(userId: number, managerId: number): Promise<Employee | undefined>;
  assignUserToBDM(userId: number, bdmId: number): Promise<Employee | undefined>;
  removeUserAssignment(userId: number): Promise<Employee | undefined>;
  
  // Get users by role
  getManagers(): Promise<Employee[]>;
  getBDMs(): Promise<Employee[]>;
  getBDEs(): Promise<Employee[]>;
  
  // Attendance methods
  recordLogin(employeeId: number): Promise<AttendanceRecord>;
  recordLogout(employeeId: number): Promise<AttendanceRecord | undefined>;
  getAttendanceByDate(date: Date): Promise<AttendanceRecord[]>;
  getAttendanceByEmployeeId(employeeId: number): Promise<AttendanceRecord[]>;
  getAttendanceByDateRange(startDate: Date, endDate: Date): Promise<AttendanceRecord[]>;
  getAttendanceByManagerId(managerId: number, date?: Date): Promise<AttendanceRecord[]>;
  getAttendanceByBDMId(bdmId: number, date?: Date): Promise<AttendanceRecord[]>;
  getAttendanceForToday(): Promise<AttendanceRecord[]>;
  
  // Visit Reports methods
  createVisitReport(report: InsertVisitReport): Promise<VisitReport>;
  getVisitReportById(id: number): Promise<VisitReport | undefined>;
  getVisitReportsByBdeId(bdeId: number): Promise<VisitReport[]>;
  getVisitReportsByBdmId(bdmId: number): Promise<VisitReport[]>;
  getVisitReportsByManagerId(managerId: number): Promise<VisitReport[]>;
  getVisitReportsByDateRange(startDate: Date, endDate: Date): Promise<VisitReport[]>;
  getVisitReportsByLocation(location: string): Promise<VisitReport[]>;
  getTodayVisitReportCount(bdeId?: number): Promise<number>;
  getAllVisitReports(): Promise<VisitReport[]>;
  
  // Product methods
  createProduct(product: InsertProduct): Promise<Product>;
  getProductById(id: number): Promise<Product | undefined>;
  getAllProducts(): Promise<Product[]>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  
  // Sales Report methods
  createSalesReport(report: InsertSalesReport): Promise<SalesReport>;
  getSalesReportById(id: number): Promise<SalesReport | undefined>;
  getSalesReportsByBdeId(bdeId: number): Promise<SalesReport[]>;
  getSalesReportsByBdmId(bdmId: number): Promise<SalesReport[]>;
  getSalesReportsByManagerId(managerId: number): Promise<SalesReport[]>;
  getSalesReportsByDateRange(startDate: Date, endDate: Date): Promise<SalesReport[]>;
  getSalesByLocation(location: string): Promise<SalesReport[]>;
  getTodaySalesPoints(bdeId?: number): Promise<number>;
  getCurrentMonthSalesPoints(bdeId?: number): Promise<number>;
  getSalesByMonth(year: number, month: number, bdeId?: number): Promise<SalesReport[]>;
  getPendingSalesReports(): Promise<SalesReport[]>;
  approveSalesReport(id: number, adminId: number): Promise<SalesReport | undefined>;
  getAllSalesReports(): Promise<SalesReport[]>;
  
  // Verification Report methods
  createVerificationReport(report: InsertVerificationReport): Promise<VerificationReport>;
  getVerificationReportById(id: number): Promise<VerificationReport | undefined>;
  getVerificationReportsByBdeId(bdeId: number): Promise<VerificationReport[]>;
  getVerificationReportsByBdmId(bdmId: number): Promise<VerificationReport[]>;
  getVerificationReportsByManagerId(managerId: number): Promise<VerificationReport[]>;
  getVerificationReportsByDateRange(startDate: Date, endDate: Date): Promise<VerificationReport[]>;
  searchVerificationReports(query: string): Promise<VerificationReport[]>;
  getVerificationReportsByStatus(status: string): Promise<VerificationReport[]>;
  getPendingVerificationReports(): Promise<VerificationReport[]>;
  approveVerificationReport(id: number, adminId: number): Promise<VerificationReport | undefined>;
  rejectVerificationReport(id: number, adminId: number, reason: string): Promise<VerificationReport | undefined>;
  getAllVerificationReports(): Promise<VerificationReport[]>;
  
  // Employee Documents methods
  createEmployeeDocument(document: InsertEmployeeDocument): Promise<EmployeeDocument>;
  getEmployeeDocumentById(id: number): Promise<EmployeeDocument | undefined>;
  getEmployeeDocumentsByEmployeeId(employeeId: number): Promise<EmployeeDocument[]>;
  getEmployeeDocumentsByType(employeeId: number, documentType: string): Promise<EmployeeDocument[]>;
  getPayslipsByMonth(employeeId: number, month: string): Promise<EmployeeDocument | undefined>;
  getOfferLetter(employeeId: number): Promise<EmployeeDocument | undefined>;
  getAllEmployeeDocuments(): Promise<EmployeeDocument[]>;
  deleteEmployeeDocument(id: number): Promise<boolean>;
  searchEmployees(query: string): Promise<Employee[]>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User/Employee methods
  async getUser(id: number): Promise<Employee | undefined> {
    try {
      const [user] = await db.select().from(employees).where(eq(employees.id, id));
      return user;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<Employee | undefined> {
    try {
      const [user] = await db.select().from(employees).where(eq(employees.username, username));
      return user;
    } catch (error) {
      console.error("Error getting user by username:", error);
      throw error;
    }
  }

  async createUser(user: InsertEmployee, employeeId: string): Promise<Employee> {
    try {
      const [newUser] = await db
        .insert(employees)
        .values({
          ...user,
          employeeId
        })
        .returning();
      return newUser;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async getAllUsers(): Promise<Employee[]> {
    try {
      return await db.select().from(employees);
    } catch (error) {
      console.error("Error getting all users:", error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<InsertEmployee>): Promise<Employee | undefined> {
    try {
      const [updatedUser] = await db
        .update(employees)
        .set({ ...userData, updatedAt: new Date() })
        .where(eq(employees.id, id))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      await db.delete(employees).where(eq(employees.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  // Bank details methods
  async getBankDetails(employeeId: number): Promise<BankDetail | undefined> {
    try {
      const [details] = await db
        .select()
        .from(bankDetails)
        .where(eq(bankDetails.employeeId, employeeId));
      return details;
    } catch (error) {
      console.error("Error getting bank details:", error);
      throw error;
    }
  }

  async createBankDetails(details: InsertBankDetail): Promise<BankDetail> {
    try {
      const [newDetails] = await db
        .insert(bankDetails)
        .values(details)
        .returning();
      return newDetails;
    } catch (error) {
      console.error("Error creating bank details:", error);
      throw error;
    }
  }

  async updateBankDetails(id: number, details: Partial<InsertBankDetail>): Promise<BankDetail | undefined> {
    try {
      const [updatedDetails] = await db
        .update(bankDetails)
        .set({ ...details, updatedAt: new Date() })
        .where(eq(bankDetails.id, id))
        .returning();
      return updatedDetails;
    } catch (error) {
      console.error("Error updating bank details:", error);
      throw error;
    }
  }

  // Hierarchy methods
  async getUsersByManager(managerId: number): Promise<Employee[]> {
    try {
      return await db
        .select()
        .from(employees)
        .where(eq(employees.managerId, managerId));
    } catch (error) {
      console.error("Error getting users by manager:", error);
      throw error;
    }
  }

  async getUsersByBDM(bdmId: number): Promise<Employee[]> {
    try {
      return await db
        .select()
        .from(employees)
        .where(eq(employees.bdmId, bdmId));
    } catch (error) {
      console.error("Error getting users by BDM:", error);
      throw error;
    }
  }

  async assignUserToManager(userId: number, managerId: number): Promise<Employee | undefined> {
    try {
      // Check if manager exists
      const manager = await this.getUser(managerId);
      if (!manager || manager.userType !== USER_ROLES.MANAGER) {
        throw new Error("Invalid manager ID or user is not a manager");
      }

      const [updatedUser] = await db
        .update(employees)
        .set({
          managerId,
          bdmId: null,
          updatedAt: new Date()
        })
        .where(eq(employees.id, userId))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error("Error assigning user to manager:", error);
      throw error;
    }
  }

  async assignUserToBDM(userId: number, bdmId: number): Promise<Employee | undefined> {
    try {
      // Check if BDM exists
      const bdm = await this.getUser(bdmId);
      if (!bdm || bdm.userType !== USER_ROLES.BDM) {
        throw new Error("Invalid BDM ID or user is not a BDM");
      }

      // BDM should have a manager assigned
      if (!bdm.managerId) {
        throw new Error("BDM does not have a manager assigned");
      }

      const [updatedUser] = await db
        .update(employees)
        .set({
          managerId: bdm.managerId,
          bdmId,
          updatedAt: new Date()
        })
        .where(eq(employees.id, userId))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error("Error assigning user to BDM:", error);
      throw error;
    }
  }

  async removeUserAssignment(userId: number): Promise<Employee | undefined> {
    try {
      const [updatedUser] = await db
        .update(employees)
        .set({
          managerId: null,
          bdmId: null,
          updatedAt: new Date()
        })
        .where(eq(employees.id, userId))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error("Error removing user assignment:", error);
      throw error;
    }
  }

  // Get users by role
  async getManagers(): Promise<Employee[]> {
    try {
      return await db
        .select()
        .from(employees)
        .where(eq(employees.userType, USER_ROLES.MANAGER));
    } catch (error) {
      console.error("Error getting managers:", error);
      throw error;
    }
  }

  async getBDMs(): Promise<Employee[]> {
    try {
      return await db
        .select()
        .from(employees)
        .where(eq(employees.userType, USER_ROLES.BDM));
    } catch (error) {
      console.error("Error getting BDMs:", error);
      throw error;
    }
  }

  async getBDEs(): Promise<Employee[]> {
    try {
      return await db
        .select()
        .from(employees)
        .where(eq(employees.userType, USER_ROLES.BDE));
    } catch (error) {
      console.error("Error getting BDEs:", error);
      throw error;
    }
  }

  // Attendance methods
  async recordLogin(employeeId: number): Promise<AttendanceRecord> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if there's already a login record for today
      const [existingRecord] = await db
        .select()
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.employeeId, employeeId),
            eq(attendanceRecords.date, today)
          )
        );

      if (existingRecord) {
        return existingRecord;
      }

      // Create a new login record
      const [newRecord] = await db
        .insert(attendanceRecords)
        .values({
          employeeId,
          date: today,
          loginTime: new Date()
        })
        .returning();

      return newRecord;
    } catch (error) {
      console.error("Error recording login:", error);
      throw error;
    }
  }

  async recordLogout(employeeId: number): Promise<AttendanceRecord | undefined> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find today's attendance record
      const [record] = await db
        .select()
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.employeeId, employeeId),
            eq(attendanceRecords.date, today)
          )
        );

      if (!record) {
        return undefined;
      }

      // Update with logout time
      const [updatedRecord] = await db
        .update(attendanceRecords)
        .set({
          logoutTime: new Date(),
          updatedAt: new Date()
        })
        .where(eq(attendanceRecords.id, record.id))
        .returning();

      return updatedRecord;
    } catch (error) {
      console.error("Error recording logout:", error);
      throw error;
    }
  }

  async getAttendanceByDate(date: Date): Promise<AttendanceRecord[]> {
    try {
      return await db
        .select()
        .from(attendanceRecords)
        .where(eq(attendanceRecords.date, date));
    } catch (error) {
      console.error("Error getting attendance by date:", error);
      throw error;
    }
  }

  async getAttendanceByEmployeeId(employeeId: number): Promise<AttendanceRecord[]> {
    try {
      return await db
        .select()
        .from(attendanceRecords)
        .where(eq(attendanceRecords.employeeId, employeeId));
    } catch (error) {
      console.error("Error getting attendance by employee ID:", error);
      throw error;
    }
  }

  async getAttendanceByDateRange(startDate: Date, endDate: Date): Promise<AttendanceRecord[]> {
    try {
      return await db
        .select()
        .from(attendanceRecords)
        .where(
          and(
            gte(attendanceRecords.date, startDate),
            lte(attendanceRecords.date, endDate)
          )
        );
    } catch (error) {
      console.error("Error getting attendance by date range:", error);
      throw error;
    }
  }

  async getAttendanceByManagerId(managerId: number, date?: Date): Promise<AttendanceRecord[]> {
    try {
      // Get all employees under this manager
      const managedEmployees = await this.getUsersByManager(managerId);
      if (!managedEmployees.length) return [];

      const employeeIds = managedEmployees.map(emp => emp.id);

      let query = db
        .select()
        .from(attendanceRecords)
        .where(inArray(attendanceRecords.employeeId, employeeIds));

      if (date) {
        query = query.where(eq(attendanceRecords.date, date));
      }

      return await query;
    } catch (error) {
      console.error("Error getting attendance by manager ID:", error);
      throw error;
    }
  }

  async getAttendanceByBDMId(bdmId: number, date?: Date): Promise<AttendanceRecord[]> {
    try {
      // Get all BDEs under this BDM
      const bdes = await this.getUsersByBDM(bdmId);
      if (!bdes.length) return [];

      const bdeIds = bdes.map(bde => bde.id);

      let query = db
        .select()
        .from(attendanceRecords)
        .where(inArray(attendanceRecords.employeeId, bdeIds));

      if (date) {
        query = query.where(eq(attendanceRecords.date, date));
      }

      return await query;
    } catch (error) {
      console.error("Error getting attendance by BDM ID:", error);
      throw error;
    }
  }

  async getAttendanceForToday(): Promise<AttendanceRecord[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return await db
        .select()
        .from(attendanceRecords)
        .where(eq(attendanceRecords.date, today));
    } catch (error) {
      console.error("Error getting attendance for today:", error);
      throw error;
    }
  }

  // Visit Reports methods
  async createVisitReport(report: InsertVisitReport): Promise<VisitReport> {
    try {
      const [newReport] = await db
        .insert(visitReports)
        .values(report)
        .returning();
      return newReport;
    } catch (error) {
      console.error("Error creating visit report:", error);
      throw error;
    }
  }

  async getVisitReportById(id: number): Promise<VisitReport | undefined> {
    try {
      const [report] = await db
        .select()
        .from(visitReports)
        .where(eq(visitReports.id, id));
      return report;
    } catch (error) {
      console.error("Error getting visit report by ID:", error);
      throw error;
    }
  }

  async getVisitReportsByBdeId(bdeId: number): Promise<VisitReport[]> {
    try {
      return await db
        .select()
        .from(visitReports)
        .where(eq(visitReports.bdeId, bdeId));
    } catch (error) {
      console.error("Error getting visit reports by BDE ID:", error);
      throw error;
    }
  }

  async getVisitReportsByBdmId(bdmId: number): Promise<VisitReport[]> {
    try {
      // Get all BDEs under this BDM
      const bdes = await this.getUsersByBDM(bdmId);
      if (!bdes.length) return [];

      const bdeIds = bdes.map(bde => bde.id);

      return await db
        .select()
        .from(visitReports)
        .where(inArray(visitReports.bdeId, bdeIds));
    } catch (error) {
      console.error("Error getting visit reports by BDM ID:", error);
      throw error;
    }
  }

  async getVisitReportsByManagerId(managerId: number): Promise<VisitReport[]> {
    try {
      // Get all BDEs directly under this manager
      const directBdes = await this.getUsersByManager(managerId);
      
      // Get all BDMs under this manager
      const bdms = directBdes.filter(emp => emp.userType === USER_ROLES.BDM);
      
      // Get all BDEs under these BDMs
      const bdesUnderBdm = await Promise.all(
        bdms.map(bdm => this.getUsersByBDM(bdm.id))
      );
      
      // Combine all BDEs (direct and under BDMs)
      const allBdes = [
        ...directBdes.filter(emp => emp.userType === USER_ROLES.BDE),
        ...bdesUnderBdm.flat()
      ];
      
      if (!allBdes.length) return [];
      
      const bdeIds = allBdes.map(bde => bde.id);
      
      return await db
        .select()
        .from(visitReports)
        .where(inArray(visitReports.bdeId, bdeIds));
    } catch (error) {
      console.error("Error getting visit reports by manager ID:", error);
      throw error;
    }
  }

  async getVisitReportsByDateRange(startDate: Date, endDate: Date): Promise<VisitReport[]> {
    try {
      return await db
        .select()
        .from(visitReports)
        .where(
          and(
            gte(visitReports.createdAt, startDate),
            lte(visitReports.createdAt, endDate)
          )
        );
    } catch (error) {
      console.error("Error getting visit reports by date range:", error);
      throw error;
    }
  }

  async getVisitReportsByLocation(location: string): Promise<VisitReport[]> {
    try {
      return await db
        .select()
        .from(visitReports)
        .where(ilike(visitReports.location, `%${location}%`));
    } catch (error) {
      console.error("Error getting visit reports by location:", error);
      throw error;
    }
  }

  async getTodayVisitReportCount(bdeId?: number): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let query = db
        .select({ count: sql<number>`count(*)` })
        .from(visitReports)
        .where(
          and(
            gte(visitReports.createdAt, today),
            lt(visitReports.createdAt, tomorrow)
          )
        );

      if (bdeId) {
        query = query.where(eq(visitReports.bdeId, bdeId));
      }

      const [result] = await query;
      return result?.count || 0;
    } catch (error) {
      console.error("Error getting today's visit report count:", error);
      throw error;
    }
  }

  async getAllVisitReports(): Promise<VisitReport[]> {
    try {
      return await db
        .select()
        .from(visitReports);
    } catch (error) {
      console.error("Error getting all visit reports:", error);
      throw error;
    }
  }

  // Product methods
  async createProduct(product: InsertProduct): Promise<Product> {
    try {
      const [newProduct] = await db
        .insert(products)
        .values(product)
        .returning();
      return newProduct;
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  }

  async getProductById(id: number): Promise<Product | undefined> {
    try {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, id));
      return product;
    } catch (error) {
      console.error("Error getting product by ID:", error);
      throw error;
    }
  }

  async getAllProducts(): Promise<Product[]> {
    try {
      return await db
        .select()
        .from(products);
    } catch (error) {
      console.error("Error getting all products:", error);
      throw error;
    }
  }

  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product | undefined> {
    try {
      const [updatedProduct] = await db
        .update(products)
        .set({
          ...productData,
          updatedAt: new Date()
        })
        .where(eq(products.id, id))
        .returning();
      return updatedProduct;
    } catch (error) {
      console.error("Error updating product:", error);
      throw error;
    }
  }

  async deleteProduct(id: number): Promise<boolean> {
    try {
      await db
        .delete(products)
        .where(eq(products.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting product:", error);
      throw error;
    }
  }

  // Sales Report methods
  async createSalesReport(report: InsertSalesReport): Promise<SalesReport> {
    try {
      // Get product points
      const product = await this.getProductById(report.productId);
      
      const [newReport] = await db
        .insert(salesReports)
        .values({
          ...report,
          status: "pending",
          points: product?.points || 0,
        })
        .returning();
      return newReport;
    } catch (error) {
      console.error("Error creating sales report:", error);
      throw error;
    }
  }

  async getSalesReportById(id: number): Promise<SalesReport | undefined> {
    try {
      const [report] = await db
        .select()
        .from(salesReports)
        .where(eq(salesReports.id, id));
      return report;
    } catch (error) {
      console.error("Error getting sales report by ID:", error);
      throw error;
    }
  }

  async getSalesReportsByBdeId(bdeId: number): Promise<SalesReport[]> {
    try {
      return await db
        .select()
        .from(salesReports)
        .where(eq(salesReports.bdeId, bdeId));
    } catch (error) {
      console.error("Error getting sales reports by BDE ID:", error);
      throw error;
    }
  }

  async getSalesReportsByBdmId(bdmId: number): Promise<SalesReport[]> {
    try {
      // Get all BDEs under this BDM
      const bdes = await this.getUsersByBDM(bdmId);
      if (!bdes.length) return [];

      const bdeIds = bdes.map(bde => bde.id);

      return await db
        .select()
        .from(salesReports)
        .where(inArray(salesReports.bdeId, bdeIds));
    } catch (error) {
      console.error("Error getting sales reports by BDM ID:", error);
      throw error;
    }
  }

  async getSalesReportsByManagerId(managerId: number): Promise<SalesReport[]> {
    try {
      // Get all BDEs directly under this manager
      const directBdes = await this.getUsersByManager(managerId);
      
      // Get all BDMs under this manager
      const bdms = directBdes.filter(emp => emp.userType === USER_ROLES.BDM);
      
      // Get all BDEs under these BDMs
      const bdesUnderBdm = await Promise.all(
        bdms.map(bdm => this.getUsersByBDM(bdm.id))
      );
      
      // Combine all BDEs (direct and under BDMs)
      const allBdes = [
        ...directBdes.filter(emp => emp.userType === USER_ROLES.BDE),
        ...bdesUnderBdm.flat()
      ];
      
      if (!allBdes.length) return [];
      
      const bdeIds = allBdes.map(bde => bde.id);
      
      return await db
        .select()
        .from(salesReports)
        .where(inArray(salesReports.bdeId, bdeIds));
    } catch (error) {
      console.error("Error getting sales reports by manager ID:", error);
      throw error;
    }
  }

  async getSalesReportsByDateRange(startDate: Date, endDate: Date): Promise<SalesReport[]> {
    try {
      return await db
        .select()
        .from(salesReports)
        .where(
          and(
            gte(salesReports.createdAt, startDate),
            lte(salesReports.createdAt, endDate)
          )
        );
    } catch (error) {
      console.error("Error getting sales reports by date range:", error);
      throw error;
    }
  }

  async getSalesByLocation(location: string): Promise<SalesReport[]> {
    try {
      return await db
        .select()
        .from(salesReports)
        .where(ilike(salesReports.location, `%${location}%`));
    } catch (error) {
      console.error("Error getting sales by location:", error);
      throw error;
    }
  }

  async getTodaySalesPoints(bdeId?: number): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let query = db
        .select({ sum: sql<number>`sum(points)` })
        .from(salesReports)
        .where(
          and(
            gte(salesReports.createdAt, today),
            lt(salesReports.createdAt, tomorrow),
            eq(salesReports.status, "approved")
          )
        );

      if (bdeId) {
        query = query.where(eq(salesReports.bdeId, bdeId));
      }

      const [result] = await query;
      return result?.sum || 0;
    } catch (error) {
      console.error("Error getting today's sales points:", error);
      throw error;
    }
  }

  async getCurrentMonthSalesPoints(bdeId?: number): Promise<number> {
    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      let query = db
        .select({ sum: sql<number>`sum(points)` })
        .from(salesReports)
        .where(
          and(
            gte(salesReports.createdAt, firstDayOfMonth),
            lt(salesReports.createdAt, firstDayOfNextMonth),
            eq(salesReports.status, "approved")
          )
        );

      if (bdeId) {
        query = query.where(eq(salesReports.bdeId, bdeId));
      }

      const [result] = await query;
      return result?.sum || 0;
    } catch (error) {
      console.error("Error getting current month sales points:", error);
      throw error;
    }
  }

  async getSalesByMonth(year: number, month: number, bdeId?: number): Promise<SalesReport[]> {
    try {
      const firstDayOfMonth = new Date(year, month - 1, 1);
      const firstDayOfNextMonth = new Date(year, month, 1);

      let query = db
        .select()
        .from(salesReports)
        .where(
          and(
            gte(salesReports.createdAt, firstDayOfMonth),
            lt(salesReports.createdAt, firstDayOfNextMonth)
          )
        );

      if (bdeId) {
        query = query.where(eq(salesReports.bdeId, bdeId));
      }

      return await query;
    } catch (error) {
      console.error("Error getting sales by month:", error);
      throw error;
    }
  }

  async getPendingSalesReports(): Promise<SalesReport[]> {
    try {
      return await db
        .select()
        .from(salesReports)
        .where(eq(salesReports.status, "pending"));
    } catch (error) {
      console.error("Error getting pending sales reports:", error);
      throw error;
    }
  }

  async approveSalesReport(id: number, adminId: number): Promise<SalesReport | undefined> {
    try {
      const [updatedReport] = await db
        .update(salesReports)
        .set({
          status: "approved",
          approvedBy: adminId,
          approvedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(salesReports.id, id))
        .returning();
      return updatedReport;
    } catch (error) {
      console.error("Error approving sales report:", error);
      throw error;
    }
  }

  async getAllSalesReports(): Promise<SalesReport[]> {
    try {
      return await db
        .select()
        .from(salesReports);
    } catch (error) {
      console.error("Error getting all sales reports:", error);
      throw error;
    }
  }

  // Verification Report methods
  async createVerificationReport(report: InsertVerificationReport): Promise<VerificationReport> {
    try {
      const [newReport] = await db
        .insert(verificationReports)
        .values({
          ...report,
          status: VERIFICATION_STATUSES.PENDING
        })
        .returning();
      return newReport;
    } catch (error) {
      console.error("Error creating verification report:", error);
      throw error;
    }
  }
  
  async getVerificationReportById(id: number): Promise<VerificationReport | undefined> {
    try {
      const [report] = await db
        .select()
        .from(verificationReports)
        .where(eq(verificationReports.id, id));
      return report;
    } catch (error) {
      console.error("Error getting verification report by ID:", error);
      throw error;
    }
  }
  
  async getVerificationReportsByBdeId(bdeId: number): Promise<VerificationReport[]> {
    try {
      return await db
        .select()
        .from(verificationReports)
        .where(eq(verificationReports.bdeId, bdeId));
    } catch (error) {
      console.error("Error getting verification reports by BDE ID:", error);
      throw error;
    }
  }
  
  async getVerificationReportsByBdmId(bdmId: number): Promise<VerificationReport[]> {
    try {
      // Get all BDEs under this BDM
      const bdes = await this.getUsersByBDM(bdmId);
      if (!bdes.length) return [];
      
      const bdeIds = bdes.map(bde => bde.id);
      
      return await db
        .select()
        .from(verificationReports)
        .where(inArray(verificationReports.bdeId, bdeIds));
    } catch (error) {
      console.error("Error getting verification reports by BDM ID:", error);
      throw error;
    }
  }
  
  async getVerificationReportsByManagerId(managerId: number): Promise<VerificationReport[]> {
    try {
      // Get all BDMs under this manager
      const bdms = await this.getUsersByManager(managerId);
      
      // Get all BDEs directly under this manager and under the BDMs
      const directBdes = await this.getUsersByManager(managerId);
      const bdesByBdm = await Promise.all(
        bdms.map(bdm => this.getUsersByBDM(bdm.id))
      );
      
      // Flatten the arrays and filter for BDEs
      const allBdes = [
        ...directBdes.filter(user => user.userType === USER_ROLES.BDE),
        ...bdesByBdm.flat()
      ];
      
      if (!allBdes.length) return [];
      
      const bdeIds = allBdes.map(bde => bde.id);
      
      return await db
        .select()
        .from(verificationReports)
        .where(inArray(verificationReports.bdeId, bdeIds));
    } catch (error) {
      console.error("Error getting verification reports by Manager ID:", error);
      throw error;
    }
  }
  
  async getVerificationReportsByDateRange(startDate: Date, endDate: Date): Promise<VerificationReport[]> {
    try {
      return await db
        .select()
        .from(verificationReports)
        .where(
          and(
            gte(verificationReports.createdAt, startDate),
            lte(verificationReports.createdAt, endDate)
          )
        );
    } catch (error) {
      console.error("Error getting verification reports by date range:", error);
      throw error;
    }
  }
  
  async searchVerificationReports(query: string): Promise<VerificationReport[]> {
    try {
      const lowerQuery = query.toLowerCase();
      
      return await db
        .select()
        .from(verificationReports)
        .where(
          or(
            ilike(verificationReports.merchantName, `%${lowerQuery}%`),
            ilike(verificationReports.mobileNumber, `%${lowerQuery}%`),
            ilike(verificationReports.businessName, `%${lowerQuery}%`),
            ilike(verificationReports.fullAddress, `%${lowerQuery}%`)
          )
        );
    } catch (error) {
      console.error("Error searching verification reports:", error);
      throw error;
    }
  }
  
  async getVerificationReportsByStatus(status: string): Promise<VerificationReport[]> {
    try {
      return await db
        .select()
        .from(verificationReports)
        .where(eq(verificationReports.status, status));
    } catch (error) {
      console.error("Error getting verification reports by status:", error);
      throw error;
    }
  }
  
  async getPendingVerificationReports(): Promise<VerificationReport[]> {
    try {
      return await db
        .select()
        .from(verificationReports)
        .where(eq(verificationReports.status, VERIFICATION_STATUSES.PENDING));
    } catch (error) {
      console.error("Error getting pending verification reports:", error);
      throw error;
    }
  }
  
  async approveVerificationReport(id: number, adminId: number): Promise<VerificationReport | undefined> {
    try {
      const [updatedReport] = await db
        .update(verificationReports)
        .set({
          status: VERIFICATION_STATUSES.APPROVED,
          approvedBy: adminId,
          approvedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(verificationReports.id, id))
        .returning();
      
      return updatedReport;
    } catch (error) {
      console.error("Error approving verification report:", error);
      throw error;
    }
  }
  
  async rejectVerificationReport(id: number, adminId: number, reason: string): Promise<VerificationReport | undefined> {
    try {
      const [updatedReport] = await db
        .update(verificationReports)
        .set({
          status: VERIFICATION_STATUSES.REJECTED,
          rejectedBy: adminId,
          rejectedAt: new Date(),
          rejectionReason: reason,
          updatedAt: new Date()
        })
        .where(eq(verificationReports.id, id))
        .returning();
      
      return updatedReport;
    } catch (error) {
      console.error("Error rejecting verification report:", error);
      throw error;
    }
  }
  
  async getAllVerificationReports(): Promise<VerificationReport[]> {
    try {
      return await db
        .select()
        .from(verificationReports);
    } catch (error) {
      console.error("Error getting all verification reports:", error);
      throw error;
    }
  }
  
  // Employee Documents methods
  async createEmployeeDocument(document: InsertEmployeeDocument): Promise<EmployeeDocument> {
    try {
      const [newDocument] = await db
        .insert(employeeDocuments)
        .values(document)
        .returning();
      return newDocument;
    } catch (error) {
      console.error("Error creating employee document:", error);
      throw error;
    }
  }
  
  async getEmployeeDocumentById(id: number): Promise<EmployeeDocument | undefined> {
    try {
      const [document] = await db
        .select()
        .from(employeeDocuments)
        .where(eq(employeeDocuments.id, id));
      return document;
    } catch (error) {
      console.error("Error getting employee document by ID:", error);
      throw error;
    }
  }
  
  async getEmployeeDocumentsByEmployeeId(employeeId: number): Promise<EmployeeDocument[]> {
    try {
      return await db
        .select()
        .from(employeeDocuments)
        .where(eq(employeeDocuments.employeeId, employeeId));
    } catch (error) {
      console.error("Error getting employee documents by employee ID:", error);
      throw error;
    }
  }
  
  async getEmployeeDocumentsByType(employeeId: number, documentType: string): Promise<EmployeeDocument[]> {
    try {
      return await db
        .select()
        .from(employeeDocuments)
        .where(
          and(
            eq(employeeDocuments.employeeId, employeeId),
            eq(employeeDocuments.documentType, documentType)
          )
        );
    } catch (error) {
      console.error("Error getting employee documents by type:", error);
      throw error;
    }
  }
  
  async getPayslipsByMonth(employeeId: number, month: string): Promise<EmployeeDocument | undefined> {
    try {
      const [document] = await db
        .select()
        .from(employeeDocuments)
        .where(
          and(
            eq(employeeDocuments.employeeId, employeeId),
            eq(employeeDocuments.documentType, DOCUMENT_TYPES.PAYSLIP),
            eq(employeeDocuments.month, month)
          )
        );
      return document;
    } catch (error) {
      console.error("Error getting payslip by month:", error);
      throw error;
    }
  }
  
  async getOfferLetter(employeeId: number): Promise<EmployeeDocument | undefined> {
    try {
      const [document] = await db
        .select()
        .from(employeeDocuments)
        .where(
          and(
            eq(employeeDocuments.employeeId, employeeId),
            eq(employeeDocuments.documentType, DOCUMENT_TYPES.OFFER_LETTER)
          )
        );
      return document;
    } catch (error) {
      console.error("Error getting offer letter:", error);
      throw error;
    }
  }
  
  async getAllEmployeeDocuments(): Promise<EmployeeDocument[]> {
    try {
      return await db
        .select()
        .from(employeeDocuments);
    } catch (error) {
      console.error("Error getting all employee documents:", error);
      throw error;
    }
  }
  
  async deleteEmployeeDocument(id: number): Promise<boolean> {
    try {
      await db
        .delete(employeeDocuments)
        .where(eq(employeeDocuments.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting employee document:", error);
      throw error;
    }
  }
  
  async searchEmployees(query: string): Promise<Employee[]> {
    try {
      const lowerQuery = query.toLowerCase();
      return await db
        .select()
        .from(employees)
        .where(
          or(
            ilike(employees.name, `%${lowerQuery}%`),
            ilike(employees.mobile, `%${lowerQuery}%`),
            ilike(employees.username, `%${lowerQuery}%`),
            ilike(employees.employeeId, `%${lowerQuery}%`)
          )
        );
    } catch (error) {
      console.error("Error searching employees:", error);
      throw error;
    }
  }
}

// Use the DatabaseStorage implementation instead of MemStorage
export const storage = new DatabaseStorage();
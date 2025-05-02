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

const MemoryStore = createMemoryStore(session);
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // Session store
  sessionStore: any; // Using any to avoid SessionStore type issues
  
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

export class MemStorage implements IStorage {
  private users: Map<number, Employee>;
  private bankDetailsMap: Map<number, BankDetail>;
  private attendanceMap: Map<number, AttendanceRecord>;
  private visitReportsMap: Map<number, VisitReport>;
  private productsMap: Map<number, Product>;
  private salesReportsMap: Map<number, SalesReport>;
  private verificationReportsMap: Map<number, VerificationReport>;
  private employeeDocumentsMap: Map<number, EmployeeDocument>;
  private currentUserId: number;
  private currentBankDetailId: number;
  private currentAttendanceId: number;
  private currentVisitReportId: number;
  private currentProductId: number;
  private currentSalesReportId: number;
  private currentVerificationReportId: number;
  private currentEmployeeDocumentId: number;
  public sessionStore: any; // Using any to avoid SessionStore type issues

  constructor() {
    this.users = new Map();
    this.bankDetailsMap = new Map();
    this.attendanceMap = new Map();
    this.visitReportsMap = new Map();
    this.productsMap = new Map();
    this.salesReportsMap = new Map();
    this.verificationReportsMap = new Map();
    this.employeeDocumentsMap = new Map();
    this.currentUserId = 1;
    this.currentBankDetailId = 1;
    this.currentAttendanceId = 1;
    this.currentVisitReportId = 1;
    this.currentProductId = 1;
    this.currentSalesReportId = 1;
    this.currentVerificationReportId = 1;
    this.currentEmployeeDocumentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Create the admin user and sample users with hashed password
    this.initUsers();
    // Initialize default products
    this.initProducts();
  }
  
  private initProducts() {
    // Initialize default products with their points
    const defaultProducts: InsertProduct[] = [
      { name: "Merchant", points: 2 },
      { name: "Soundbox", points: 2 },
      { name: "Android Swipe Machine", points: 6 },
      { name: "Android Printer Swipe Machine", points: 10 },
      { name: "Distributor", points: 15 },
      { name: "mATM", points: 4 }
    ];
    
    defaultProducts.forEach(product => {
      const id = this.currentProductId++;
      this.productsMap.set(id, {
        ...product,
        id,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
  }
  
  private async initUsers() {
    // Create admin user
    await this.initAdminUser();
    
    // Create a sample manager
    const managerPassword = await hashPassword("manager123");
    const manager: Employee = {
      id: this.currentUserId++,
      name: "Sample Manager",
      mobile: "9876543211",
      jobLocation: "Delhi",
      userType: USER_ROLES.MANAGER,
      salary: 80000,
      joiningDate: new Date().toISOString(),
      travelAllowance: 8000,
      referralName: "",
      remarks: "Sample manager account",
      username: "manager",
      password: managerPassword,
      employeeId: "M1",
      createdAt: new Date(),
      updatedAt: new Date(),
      managerId: null,
      bdmId: null
    };
    this.users.set(manager.id, manager);
    
    // Create a sample BDM under the manager
    const bdmPassword = await hashPassword("bdm123");
    const bdm: Employee = {
      id: this.currentUserId++,
      name: "Sample BDM",
      mobile: "9876543212",
      jobLocation: "Mumbai",
      userType: USER_ROLES.BDM,
      salary: 60000,
      joiningDate: new Date().toISOString(),
      travelAllowance: 6000,
      referralName: "",
      remarks: "Sample BDM account",
      username: "bdm",
      password: bdmPassword,
      employeeId: "BDM1",
      createdAt: new Date(),
      updatedAt: new Date(),
      managerId: manager.id,
      bdmId: null
    };
    this.users.set(bdm.id, bdm);
    
    // Create a sample BDE under the BDM
    const bdePassword = await hashPassword("bde123");
    const bde: Employee = {
      id: this.currentUserId++,
      name: "Sample BDE",
      mobile: "9876543213",
      jobLocation: "Bangalore",
      userType: USER_ROLES.BDE,
      salary: 40000,
      joiningDate: new Date().toISOString(),
      travelAllowance: 4000,
      referralName: "",
      remarks: "Sample BDE account",
      username: "bde",
      password: bdePassword,
      employeeId: "BDE1",
      createdAt: new Date(),
      updatedAt: new Date(),
      managerId: manager.id,
      bdmId: bdm.id
    };
    this.users.set(bde.id, bde);
  }
  
  private async initAdminUser() {
    const hashedPassword = await hashPassword("admin123");
    const adminUser: Employee = {
      id: this.currentUserId++,
      name: "Admin User",
      mobile: "9876543210",
      jobLocation: "Headquarters",
      userType: USER_ROLES.ADMIN,
      salary: 100000,
      joiningDate: new Date().toISOString(),
      travelAllowance: 10000,
      referralName: "",
      remarks: "Default admin account",
      username: "admin",
      password: hashedPassword,
      employeeId: "AD1",
      createdAt: new Date(),
      updatedAt: new Date(),
      managerId: null,
      bdmId: null
    };
    
    this.users.set(adminUser.id, adminUser);
  }

  // User/Employee methods
  async getUser(id: number): Promise<Employee | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<Employee | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(user: InsertEmployee, employeeId: string): Promise<Employee> {
    const id = this.currentUserId++;
    const newUser: Employee = { 
      ...user, 
      id, 
      employeeId,
      createdAt: new Date(),
      updatedAt: new Date(),
      managerId: user.managerId || null,
      bdmId: user.bdmId || null
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async getAllUsers(): Promise<Employee[]> {
    return Array.from(this.users.values());
  }

  async updateUser(id: number, userData: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser: Employee = {
      ...user,
      ...userData,
      updatedAt: new Date()
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  // Bank details methods
  async getBankDetails(employeeId: number): Promise<BankDetail | undefined> {
    return Array.from(this.bankDetailsMap.values()).find(
      (detail) => detail.employeeId === employeeId
    );
  }

  async createBankDetails(details: InsertBankDetail): Promise<BankDetail> {
    const id = this.currentBankDetailId++;
    const newBankDetails: BankDetail = {
      ...details,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.bankDetailsMap.set(id, newBankDetails);
    return newBankDetails;
  }

  async updateBankDetails(id: number, details: Partial<InsertBankDetail>): Promise<BankDetail | undefined> {
    const bankDetail = this.bankDetailsMap.get(id);
    if (!bankDetail) return undefined;
    
    const updatedBankDetail: BankDetail = {
      ...bankDetail,
      ...details,
      updatedAt: new Date()
    };
    
    this.bankDetailsMap.set(id, updatedBankDetail);
    return updatedBankDetail;
  }

  // Hierarchy methods
  async getUsersByManager(managerId: number): Promise<Employee[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.managerId === managerId
    );
  }

  async getUsersByBDM(bdmId: number): Promise<Employee[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.bdmId === bdmId
    );
  }

  async assignUserToManager(userId: number, managerId: number): Promise<Employee | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    // Check if manager exists and is actually a manager
    const manager = this.users.get(managerId);
    if (!manager || manager.userType !== USER_ROLES.MANAGER) return undefined;
    
    const updatedUser: Employee = {
      ...user,
      managerId,
      bdmId: null, // Reset BDM if assigning directly to manager
      updatedAt: new Date()
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async assignUserToBDM(userId: number, bdmId: number): Promise<Employee | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    // Check if BDM exists and is actually a BDM
    const bdm = this.users.get(bdmId);
    if (!bdm || bdm.userType !== USER_ROLES.BDM) return undefined;
    
    // BDM should have a manager assigned
    if (!bdm.managerId) return undefined;
    
    const updatedUser: Employee = {
      ...user,
      managerId: bdm.managerId,
      bdmId,
      updatedAt: new Date()
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async removeUserAssignment(userId: number): Promise<Employee | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser: Employee = {
      ...user,
      managerId: null,
      bdmId: null,
      updatedAt: new Date()
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Get users by role
  async getManagers(): Promise<Employee[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.userType === USER_ROLES.MANAGER
    );
  }

  async getBDMs(): Promise<Employee[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.userType === USER_ROLES.BDM
    );
  }

  async getBDEs(): Promise<Employee[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.userType === USER_ROLES.BDE
    );
  }
  
  // Attendance methods
  async recordLogin(employeeId: number): Promise<AttendanceRecord> {
    const employee = await this.getUser(employeeId);
    if (!employee) {
      throw new Error("Employee not found");
    }
    
    // Check if there's already an active attendance record for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingRecord = Array.from(this.attendanceMap.values()).find(
      record => record.employeeId === employeeId && 
                new Date(record.date).getTime() === today.getTime() && 
                !record.logoutTime
    );
    
    if (existingRecord) {
      return existingRecord; // User already logged in today
    }
    
    const id = this.currentAttendanceId++;
    const newRecord: AttendanceRecord = {
      id,
      employeeId,
      loginTime: new Date(),
      logoutTime: null,
      date: today,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.attendanceMap.set(id, newRecord);
    return newRecord;
  }
  
  async recordLogout(employeeId: number): Promise<AttendanceRecord | undefined> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find today's active attendance record
    const record = Array.from(this.attendanceMap.values()).find(
      record => record.employeeId === employeeId && 
                new Date(record.date).getTime() === today.getTime() && 
                !record.logoutTime
    );
    
    if (!record) {
      return undefined; // No active attendance record found
    }
    
    const updatedRecord: AttendanceRecord = {
      ...record,
      logoutTime: new Date(),
      updatedAt: new Date()
    };
    
    this.attendanceMap.set(record.id, updatedRecord);
    return updatedRecord;
  }
  
  async getAttendanceByDate(date: Date): Promise<AttendanceRecord[]> {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    return Array.from(this.attendanceMap.values()).filter(
      record => new Date(record.date).getTime() === targetDate.getTime()
    );
  }
  
  async getAttendanceByEmployeeId(employeeId: number): Promise<AttendanceRecord[]> {
    return Array.from(this.attendanceMap.values()).filter(
      record => record.employeeId === employeeId
    );
  }
  
  async getAttendanceByDateRange(startDate: Date, endDate: Date): Promise<AttendanceRecord[]> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return Array.from(this.attendanceMap.values()).filter(
      record => {
        const recordDate = new Date(record.date);
        return recordDate >= start && recordDate <= end;
      }
    );
  }
  
  async getAttendanceByManagerId(managerId: number, date?: Date): Promise<AttendanceRecord[]> {
    // Get all employees under this manager
    const employees = await this.getUsersByManager(managerId);
    const employeeIds = employees.map(emp => emp.id);
    
    // Filter attendance records by employee IDs
    let records = Array.from(this.attendanceMap.values()).filter(
      record => employeeIds.includes(record.employeeId)
    );
    
    // If date is provided, filter by date as well
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      
      records = records.filter(
        record => new Date(record.date).getTime() === targetDate.getTime()
      );
    }
    
    return records;
  }
  
  async getAttendanceByBDMId(bdmId: number, date?: Date): Promise<AttendanceRecord[]> {
    // Get all employees under this BDM
    const employees = await this.getUsersByBDM(bdmId);
    const employeeIds = employees.map(emp => emp.id);
    
    // Filter attendance records by employee IDs
    let records = Array.from(this.attendanceMap.values()).filter(
      record => employeeIds.includes(record.employeeId)
    );
    
    // If date is provided, filter by date as well
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      
      records = records.filter(
        record => new Date(record.date).getTime() === targetDate.getTime()
      );
    }
    
    return records;
  }
  
  async getAttendanceForToday(): Promise<AttendanceRecord[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.getAttendanceByDate(today);
  }
  
  // Visit Reports methods
  async createVisitReport(report: InsertVisitReport): Promise<VisitReport> {
    const id = this.currentVisitReportId++;
    const newReport: VisitReport = {
      ...report,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.visitReportsMap.set(id, newReport);
    return newReport;
  }
  
  async getVisitReportById(id: number): Promise<VisitReport | undefined> {
    return this.visitReportsMap.get(id);
  }
  
  async getVisitReportsByBdeId(bdeId: number): Promise<VisitReport[]> {
    return Array.from(this.visitReportsMap.values()).filter(
      report => report.bdeId === bdeId
    );
  }
  
  async getVisitReportsByBdmId(bdmId: number): Promise<VisitReport[]> {
    // Get all BDEs under this BDM
    const bdes = await this.getUsersByBDM(bdmId);
    const bdeIds = bdes.map(bde => bde.id);
    
    // Get all reports from these BDEs
    return Array.from(this.visitReportsMap.values()).filter(
      report => bdeIds.includes(report.bdeId)
    );
  }
  
  async getVisitReportsByManagerId(managerId: number): Promise<VisitReport[]> {
    // Get all BDEs under managers (directly or via BDMs)
    const directBdes = await this.getUsersByManager(managerId);
    const bdms = Array.from(this.users.values()).filter(
      user => user.managerId === managerId && user.userType === USER_ROLES.BDM
    );
    
    let allBdes = [...directBdes];
    
    // Add BDEs under each BDM
    for (const bdm of bdms) {
      const bdmBdes = await this.getUsersByBDM(bdm.id);
      allBdes = [...allBdes, ...bdmBdes];
    }
    
    const bdeIds = allBdes
      .filter(user => user.userType === USER_ROLES.BDE)
      .map(bde => bde.id);
    
    // Get all reports from these BDEs
    return Array.from(this.visitReportsMap.values()).filter(
      report => bdeIds.includes(report.bdeId)
    );
  }
  
  async getVisitReportsByDateRange(startDate: Date, endDate: Date): Promise<VisitReport[]> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return Array.from(this.visitReportsMap.values()).filter(
      report => {
        const reportDate = new Date(report.createdAt);
        return reportDate >= start && reportDate <= end;
      }
    );
  }
  
  async getVisitReportsByLocation(location: string): Promise<VisitReport[]> {
    const lowercaseSearch = location.toLowerCase();
    return Array.from(this.visitReportsMap.values()).filter(
      report => report.location.toLowerCase().includes(lowercaseSearch)
    );
  }
  
  async getTodayVisitReportCount(bdeId?: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let reports = await this.getVisitReportsByDateRange(today, tomorrow);
    
    if (bdeId) {
      reports = reports.filter(report => report.bdeId === bdeId);
    }
    
    return reports.length;
  }
  
  async getAllVisitReports(): Promise<VisitReport[]> {
    return Array.from(this.visitReportsMap.values());
  }
  
  // Product methods
  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.currentProductId++;
    const newProduct: Product = {
      ...product,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.productsMap.set(id, newProduct);
    return newProduct;
  }
  
  async getProductById(id: number): Promise<Product | undefined> {
    return this.productsMap.get(id);
  }
  
  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.productsMap.values());
  }
  
  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const existingProduct = this.productsMap.get(id);
    if (!existingProduct) return undefined;
    
    const updatedProduct: Product = {
      ...existingProduct,
      ...product,
      updatedAt: new Date()
    };
    
    this.productsMap.set(id, updatedProduct);
    return updatedProduct;
  }
  
  async deleteProduct(id: number): Promise<boolean> {
    return this.productsMap.delete(id);
  }
  
  // Sales Report methods
  async createSalesReport(report: InsertSalesReport): Promise<SalesReport> {
    const id = this.currentSalesReportId++;
    
    // Get product to calculate points
    const product = await this.getProductById(report.productId);
    if (!product) {
      throw new Error("Product not found");
    }
    
    const newReport: SalesReport = {
      ...report,
      id,
      status: "pending",
      approvedBy: null,
      approvedAt: null,
      points: product.points,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.salesReportsMap.set(id, newReport);
    return newReport;
  }
  
  async getSalesReportById(id: number): Promise<SalesReport | undefined> {
    return this.salesReportsMap.get(id);
  }
  
  async getSalesReportsByBdeId(bdeId: number): Promise<SalesReport[]> {
    return Array.from(this.salesReportsMap.values()).filter(
      report => report.bdeId === bdeId
    );
  }
  
  async getSalesReportsByBdmId(bdmId: number): Promise<SalesReport[]> {
    // Get all BDEs under this BDM
    const bdes = await this.getUsersByBDM(bdmId);
    const bdeIds = bdes.map(bde => bde.id);
    
    // Get all reports from these BDEs
    return Array.from(this.salesReportsMap.values()).filter(
      report => bdeIds.includes(report.bdeId)
    );
  }
  
  async getSalesReportsByManagerId(managerId: number): Promise<SalesReport[]> {
    // Get all employees under this manager
    const directEmployees = await this.getUsersByManager(managerId);
    
    // Get BDMs under this manager
    const bdms = directEmployees.filter(emp => emp.userType === USER_ROLES.BDM);
    
    // Get BDEs directly under this manager
    const directBDEs = directEmployees.filter(emp => emp.userType === USER_ROLES.BDE);
    
    // Get BDEs under BDMs
    let allBDEs = [...directBDEs];
    
    for (const bdm of bdms) {
      const bdesUnderBdm = await this.getUsersByBDM(bdm.id);
      allBDEs = [...allBDEs, ...bdesUnderBdm];
    }
    
    // Get all BDE IDs
    const bdeIds = allBDEs.map(bde => bde.id);
    
    // Get all reports from these BDEs
    return Array.from(this.salesReportsMap.values()).filter(
      report => bdeIds.includes(report.bdeId)
    );
  }
  
  async getSalesReportsByDateRange(startDate: Date, endDate: Date): Promise<SalesReport[]> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return Array.from(this.salesReportsMap.values()).filter(
      report => {
        const reportDate = new Date(report.createdAt);
        return reportDate >= start && reportDate <= end;
      }
    );
  }
  
  async getSalesByLocation(location: string): Promise<SalesReport[]> {
    return Array.from(this.salesReportsMap.values()).filter(
      report => report.location.toLowerCase().includes(location.toLowerCase())
    );
  }
  
  async getTodaySalesPoints(bdeId?: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    
    const todayReports = Array.from(this.salesReportsMap.values()).filter(
      report => {
        if (bdeId && report.bdeId !== bdeId) return false;
        
        const reportDate = new Date(report.createdAt);
        return reportDate >= today && reportDate <= endOfDay && report.status === "approved";
      }
    );
    
    return todayReports.reduce((total, report) => total + (report.points || 0), 0);
  }
  
  async getCurrentMonthSalesPoints(bdeId?: number): Promise<number> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const monthReports = Array.from(this.salesReportsMap.values()).filter(
      report => {
        if (bdeId && report.bdeId !== bdeId) return false;
        
        const reportDate = new Date(report.createdAt);
        return reportDate >= firstDayOfMonth && reportDate <= lastDayOfMonth && report.status === "approved";
      }
    );
    
    return monthReports.reduce((total, report) => total + (report.points || 0), 0);
  }
  
  async getSalesByMonth(year: number, month: number, bdeId?: number): Promise<SalesReport[]> {
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    
    return Array.from(this.salesReportsMap.values()).filter(
      report => {
        if (bdeId && report.bdeId !== bdeId) return false;
        
        const reportDate = new Date(report.createdAt);
        return reportDate >= firstDayOfMonth && reportDate <= lastDayOfMonth;
      }
    );
  }
  
  async getPendingSalesReports(): Promise<SalesReport[]> {
    return Array.from(this.salesReportsMap.values()).filter(
      report => report.status === "pending"
    );
  }
  
  async approveSalesReport(id: number, adminId: number): Promise<SalesReport | undefined> {
    const report = this.salesReportsMap.get(id);
    if (!report) return undefined;
    
    // Check if admin exists
    const admin = await this.getUser(adminId);
    if (!admin || admin.userType !== USER_ROLES.ADMIN) {
      throw new Error("Only admins can approve sales reports");
    }
    
    const updatedReport: SalesReport = {
      ...report,
      status: "approved",
      approvedBy: adminId,
      approvedAt: new Date(),
      updatedAt: new Date()
    };
    
    this.salesReportsMap.set(id, updatedReport);
    return updatedReport;
  }
  
  async getAllSalesReports(): Promise<SalesReport[]> {
    return Array.from(this.salesReportsMap.values());
  }

  // Verification Report Methods
  async createVerificationReport(report: InsertVerificationReport): Promise<VerificationReport> {
    const id = this.currentVerificationReportId++;
    const newReport: VerificationReport = {
      ...report,
      id,
      status: VERIFICATION_STATUSES.PENDING,
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.verificationReportsMap.set(id, newReport);
    return newReport;
  }
  
  async getVerificationReportById(id: number): Promise<VerificationReport | undefined> {
    return this.verificationReportsMap.get(id);
  }
  
  async getVerificationReportsByBdeId(bdeId: number): Promise<VerificationReport[]> {
    return Array.from(this.verificationReportsMap.values())
      .filter(report => report.bdeId === bdeId);
  }
  
  async getVerificationReportsByBdmId(bdmId: number): Promise<VerificationReport[]> {
    // Get BDEs under this BDM
    const bdes = await this.getUsersByBDM(bdmId);
    const bdeIds = bdes.map(bde => bde.id);
    
    return Array.from(this.verificationReportsMap.values())
      .filter(report => bdeIds.includes(report.bdeId));
  }
  
  async getVerificationReportsByManagerId(managerId: number): Promise<VerificationReport[]> {
    // Get all employees under this manager
    const directEmployees = await this.getUsersByManager(managerId);
    
    // Get BDMs under this manager
    const bdms = directEmployees.filter(emp => emp.userType === USER_ROLES.BDM);
    
    // Get BDEs directly under this manager
    const directBDEs = directEmployees.filter(emp => emp.userType === USER_ROLES.BDE);
    
    // Get BDEs under BDMs
    let allBDEs = [...directBDEs];
    
    for (const bdm of bdms) {
      const bdesUnderBdm = await this.getUsersByBDM(bdm.id);
      allBDEs = [...allBDEs, ...bdesUnderBdm];
    }
    
    // Get all BDE IDs
    const bdeIds = allBDEs.map(bde => bde.id);
    
    // Get all reports from these BDEs
    return Array.from(this.verificationReportsMap.values())
      .filter(report => bdeIds.includes(report.bdeId));
  }
  
  async getVerificationReportsByDateRange(startDate: Date, endDate: Date): Promise<VerificationReport[]> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return Array.from(this.verificationReportsMap.values())
      .filter(report => {
        const reportDate = new Date(report.createdAt);
        return reportDate >= start && reportDate <= end;
      });
  }
  
  async searchVerificationReports(query: string): Promise<VerificationReport[]> {
    if (!query) return this.getAllVerificationReports();
    
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.verificationReportsMap.values())
      .filter(report => 
        report.merchantName.toLowerCase().includes(lowercaseQuery) ||
        report.mobileNumber.toLowerCase().includes(lowercaseQuery) ||
        report.businessName.toLowerCase().includes(lowercaseQuery) ||
        report.fullAddress.toLowerCase().includes(lowercaseQuery)
      );
  }
  
  async getVerificationReportsByStatus(status: string): Promise<VerificationReport[]> {
    return Array.from(this.verificationReportsMap.values())
      .filter(report => report.status === status);
  }
  
  async getPendingVerificationReports(): Promise<VerificationReport[]> {
    return Array.from(this.verificationReportsMap.values())
      .filter(report => report.status === VERIFICATION_STATUSES.PENDING);
  }
  
  async approveVerificationReport(id: number, adminId: number): Promise<VerificationReport | undefined> {
    const report = this.verificationReportsMap.get(id);
    if (!report) return undefined;
    
    // Check if admin exists
    const admin = await this.getUser(adminId);
    if (!admin || admin.userType !== USER_ROLES.ADMIN) {
      throw new Error("Only admins can approve verification reports");
    }
    
    const updatedReport: VerificationReport = {
      ...report,
      status: VERIFICATION_STATUSES.APPROVED,
      approvedBy: adminId,
      approvedAt: new Date(),
      updatedAt: new Date()
    };
    
    this.verificationReportsMap.set(id, updatedReport);
    return updatedReport;
  }
  
  async rejectVerificationReport(id: number, adminId: number, reason: string): Promise<VerificationReport | undefined> {
    const report = this.verificationReportsMap.get(id);
    if (!report) return undefined;
    
    // Check if admin exists
    const admin = await this.getUser(adminId);
    if (!admin || admin.userType !== USER_ROLES.ADMIN) {
      throw new Error("Only admins can reject verification reports");
    }
    
    const updatedReport: VerificationReport = {
      ...report,
      status: VERIFICATION_STATUSES.REJECTED,
      rejectedBy: adminId,
      rejectedAt: new Date(),
      rejectionReason: reason,
      updatedAt: new Date()
    };
    
    this.verificationReportsMap.set(id, updatedReport);
    return updatedReport;
  }
  
  async getAllVerificationReports(): Promise<VerificationReport[]> {
    return Array.from(this.verificationReportsMap.values());
  }
  
  // Employee Documents methods
  async createEmployeeDocument(document: InsertEmployeeDocument): Promise<EmployeeDocument> {
    const id = this.currentEmployeeDocumentId++;
    const newDocument: EmployeeDocument = {
      ...document,
      id,
      uploadedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.employeeDocumentsMap.set(id, newDocument);
    return newDocument;
  }
  
  async getEmployeeDocumentById(id: number): Promise<EmployeeDocument | undefined> {
    return this.employeeDocumentsMap.get(id);
  }
  
  async getEmployeeDocumentsByEmployeeId(employeeId: number): Promise<EmployeeDocument[]> {
    return Array.from(this.employeeDocumentsMap.values()).filter(
      doc => doc.employeeId === employeeId
    );
  }
  
  async getEmployeeDocumentsByType(employeeId: number, documentType: string): Promise<EmployeeDocument[]> {
    return Array.from(this.employeeDocumentsMap.values()).filter(
      doc => doc.employeeId === employeeId && doc.documentType === documentType
    );
  }
  
  async getPayslipsByMonth(employeeId: number, month: string): Promise<EmployeeDocument | undefined> {
    return Array.from(this.employeeDocumentsMap.values()).find(
      doc => doc.employeeId === employeeId && 
             doc.documentType === DOCUMENT_TYPES.PAYSLIP && 
             doc.month === month
    );
  }
  
  async getOfferLetter(employeeId: number): Promise<EmployeeDocument | undefined> {
    return Array.from(this.employeeDocumentsMap.values()).find(
      doc => doc.employeeId === employeeId && doc.documentType === DOCUMENT_TYPES.OFFER_LETTER
    );
  }
  
  async getAllEmployeeDocuments(): Promise<EmployeeDocument[]> {
    return Array.from(this.employeeDocumentsMap.values());
  }
  
  async deleteEmployeeDocument(id: number): Promise<boolean> {
    return this.employeeDocumentsMap.delete(id);
  }
  
  async searchEmployees(query: string): Promise<Employee[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.users.values()).filter(
      user => 
        user.name.toLowerCase().includes(lowercaseQuery) || 
        user.employeeId.toLowerCase().includes(lowercaseQuery) || 
        user.mobile.toLowerCase().includes(lowercaseQuery)
    );
  }
}

export const storage = new MemStorage();
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
  USER_ROLES 
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
}

export class MemStorage implements IStorage {
  private users: Map<number, Employee>;
  private bankDetailsMap: Map<number, BankDetail>;
  private attendanceMap: Map<number, AttendanceRecord>;
  private currentUserId: number;
  private currentBankDetailId: number;
  private currentAttendanceId: number;
  public sessionStore: any; // Using any to avoid SessionStore type issues

  constructor() {
    this.users = new Map();
    this.bankDetailsMap = new Map();
    this.attendanceMap = new Map();
    this.currentUserId = 1;
    this.currentBankDetailId = 1;
    this.currentAttendanceId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Create the admin user with hashed password
    this.initAdminUser();
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
}

export const storage = new MemStorage();
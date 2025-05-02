import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { 
  Employee, 
  insertBankDetailsSchema, 
  insertEmployeeSchema,
  insertVerificationReportSchema,
  insertVisitReportSchema,
  insertProductSchema,
  insertSalesReportSchema,
  insertEmployeeDocumentSchema,
  USER_ROLES,
  VERIFICATION_STATUSES,
  DOCUMENT_TYPES,
  AttendanceRecord,
  VerificationReport,
  VisitReport,
  Product,
  SalesReport,
  EmployeeDocument
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // API endpoints for employee management
  
  // Change user password
  app.post("/api/user/change-password", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const user = req.user as Employee;
      
      // Import the comparePasswords and hashPassword functions from auth.ts
      const { comparePasswords, hashPassword } = await import("./auth");
      
      // Verify current password
      const isCurrentPasswordValid = await comparePasswords(currentPassword, user.password);
      
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
      
      // Hash the new password
      const hashedNewPassword = await hashPassword(newPassword);
      
      // Update the user's password
      const updatedUser = await storage.updateUser(user.id, {
        password: hashedNewPassword
      });
      
      if (!updatedUser) {
        return res.status(500).json({ error: "Failed to update password" });
      }
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all employees
  app.get("/api/employees", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const employees = await storage.getAllUsers();
      
      // Remove passwords from the response
      const sanitizedEmployees = employees.map(emp => {
        const { password, ...userWithoutPassword } = emp;
        return userWithoutPassword;
      });
      
      res.status(200).json(sanitizedEmployees);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  // Get employee by ID
  app.get("/api/employees/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const id = parseInt(req.params.id);
      const employee = await storage.getUser(id);
      
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = employee;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employee" });
    }
  });

  // Update employee
  app.put("/api/employees/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      const id = parseInt(req.params.id);
      
      // Only admin can update any employee
      // Managers can update their BDMs and BDEs
      // BDMs can update their BDEs
      if (user.userType !== USER_ROLES.ADMIN) {
        const targetEmployee = await storage.getUser(id);
        
        if (!targetEmployee) {
          return res.status(404).json({ error: "Employee not found" });
        }
        
        if (user.userType === USER_ROLES.MANAGER && 
            targetEmployee.managerId !== user.id) {
          return res.status(403).json({ error: "You can only update your own team members" });
        }
        
        if (user.userType === USER_ROLES.BDM && 
            targetEmployee.bdmId !== user.id) {
          return res.status(403).json({ error: "You can only update your own team members" });
        }
        
        if (user.userType === USER_ROLES.BDE) {
          return res.status(403).json({ error: "You don't have permission to update employees" });
        }
      }
      
      // Validate input data
      const validation = insertEmployeeSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }
      
      const updatedEmployee = await storage.updateUser(id, validation.data);
      
      if (!updatedEmployee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedEmployee;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to update employee" });
    }
  });

  // Delete employee
  app.delete("/api/employees/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      const id = parseInt(req.params.id);
      
      // Only admin can delete employees
      if (user.userType !== USER_ROLES.ADMIN) {
        return res.status(403).json({ error: "Only admins can delete employees" });
      }
      
      const deleted = await storage.deleteUser(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete employee" });
    }
  });

  // Bank Details API
  
  // Get bank details for an employee
  app.get("/api/bank-details/:employeeId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      const employeeId = parseInt(req.params.employeeId);
      
      // Users can only see their own bank details unless they're admin
      if (user.userType !== USER_ROLES.ADMIN && user.id !== employeeId) {
        return res.status(403).json({ error: "You can only view your own bank details" });
      }
      
      const bankDetails = await storage.getBankDetails(employeeId);
      
      if (!bankDetails) {
        return res.status(404).json({ error: "Bank details not found" });
      }
      
      res.status(200).json(bankDetails);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bank details" });
    }
  });

  // Create or update bank details
  app.post("/api/bank-details", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // Validate input data
      const validation = insertBankDetailsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }
      
      const user = req.user as Employee;
      
      // Users can only update their own bank details unless they're admin
      if (user.userType !== USER_ROLES.ADMIN && user.id !== validation.data.employeeId) {
        return res.status(403).json({ error: "You can only update your own bank details" });
      }
      
      const existingBankDetails = await storage.getBankDetails(validation.data.employeeId);
      
      if (existingBankDetails) {
        // Update existing bank details
        const updatedBankDetails = await storage.updateBankDetails(
          existingBankDetails.id, 
          validation.data
        );
        return res.status(200).json(updatedBankDetails);
      } else {
        // Create new bank details
        const newBankDetails = await storage.createBankDetails(validation.data);
        return res.status(201).json(newBankDetails);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update bank details" });
    }
  });

  // Hierarchy Management API
  
  // Get employees by manager ID
  app.get("/api/managers/:managerId/employees", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const managerId = parseInt(req.params.managerId);
      const employees = await storage.getUsersByManager(managerId);
      
      // Remove passwords from the response
      const sanitizedEmployees = employees.map(emp => {
        const { password, ...userWithoutPassword } = emp;
        return userWithoutPassword;
      });
      
      res.status(200).json(sanitizedEmployees);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  // Get employees by BDM ID
  app.get("/api/bdms/:bdmId/employees", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const bdmId = parseInt(req.params.bdmId);
      const employees = await storage.getUsersByBDM(bdmId);
      
      // Remove passwords from the response
      const sanitizedEmployees = employees.map(emp => {
        const { password, ...userWithoutPassword } = emp;
        return userWithoutPassword;
      });
      
      res.status(200).json(sanitizedEmployees);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  // Assign employee to manager
  app.post("/api/employees/:employeeId/assign-manager/:managerId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      
      // Only admin can reassign employees
      if (user.userType !== USER_ROLES.ADMIN) {
        return res.status(403).json({ error: "Only admins can reassign employees" });
      }
      
      const employeeId = parseInt(req.params.employeeId);
      const managerId = parseInt(req.params.managerId);
      
      const updatedEmployee = await storage.assignUserToManager(employeeId, managerId);
      
      if (!updatedEmployee) {
        return res.status(404).json({ error: "Employee or manager not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedEmployee;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to assign employee" });
    }
  });

  // Assign employee to BDM
  app.post("/api/employees/:employeeId/assign-bdm/:bdmId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      
      // Only admin can reassign employees
      if (user.userType !== USER_ROLES.ADMIN) {
        return res.status(403).json({ error: "Only admins can reassign employees" });
      }
      
      const employeeId = parseInt(req.params.employeeId);
      const bdmId = parseInt(req.params.bdmId);
      
      const updatedEmployee = await storage.assignUserToBDM(employeeId, bdmId);
      
      if (!updatedEmployee) {
        return res.status(404).json({ error: "Employee, BDM not found, or BDM doesn't have a manager" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedEmployee;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to assign employee" });
    }
  });

  // Remove employee assignment
  app.post("/api/employees/:employeeId/remove-assignment", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      
      // Only admin can remove assignments
      if (user.userType !== USER_ROLES.ADMIN) {
        return res.status(403).json({ error: "Only admins can remove assignments" });
      }
      
      const employeeId = parseInt(req.params.employeeId);
      
      const updatedEmployee = await storage.removeUserAssignment(employeeId);
      
      if (!updatedEmployee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedEmployee;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to remove assignment" });
    }
  });

  // Get employees by role
  app.get("/api/roles/managers", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const managers = await storage.getManagers();
      
      // Remove passwords from the response
      const sanitizedManagers = managers.map(manager => {
        const { password, ...userWithoutPassword } = manager;
        return userWithoutPassword;
      });
      
      res.status(200).json(sanitizedManagers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch managers" });
    }
  });

  app.get("/api/roles/bdms", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const bdms = await storage.getBDMs();
      
      // Remove passwords from the response
      const sanitizedBDMs = bdms.map(bdm => {
        const { password, ...userWithoutPassword } = bdm;
        return userWithoutPassword;
      });
      
      res.status(200).json(sanitizedBDMs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch BDMs" });
    }
  });

  app.get("/api/roles/bdes", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const bdes = await storage.getBDEs();
      
      // Remove passwords from the response
      const sanitizedBDEs = bdes.map(bde => {
        const { password, ...userWithoutPassword } = bde;
        return userWithoutPassword;
      });
      
      res.status(200).json(sanitizedBDEs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch BDEs" });
    }
  });

  // Attendance API Routes
  
  // Record login
  app.post("/api/attendance/login", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      const attendanceRecord = await storage.recordLogin(user.id);
      
      res.status(200).json(attendanceRecord);
    } catch (error) {
      res.status(500).json({ error: "Failed to record login" });
    }
  });
  
  // Record logout
  app.post("/api/attendance/logout", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      const attendanceRecord = await storage.recordLogout(user.id);
      
      if (!attendanceRecord) {
        return res.status(400).json({ error: "No active attendance record found" });
      }
      
      res.status(200).json(attendanceRecord);
    } catch (error) {
      res.status(500).json({ error: "Failed to record logout" });
    }
  });
  
  // Get attendance for current user
  app.get("/api/attendance/me", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      const attendanceRecords = await storage.getAttendanceByEmployeeId(user.id);
      
      res.status(200).json(attendanceRecords);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attendance records" });
    }
  });
  
  // Get attendance by date range with optional employeeId filter
  app.get("/api/attendance", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      
      // Parse query parameters
      const startDateStr = req.query.startDate as string | undefined;
      const endDateStr = req.query.endDate as string | undefined;
      const employeeIdStr = req.query.employeeId as string | undefined;
      const phoneNumber = req.query.phoneNumber as string | undefined;
      
      // Default to current date if no dates provided
      const startDate = startDateStr ? new Date(startDateStr) : new Date();
      const endDate = endDateStr ? new Date(endDateStr) : new Date();
      
      // Set time to beginning of day for start date and end of day for end date
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      let attendanceRecords: AttendanceRecord[] = [];
      
      // Fetch records based on user role and filters
      if (user.userType === USER_ROLES.ADMIN) {
        // Admin can see all records
        attendanceRecords = await storage.getAttendanceByDateRange(startDate, endDate);
        
        // Filter by employee ID if provided
        if (employeeIdStr) {
          const employeeId = parseInt(employeeIdStr);
          attendanceRecords = attendanceRecords.filter(record => record.employeeId === employeeId);
        }
      } else if (user.userType === USER_ROLES.MANAGER) {
        // Manager can see records of employees under them
        attendanceRecords = await storage.getAttendanceByManagerId(user.id);
        
        // Filter by date range
        attendanceRecords = attendanceRecords.filter(record => {
          const recordDate = new Date(record.date);
          return recordDate >= startDate && recordDate <= endDate;
        });
        
        // Filter by employee ID if provided
        if (employeeIdStr) {
          const employeeId = parseInt(employeeIdStr);
          // Check if this employee is under this manager
          const employeesUnderManager = await storage.getUsersByManager(user.id);
          const employeeIds = employeesUnderManager.map(e => e.id);
          
          if (!employeeIds.includes(employeeId)) {
            return res.status(403).json({ error: "You can only view attendance for your team members" });
          }
          
          attendanceRecords = attendanceRecords.filter(record => record.employeeId === employeeId);
        }
      } else if (user.userType === USER_ROLES.BDM) {
        // BDM can see records of BDEs under them
        attendanceRecords = await storage.getAttendanceByBDMId(user.id);
        
        // Filter by date range
        attendanceRecords = attendanceRecords.filter(record => {
          const recordDate = new Date(record.date);
          return recordDate >= startDate && recordDate <= endDate;
        });
        
        // Filter by employee ID if provided
        if (employeeIdStr) {
          const employeeId = parseInt(employeeIdStr);
          // Check if this employee is under this BDM
          const employeesUnderBDM = await storage.getUsersByBDM(user.id);
          const employeeIds = employeesUnderBDM.map(e => e.id);
          
          if (!employeeIds.includes(employeeId)) {
            return res.status(403).json({ error: "You can only view attendance for your team members" });
          }
          
          attendanceRecords = attendanceRecords.filter(record => record.employeeId === employeeId);
        }
      } else {
        // BDEs can only see their own records
        attendanceRecords = await storage.getAttendanceByEmployeeId(user.id);
        
        // Filter by date range
        attendanceRecords = attendanceRecords.filter(record => {
          const recordDate = new Date(record.date);
          return recordDate >= startDate && recordDate <= endDate;
        });
      }
      
      // If phone number filter is provided, get all employees and filter by mobile
      if (phoneNumber && phoneNumber.trim() !== '') {
        const allEmployees = await storage.getAllUsers();
        const employeeIdsWithPhone = allEmployees
          .filter(emp => emp.mobile && emp.mobile.includes(phoneNumber))
          .map(emp => emp.id);
        
        // Filter attendance records by these employee IDs
        attendanceRecords = attendanceRecords.filter(record => 
          record.employeeId !== null && employeeIdsWithPhone.includes(record.employeeId!)
        );
      }
      
      // Fetch employee info for each record to include in response
      const employeeInfo = new Map<number, Omit<Employee, 'password'>>();
      
      for (const record of attendanceRecords) {
        if (!employeeInfo.has(record.employeeId)) {
          const employee = await storage.getUser(record.employeeId);
          if (employee) {
            const { password, ...userWithoutPassword } = employee;
            employeeInfo.set(record.employeeId, userWithoutPassword);
          }
        }
      }
      
      // Enhance attendance records with employee info
      const enhancedRecords = attendanceRecords.map(record => ({
        ...record,
        employee: employeeInfo.get(record.employeeId)
      }));
      
      res.status(200).json(enhancedRecords);
    } catch (error) {
      console.error('Attendance error:', error);
      res.status(500).json({ error: "Failed to fetch attendance records" });
    }
  });
  
  // Get today's attendance
  app.get("/api/attendance/today", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      
      let attendanceRecords: AttendanceRecord[] = [];
      
      // Fetch records based on user role
      if (user.userType === USER_ROLES.ADMIN) {
        // Admin can see all records
        attendanceRecords = await storage.getAttendanceForToday();
      } else if (user.userType === USER_ROLES.MANAGER) {
        // Manager can see records of employees under them
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        attendanceRecords = await storage.getAttendanceByManagerId(user.id, today);
      } else if (user.userType === USER_ROLES.BDM) {
        // BDM can see records of BDEs under them
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        attendanceRecords = await storage.getAttendanceByBDMId(user.id, today);
      } else {
        // BDEs can only see their own records
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        attendanceRecords = (await storage.getAttendanceByEmployeeId(user.id)).filter(
          record => new Date(record.date).getTime() === today.getTime()
        );
      }
      
      // Fetch employee info for each record to include in response
      const employeeInfo = new Map<number, Omit<Employee, 'password'>>();
      
      for (const record of attendanceRecords) {
        if (!employeeInfo.has(record.employeeId)) {
          const employee = await storage.getUser(record.employeeId);
          if (employee) {
            const { password, ...userWithoutPassword } = employee;
            employeeInfo.set(record.employeeId, userWithoutPassword);
          }
        }
      }
      
      // Enhance attendance records with employee info
      const enhancedRecords = attendanceRecords.map(record => ({
        ...record,
        employee: employeeInfo.get(record.employeeId)
      }));
      
      res.status(200).json(enhancedRecords);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attendance records" });
    }
  });

  // Visit Reports API Routes
  
  // Create new visit report (BDE only)
  app.post("/api/visit-reports", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      
      // Only BDEs can create visit reports
      if (user.userType !== USER_ROLES.BDE) {
        return res.status(403).json({ error: "Only BDEs can create visit reports" });
      }
      
      // Validate input data
      const validation = insertVisitReportSchema.safeParse({
        ...req.body,
        bdeId: user.id // Ensure the bdeId matches the current user
      });
      
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }
      
      const newReport = await storage.createVisitReport(validation.data);
      res.status(201).json(newReport);
    } catch (error) {
      res.status(500).json({ error: "Failed to create visit report" });
    }
  });
  
  // Get visit report by ID
  app.get("/api/visit-reports/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      const reportId = parseInt(req.params.id);
      
      const report = await storage.getVisitReportById(reportId);
      
      if (!report) {
        return res.status(404).json({ error: "Visit report not found" });
      }
      
      // Check permissions based on role hierarchy
      if (user.userType !== USER_ROLES.ADMIN) {
        if (user.userType === USER_ROLES.BDE && report.bdeId !== user.id) {
          return res.status(403).json({ error: "You can only view your own visit reports" });
        }
        
        if (user.userType === USER_ROLES.BDM) {
          const bdes = await storage.getUsersByBDM(user.id);
          const bdeIds = bdes.map(bde => bde.id);
          
          if (!bdeIds.includes(report.bdeId)) {
            return res.status(403).json({ error: "You can only view your team's visit reports" });
          }
        }
        
        if (user.userType === USER_ROLES.MANAGER) {
          const managerReports = await storage.getVisitReportsByManagerId(user.id);
          const reportIds = managerReports.map(r => r.id);
          
          if (!reportIds.includes(report.id)) {
            return res.status(403).json({ error: "You can only view your team's visit reports" });
          }
        }
      }
      
      res.status(200).json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch visit report" });
    }
  });
  
  // Get all visit reports with role-based filtering
  app.get("/api/visit-reports", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      
      // Filter based on user role
      let reports: VisitReport[] = [];
      
      if (user.userType === USER_ROLES.ADMIN) {
        reports = await storage.getAllVisitReports();
      } else if (user.userType === USER_ROLES.MANAGER) {
        reports = await storage.getVisitReportsByManagerId(user.id);
      } else if (user.userType === USER_ROLES.BDM) {
        reports = await storage.getVisitReportsByBdmId(user.id);
      } else if (user.userType === USER_ROLES.BDE) {
        reports = await storage.getVisitReportsByBdeId(user.id);
      }
      
      // Apply additional filters if provided
      const startDateStr = req.query.startDate as string | undefined;
      const endDateStr = req.query.endDate as string | undefined;
      const location = req.query.location as string | undefined;
      
      if (startDateStr && endDateStr) {
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);
        
        reports = reports.filter(report => {
          const reportDate = new Date(report.createdAt);
          return reportDate >= startDate && reportDate <= endDate;
        });
      }
      
      if (location) {
        reports = reports.filter(report => 
          report.location.toLowerCase().includes(location.toLowerCase())
        );
      }
      
      res.status(200).json(reports);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch visit reports" });
    }
  });
  
  // Get today's visit report count for a BDE
  app.get("/api/visit-reports/count/today", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      const bdeId = user.userType === USER_ROLES.BDE ? user.id : undefined;
      
      const count = await storage.getTodayVisitReportCount(bdeId);
      res.status(200).json({ count });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch visit report count" });
    }
  });

  // ======== PRODUCT MANAGEMENT API ========
  
  // Get all products
  app.get("/api/products", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const products = await storage.getAllProducts();
      res.status(200).json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });
  
  // Get product by ID
  app.get("/api/products/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const id = parseInt(req.params.id);
      const product = await storage.getProductById(id);
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.status(200).json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });
  
  // Create a new product (admin only)
  app.post("/api/products", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      
      // Only admin can create products
      if (user.userType !== USER_ROLES.ADMIN) {
        return res.status(403).json({ error: "Only admins can create products" });
      }
      
      // Validate input data
      const validation = insertProductSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }
      
      const newProduct = await storage.createProduct(validation.data);
      res.status(201).json(newProduct);
    } catch (error) {
      res.status(500).json({ error: "Failed to create product" });
    }
  });
  
  // Update a product (admin only)
  app.put("/api/products/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      
      // Only admin can update products
      if (user.userType !== USER_ROLES.ADMIN) {
        return res.status(403).json({ error: "Only admins can update products" });
      }
      
      const id = parseInt(req.params.id);
      
      // Validate input data
      const validation = insertProductSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }
      
      const updatedProduct = await storage.updateProduct(id, validation.data);
      
      if (!updatedProduct) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.status(200).json(updatedProduct);
    } catch (error) {
      res.status(500).json({ error: "Failed to update product" });
    }
  });
  
  // Delete a product (admin only)
  app.delete("/api/products/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      
      // Only admin can delete products
      if (user.userType !== USER_ROLES.ADMIN) {
        return res.status(403).json({ error: "Only admins can delete products" });
      }
      
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProduct(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });
  
  // ======== SALES REPORT API ========
  
  // Create a sales report (BDE only)
  app.post("/api/sales-reports", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      
      // Only BDEs can create sales reports
      if (user.userType !== USER_ROLES.BDE) {
        return res.status(403).json({ error: "Only BDEs can create sales reports" });
      }
      
      // Validate input data
      const validation = insertSalesReportSchema.safeParse({
        ...req.body,
        bdeId: user.id
      });
      
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }
      
      const newSalesReport = await storage.createSalesReport(validation.data);
      res.status(201).json(newSalesReport);
    } catch (error) {
      res.status(500).json({ error: "Failed to create sales report" });
    }
  });
  
  // Get all sales reports (with role-based access)
  app.get("/api/sales-reports", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      let salesReports: SalesReport[] = [];
      
      // Filter reports based on user role and query parameters
      if (user.userType === USER_ROLES.ADMIN) {
        // Admin can see all reports
        salesReports = await storage.getAllSalesReports();
      } else if (user.userType === USER_ROLES.MANAGER) {
        // Manager can see reports from their team
        salesReports = await storage.getSalesReportsByManagerId(user.id);
      } else if (user.userType === USER_ROLES.BDM) {
        // BDM can see reports from their BDEs
        salesReports = await storage.getSalesReportsByBdmId(user.id);
      } else if (user.userType === USER_ROLES.BDE) {
        // BDE can see only their own reports
        salesReports = await storage.getSalesReportsByBdeId(user.id);
      }
      
      // Apply date range filter if provided
      const { startDate, endDate, location, month, year } = req.query;
      
      if (startDate && endDate) {
        salesReports = await storage.getSalesReportsByDateRange(
          new Date(startDate as string),
          new Date(endDate as string)
        );
      } else if (month && year) {
        salesReports = await storage.getSalesByMonth(
          parseInt(year as string),
          parseInt(month as string),
          user.userType === USER_ROLES.BDE ? user.id : undefined
        );
      } else if (location) {
        salesReports = await storage.getSalesByLocation(location as string);
      }
      
      res.status(200).json(salesReports);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales reports" });
    }
  });
  
  // Get sales report by ID
  app.get("/api/sales-reports/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const id = parseInt(req.params.id);
      const report = await storage.getSalesReportById(id);
      
      if (!report) {
        return res.status(404).json({ error: "Sales report not found" });
      }
      
      const user = req.user as Employee;
      
      // Access control based on user role
      if (user.userType !== USER_ROLES.ADMIN &&
          user.userType !== USER_ROLES.MANAGER &&
          (user.userType === USER_ROLES.BDM && !await isBdeUnderBdm(report.bdeId, user.id)) &&
          (user.userType === USER_ROLES.BDE && report.bdeId !== user.id)) {
        return res.status(403).json({ error: "You don't have permission to view this report" });
      }
      
      res.status(200).json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales report" });
    }
  });
  
  // Helper function to check if a BDE is under a BDM
  async function isBdeUnderBdm(bdeId: number, bdmId: number): Promise<boolean> {
    const bdesUnderBdm = await storage.getUsersByBDM(bdmId);
    return bdesUnderBdm.some(bde => bde.id === bdeId);
  }
  
  // Get pending sales reports (admin only)
  app.get("/api/sales-reports/pending", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      
      // Only admin can see all pending reports
      if (user.userType !== USER_ROLES.ADMIN) {
        return res.status(403).json({ error: "Only admins can view all pending reports" });
      }
      
      const pendingReports = await storage.getPendingSalesReports();
      res.status(200).json(pendingReports);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pending sales reports" });
    }
  });
  
  // Approve a sales report (admin only)
  app.post("/api/sales-reports/:id/approve", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      
      // Only admin can approve reports
      if (user.userType !== USER_ROLES.ADMIN) {
        return res.status(403).json({ error: "Only admins can approve sales reports" });
      }
      
      const id = parseInt(req.params.id);
      const approvedReport = await storage.approveSalesReport(id, user.id);
      
      if (!approvedReport) {
        return res.status(404).json({ error: "Sales report not found" });
      }
      
      res.status(200).json(approvedReport);
    } catch (error) {
      res.status(500).json({ error: "Failed to approve sales report" });
    }
  });
  
  // Get today's sales points
  app.get("/api/sales-reports/stats/today", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      const bdeId = user.userType === USER_ROLES.BDE ? user.id : undefined;
      
      const points = await storage.getTodaySalesPoints(bdeId);
      res.status(200).json({ points });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch today's sales points" });
    }
  });
  
  // Get current month's sales points
  app.get("/api/sales-reports/stats/month", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      const bdeId = user.userType === USER_ROLES.BDE ? user.id : undefined;
      
      const points = await storage.getCurrentMonthSalesPoints(bdeId);
      res.status(200).json({ points });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch month's sales points" });
    }
  });

  // ***** VERIFICATION REPORTS API ENDPOINTS *****

  // Create a new verification report (BDE only)
  app.post("/api/verification-reports", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      
      // Only BDEs can create verification reports
      if (user.userType !== USER_ROLES.BDE) {
        return res.status(403).json({ error: "Only BDEs can create verification reports" });
      }
      
      // Add the BDE ID to the report data
      const reportData = {
        ...req.body,
        bdeId: user.id
      };
      
      // Validate input data
      const validation = insertVerificationReportSchema.safeParse(reportData);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }
      
      const newReport = await storage.createVerificationReport(validation.data);
      res.status(201).json(newReport);
    } catch (error) {
      res.status(500).json({ error: "Failed to create verification report" });
    }
  });
  
  // Get all verification reports (with role-based access)
  app.get("/api/verification-reports", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      let reports: VerificationReport[] = [];
      
      // Filter reports based on user role and query parameters
      if (user.userType === USER_ROLES.ADMIN) {
        // Admin can see all reports
        reports = await storage.getAllVerificationReports();
      } else if (user.userType === USER_ROLES.MANAGER) {
        // Manager can see reports from their team
        reports = await storage.getVerificationReportsByManagerId(user.id);
      } else if (user.userType === USER_ROLES.BDM) {
        // BDM can see reports from their BDEs
        reports = await storage.getVerificationReportsByBdmId(user.id);
      } else if (user.userType === USER_ROLES.BDE) {
        // BDE can see only their own reports
        reports = await storage.getVerificationReportsByBdeId(user.id);
      }
      
      // Apply additional filters if provided
      const { startDate, endDate, status, query } = req.query;
      
      if (startDate && endDate) {
        reports = await storage.getVerificationReportsByDateRange(
          new Date(startDate as string),
          new Date(endDate as string)
        );
      }
      
      if (status) {
        reports = reports.filter(report => report.status === status);
      }
      
      if (query) {
        const searchResults = await storage.searchVerificationReports(query as string);
        // Intersect with the reports filtered by role
        const reportIds = new Set(reports.map(r => r.id));
        reports = searchResults.filter(r => reportIds.has(r.id));
      }
      
      res.status(200).json(reports);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch verification reports" });
    }
  });
  
  // Get verification report by ID
  app.get("/api/verification-reports/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const id = parseInt(req.params.id);
      const report = await storage.getVerificationReportById(id);
      
      if (!report) {
        return res.status(404).json({ error: "Verification report not found" });
      }
      
      const user = req.user as Employee;
      
      // Access control based on user role
      if (user.userType !== USER_ROLES.ADMIN &&
          user.userType !== USER_ROLES.MANAGER &&
          (user.userType === USER_ROLES.BDM && !await isBdeUnderBdm(report.bdeId, user.id)) &&
          (user.userType === USER_ROLES.BDE && report.bdeId !== user.id)) {
        return res.status(403).json({ error: "You don't have permission to access this report" });
      }
      
      res.status(200).json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch verification report" });
    }
  });
  
  // Get pending verification reports (admin only)
  app.get("/api/verification-reports/pending", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      
      if (user.userType !== USER_ROLES.ADMIN) {
        return res.status(403).json({ error: "Only admins can access pending reports" });
      }
      
      const pendingReports = await storage.getPendingVerificationReports();
      res.status(200).json(pendingReports);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pending verification reports" });
    }
  });
  
  // Update a verification report (BDE can edit rejected reports)
  app.put("/api/verification-reports/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const id = parseInt(req.params.id);
      const user = req.user as Employee;
      const report = await storage.getVerificationReportById(id);
      
      if (!report) {
        return res.status(404).json({ error: "Verification report not found" });
      }
      
      // Only the BDE who created the report and only if it's rejected can edit it
      if (user.userType === USER_ROLES.BDE) {
        if (report.bdeId !== user.id) {
          return res.status(403).json({ error: "You can only edit your own reports" });
        }
        
        if (report.status !== VERIFICATION_STATUSES.REJECTED) {
          return res.status(403).json({ error: "You can only edit rejected reports" });
        }
      } else {
        return res.status(403).json({ error: "Only BDEs can edit reports" });
      }
      
      // Add the BDE ID to the report data
      const reportData = {
        ...req.body,
        bdeId: user.id
      };
      
      // Validate input data
      const validation = insertVerificationReportSchema.safeParse(reportData);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }
      
      // Delete the old report and create a new one with the updated data
      // Set status back to pending
      const newReport = await storage.createVerificationReport(validation.data);
      res.status(200).json(newReport);
    } catch (error) {
      res.status(500).json({ error: "Failed to update verification report" });
    }
  });
  
  // Approve a verification report (admin only)
  app.post("/api/verification-reports/:id/approve", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      
      if (user.userType !== USER_ROLES.ADMIN) {
        return res.status(403).json({ error: "Only admins can approve verification reports" });
      }
      
      const id = parseInt(req.params.id);
      const approvedReport = await storage.approveVerificationReport(id, user.id);
      
      if (!approvedReport) {
        return res.status(404).json({ error: "Verification report not found" });
      }
      
      res.status(200).json(approvedReport);
    } catch (error) {
      res.status(500).json({ error: "Failed to approve verification report" });
    }
  });
  
  // Reject a verification report (admin only)
  app.post("/api/verification-reports/:id/reject", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      
      if (user.userType !== USER_ROLES.ADMIN) {
        return res.status(403).json({ error: "Only admins can reject verification reports" });
      }
      
      const id = parseInt(req.params.id);
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ error: "Rejection reason is required" });
      }
      
      const rejectedReport = await storage.rejectVerificationReport(id, user.id, reason);
      
      if (!rejectedReport) {
        return res.status(404).json({ error: "Verification report not found" });
      }
      
      res.status(200).json(rejectedReport);
    } catch (error) {
      res.status(500).json({ error: "Failed to reject verification report" });
    }
  });

  // Employee Document API Endpoints
  
  // Upload a document for an employee (Admin only)
  app.post("/api/employee-documents", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      
      // Only admins can upload documents
      if (user.userType !== USER_ROLES.ADMIN) {
        return res.status(403).json({ error: "Only admins can upload employee documents" });
      }
      
      // Validate input data
      const validation = insertEmployeeDocumentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }
      
      // Record the admin as the uploader
      const documentData = {
        ...validation.data,
        uploadedBy: user.id
      };
      
      const newDocument = await storage.createEmployeeDocument(documentData);
      res.status(201).json(newDocument);
    } catch (error) {
      console.error("Document upload error:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });
  
  // Get all documents for an employee
  app.get("/api/employee-documents/:employeeId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      const employeeId = parseInt(req.params.employeeId);
      
      // Users can only view their own documents unless they're admin
      if (user.userType !== USER_ROLES.ADMIN && user.id !== employeeId) {
        return res.status(403).json({ error: "You can only view your own documents" });
      }
      
      const documents = await storage.getEmployeeDocumentsByEmployeeId(employeeId);
      res.status(200).json(documents);
    } catch (error) {
      console.error("Document fetch error:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });
  
  // Get documents by type for an employee
  app.get("/api/employee-documents/:employeeId/type/:documentType", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      const employeeId = parseInt(req.params.employeeId);
      const documentType = req.params.documentType;
      
      // Validate document type
      if (!Object.values(DOCUMENT_TYPES).includes(documentType)) {
        return res.status(400).json({ error: "Invalid document type" });
      }
      
      // Users can only view their own documents unless they're admin
      if (user.userType !== USER_ROLES.ADMIN && user.id !== employeeId) {
        return res.status(403).json({ error: "You can only view your own documents" });
      }
      
      const documents = await storage.getEmployeeDocumentsByType(employeeId, documentType);
      res.status(200).json(documents);
    } catch (error) {
      console.error("Document fetch error:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });
  
  // Get payslips for a specific month
  app.get("/api/employee-documents/:employeeId/payslips/:month", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      const employeeId = parseInt(req.params.employeeId);
      const month = req.params.month;
      
      // Users can only view their own payslips unless they're admin
      if (user.userType !== USER_ROLES.ADMIN && user.id !== employeeId) {
        return res.status(403).json({ error: "You can only view your own payslips" });
      }
      
      const payslip = await storage.getPayslipsByMonth(employeeId, month);
      
      if (!payslip) {
        return res.status(404).json({ error: "Payslip not found for the specified month" });
      }
      
      res.status(200).json(payslip);
    } catch (error) {
      console.error("Payslip fetch error:", error);
      res.status(500).json({ error: "Failed to fetch payslip" });
    }
  });
  
  // Get offer letter for an employee
  app.get("/api/employee-documents/:employeeId/offer-letter", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      const employeeId = parseInt(req.params.employeeId);
      
      // Users can only view their own offer letter unless they're admin
      if (user.userType !== USER_ROLES.ADMIN && user.id !== employeeId) {
        return res.status(403).json({ error: "You can only view your own offer letter" });
      }
      
      const offerLetter = await storage.getOfferLetter(employeeId);
      
      if (!offerLetter) {
        return res.status(404).json({ error: "Offer letter not found" });
      }
      
      res.status(200).json(offerLetter);
    } catch (error) {
      console.error("Offer letter fetch error:", error);
      res.status(500).json({ error: "Failed to fetch offer letter" });
    }
  });
  
  // Delete a document (Admin only)
  app.delete("/api/employee-documents/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      
      // Only admins can delete documents
      if (user.userType !== USER_ROLES.ADMIN) {
        return res.status(403).json({ error: "Only admins can delete employee documents" });
      }
      
      const documentId = parseInt(req.params.id);
      const deleted = await storage.deleteEmployeeDocument(documentId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Document deletion error:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });
  
  // Get all documents (Admin only)
  app.get("/api/employee-documents", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      
      // Only admins can view all documents
      if (user.userType !== USER_ROLES.ADMIN) {
        return res.status(403).json({ error: "Only admins can view all employee documents" });
      }
      
      const documents = await storage.getAllEmployeeDocuments();
      res.status(200).json(documents);
    } catch (error) {
      console.error("Documents fetch error:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });
  
  // Search employees by name, employee ID, or mobile number
  app.get("/api/search-employees", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      
      // Only admins can search employees for document management
      if (user.userType !== USER_ROLES.ADMIN) {
        return res.status(403).json({ error: "Only admins can search all employees" });
      }
      
      const query = req.query.q as string;
      
      if (!query || query.trim() === '') {
        return res.status(400).json({ error: "Search query is required" });
      }
      
      const employees = await storage.searchEmployees(query);
      
      // Remove passwords from the response
      const sanitizedEmployees = employees.map(emp => {
        const { password, ...userWithoutPassword } = emp;
        return userWithoutPassword;
      });
      
      res.status(200).json(sanitizedEmployees);
    } catch (error) {
      console.error("Employee search error:", error);
      res.status(500).json({ error: "Failed to search employees" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

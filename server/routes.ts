import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { 
  Employee, 
  insertBankDetailsSchema, 
  insertEmployeeSchema,
  USER_ROLES
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // API endpoints for employee management
  
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

  const httpServer = createServer(app);
  return httpServer;
}

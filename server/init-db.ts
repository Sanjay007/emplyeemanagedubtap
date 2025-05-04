import { db } from "./db";
import { hashPassword } from "./auth";
import { USER_ROLES } from "@shared/schema";
import { employees } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function initDatabase() {
  // Check if admin user exists
  const [adminCheck] = await db.select().from(employees).where(eq(employees.username, "admin"));
  if (!adminCheck) {
    console.log("Initializing database with admin user...");
    
    const hashedPassword = await hashPassword("admin123");
    const employeeId = "AD1";
    
    try {
      const [createdUser] = await db
        .insert(employees)
        .values({
          employeeId,
          name: "Admin User",
          mobile: "9876543210",
          jobLocation: "Headquarters",
          userType: USER_ROLES.ADMIN,
          salary: 100000,
          joiningDate: new Date().toISOString(),
          travelAllowance: 10000,
          referralName: null,
          remarks: "Default admin account",
          username: "admin",
          password: hashedPassword,
          managerId: null,
          bdmId: null
        })
        .returning();
      
      console.log("Admin user created successfully:", createdUser.name);
    } catch (error) {
      console.error("Error creating admin user:", error);
    }
  } else {
    console.log("Admin user already exists in the database");
  }
}
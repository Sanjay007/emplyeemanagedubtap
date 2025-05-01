import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { Employee, USER_ROLES } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends Employee {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Generate employee ID based on role and timestamp
function generateEmployeeId(userType: string): string {
  const timestamp = Date.now().toString().slice(-5);
  
  switch(userType) {
    case USER_ROLES.ADMIN:
      return `AD${timestamp}`;
    case USER_ROLES.MANAGER:
      return `M${timestamp}`;
    case USER_ROLES.BDM:
      return `BDM${timestamp}`;
    case USER_ROLES.BDE:
      return `BDE${timestamp}`;
    default:
      return `EMP${timestamp}`;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "employee-management-app-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, ...userData } = req.body;
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      // Generate employee ID based on user type
      const employeeId = generateEmployeeId(userData.userType);
      
      // Create user with hashed password
      const user = await storage.createUser({
        ...userData,
        username,
        password: await hashPassword(password),
      }, employeeId);

      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user as Employee;
    res.status(200).json(userWithoutPassword);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user as Employee;
    res.json(userWithoutPassword);
  });

  // Role-based middleware
  const checkRole = (role: string) => {
    return (req: any, res: any, next: any) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = req.user as Employee;
      
      // Admin can access everything
      if (user.userType === USER_ROLES.ADMIN) {
        return next();
      }
      
      // If not admin, check if user has the required role
      if (user.userType !== role) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      
      next();
    };
  };

  // Export middleware for use in routes
  app.locals.checkRole = checkRole;
  app.locals.checkAdmin = checkRole(USER_ROLES.ADMIN);
  app.locals.checkManager = checkRole(USER_ROLES.MANAGER);
  app.locals.checkBDM = checkRole(USER_ROLES.BDM);
  app.locals.checkBDE = checkRole(USER_ROLES.BDE);
}

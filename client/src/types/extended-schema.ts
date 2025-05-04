// Extended types for reports with employee info enrichment
import { 
  SalesReport, 
  VerificationReport, 
  Employee 
} from "@shared/schema";

// Extended type for VerificationReport with BDE and BDM info
export interface ExtendedVerificationReport extends VerificationReport {
  bdeInfo?: Omit<Employee, 'password'> | null;
  bdmInfo?: Omit<Employee, 'password'> | null;
}

// Extended type for SalesReport with BDE and BDM info
export interface ExtendedSalesReport extends SalesReport {
  bdeInfo?: Omit<Employee, 'password'> | null;
  bdmInfo?: Omit<Employee, 'password'> | null;
}
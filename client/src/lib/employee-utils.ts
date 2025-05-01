import { Employee } from "@shared/schema";

// Filter employees by search term
export function filterEmployees(employees: Employee[], searchTerm: string): Employee[] {
  if (!searchTerm) return employees;
  
  const lowerCaseSearch = searchTerm.toLowerCase();
  
  return employees.filter(employee => 
    employee.name.toLowerCase().includes(lowerCaseSearch) ||
    employee.employeeId.toLowerCase().includes(lowerCaseSearch) ||
    employee.mobile.includes(searchTerm) ||
    employee.jobLocation.toLowerCase().includes(lowerCaseSearch)
  );
}

// Filter employees by role
export function filterEmployeesByRole(employees: Employee[], role: string | null): Employee[] {
  if (!role || role === 'all') return employees;
  
  return employees.filter(employee => employee.userType === role);
}

// Get manager name for an employee
export function getManagerName(employee: Employee, allEmployees: Employee[]): string {
  if (!employee.managerId) return 'None';
  
  const manager = allEmployees.find(e => e.id === employee.managerId);
  return manager ? manager.name : 'Unknown';
}

// Get BDM name for an employee
export function getBDMName(employee: Employee, allEmployees: Employee[]): string {
  if (!employee.bdmId) return 'None';
  
  const bdm = allEmployees.find(e => e.id === employee.bdmId);
  return bdm ? bdm.name : 'Unknown';
}

// Check if employee can be assigned to a manager
export function canAssignToManager(employee: Employee, manager: Employee): boolean {
  // Can't assign managers to other managers
  if (employee.userType === 'manager') return false;
  
  // Can't assign a manager to themselves
  if (employee.id === manager.id) return false;
  
  return true;
}

// Check if employee can be assigned to a BDM
export function canAssignToBDM(employee: Employee, bdm: Employee): boolean {
  // Can only assign BDEs to BDMs
  if (employee.userType !== 'businessdevelopmentexecutive') return false;
  
  // Can't assign a BDM to themselves
  if (employee.id === bdm.id) return false;
  
  return true;
}

// Get all BDMs under a manager
export function getBDMsUnderManager(managerId: number, allEmployees: Employee[]): Employee[] {
  return allEmployees.filter(
    employee => employee.userType === 'businessdevelopmentmanager' && employee.managerId === managerId
  );
}

// Get all BDEs under a BDM
export function getBDEsUnderBDM(bdmId: number, allEmployees: Employee[]): Employee[] {
  return allEmployees.filter(
    employee => employee.userType === 'businessdevelopmentexecutive' && employee.bdmId === bdmId
  );
}

// Build the complete hierarchy data structure
export function buildHierarchy(allEmployees: Employee[]) {
  const managers = allEmployees.filter(emp => emp.userType === 'manager');
  
  return managers.map(manager => {
    const bdms = getBDMsUnderManager(manager.id, allEmployees);
    
    const bdmsWithBDEs = bdms.map(bdm => {
      const bdes = getBDEsUnderBDM(bdm.id, allEmployees);
      return {
        ...bdm,
        bdes
      };
    });
    
    return {
      ...manager,
      bdms: bdmsWithBDEs
    };
  });
}

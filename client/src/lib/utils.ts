import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { USER_ROLES } from "@shared/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date to YYYY-MM-DD
export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date.toISOString().split('T')[0];
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Get full role name from role constant
export function getRoleName(role: string): string {
  switch (role) {
    case USER_ROLES.ADMIN:
      return 'Admin';
    case USER_ROLES.MANAGER:
      return 'Manager';
    case USER_ROLES.BDM:
      return 'Business Development Manager';
    case USER_ROLES.BDE:
      return 'Business Development Executive';
    default:
      return role;
  }
}

// Get short role name
export function getShortRoleName(role: string): string {
  switch (role) {
    case USER_ROLES.ADMIN:
      return 'Admin';
    case USER_ROLES.MANAGER:
      return 'Manager';
    case USER_ROLES.BDM:
      return 'BDM';
    case USER_ROLES.BDE:
      return 'BDE';
    default:
      return role;
  }
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

// Get background color for avatar based on role
export function getAvatarColorByRole(role: string): string {
  switch (role) {
    case USER_ROLES.ADMIN:
      return 'bg-purple-100 text-purple-700';
    case USER_ROLES.MANAGER:
      return 'bg-indigo-100 text-indigo-700';
    case USER_ROLES.BDM:
      return 'bg-green-100 text-green-700';
    case USER_ROLES.BDE:
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

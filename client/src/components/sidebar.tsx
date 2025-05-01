import { Building, DollarSign, LayoutDashboard, Settings, Users, UserCog } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Employee } from "@shared/schema";
import { getInitials, getAvatarColorByRole, getShortRoleName } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: Employee;
}

export default function Sidebar({ isOpen, onClose, user }: SidebarProps) {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Dashboard", icon: <LayoutDashboard className="mr-3 h-5 w-5" /> },
    { href: "/users", label: "User Management", icon: <Users className="mr-3 h-5 w-5" /> },
    { href: "/roles", label: "Role Management", icon: <UserCog className="mr-3 h-5 w-5" /> },
    { href: "/bank", label: "Bank Details", icon: <DollarSign className="mr-3 h-5 w-5" /> },
    { href: "/settings", label: "Settings", icon: <Settings className="mr-3 h-5 w-5" /> },
  ];

  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="w-8 h-8 flex items-center justify-center rounded-md bg-primary text-white">
            <Building size={20} />
          </span>
          <h1 className="text-lg font-bold text-gray-900">OrgManager</h1>
        </div>
        <button onClick={onClose} className="lg:hidden text-gray-500 hover:text-gray-700">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* User Profile */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-semibold",
              getAvatarColorByRole(user.userType)
            )}>
              {getInitials(user.name)}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{user.name}</p>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-100 text-primary-700">
              {getShortRoleName(user.userType)}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-2 py-4 space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center px-3 py-2.5 text-sm font-medium rounded-md",
              location === link.href
                ? "bg-primary-50 text-primary-700"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

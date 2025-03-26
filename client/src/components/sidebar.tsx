import { useAuth } from "@/hooks/use-auth";
import { Calendar, X, LogOut, User } from "lucide-react";
import ServerConnection from "./server-connection";
import CalendarList from "./calendar-list";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isMobile: boolean;
}

export default function Sidebar({ isOpen, onToggle, isMobile }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  
  const sidebarClasses = `bg-white h-full shadow-lg transition-all duration-300 ${
    isMobile 
      ? isOpen 
        ? "fixed inset-y-0 left-0 z-40 w-64 md:w-72" 
        : "fixed inset-y-0 left-0 z-40 w-64 md:w-72 -translate-x-full"
      : isOpen 
        ? "w-64 md:w-72" 
        : "w-0 overflow-hidden"
  }`;

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className={sidebarClasses}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold text-primary flex items-center">
            <Calendar className="mr-2" />
            CalDAV Client
          </h1>
          {isMobile && (
            <button
              onClick={onToggle}
              className="md:hidden text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Server Connection component */}
      <ServerConnection />
      
      {/* Calendar List component */}
      <CalendarList />
      
      <div className="mt-auto p-4 border-t border-gray-200">
        <div className="flex items-center text-sm text-gray-500">
          <User className="mr-2" size={16} />
          <span>{user?.username}</span>
        </div>
        <Button 
          variant="ghost" 
          className="mt-2 text-sm text-gray-500 hover:text-gray-700 p-0 h-auto"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="mr-1" size={16} />
          {logoutMutation.isPending ? "Logging out..." : "Log out"}
        </Button>
      </div>
    </div>
  );
}

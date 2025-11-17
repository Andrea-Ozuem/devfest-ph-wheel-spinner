import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { LogIn, LogOut } from "lucide-react";
import logo from "@/assets/image.png";

interface HeaderProps {
  title?: string;
  sessionCode?: string;
  showAdminLinks?: boolean;
}

export const Header = ({
  title = "DevFest Port Harcourt 2025: Raffle Draw",
  sessionCode,
  showAdminLinks = false,
}: HeaderProps) => {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Logo" className="h-10" />
          <h1 className="text-xl">{title}</h1>
        </div>

        <div className="flex gap-2 items-center">
          {sessionCode && (
            <code className="bg-muted px-3 py-1 rounded text-sm font-mono font-bold">
              {sessionCode}
            </code>
          )}

          {showAdminLinks && isAdmin && (
            <>
              <Button asChild variant="outline">
                <Link to="/admin">Admin Dashboard</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/history">History</Link>
              </Button>
            </>
          )}

          {user ? (
            <Button onClick={signOut} variant="outline" size="icon">
              <LogOut className="w-4 h-4" />
            </Button>
          ) : (
            <Button asChild variant="outline" size="icon">
              <Link to="/auth">
                <LogIn className="w-4 h-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

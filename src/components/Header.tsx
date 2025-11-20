import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import logo from "@/assets/image.png";

interface HeaderProps {
  title?: string;
  sessionCode?: string;
  showAdminLinks?: boolean;
  hasJoinedSession?: boolean;
  joinedName?: string | null;
  isSpinning?: boolean;
  onLeaveSession?: () => void;
}

export const Header = ({
  title = "DevFest Port Harcourt 2025: Raffle Draw",
  sessionCode,
  showAdminLinks = false,
  hasJoinedSession = false,
  joinedName = null,
  isSpinning = false,
  onLeaveSession,
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

          {hasJoinedSession && joinedName && onLeaveSession && (
            <Button
              variant="outline"
              size="sm"
              onClick={onLeaveSession}
              className="gap-2"
              disabled={isSpinning}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Leave Session</span>
              <span className="sm:hidden">Leave</span>
            </Button>
          )}

          {showAdminLinks && isAdmin && (
            <Button asChild variant="outline">
              <Link to="/admin">Admin Dashboard</Link>
            </Button>
          )}

          {user ? (
            <Button onClick={signOut} variant="ghost" size="icon" className="group">
              <img
                src="/carbon_user-avatar-filled.svg"
                alt="User avatar"
                className="w-6 h-6 group-hover:brightness-0 group-hover:saturate-100 group-hover:invert group-hover:sepia group-hover:hue-rotate-180 group-hover:contrast-200"
              />
            </Button>
          ) : (
            <Button asChild variant="ghost" size="icon">
              <Link to="/auth">
                <img
                  src="/carbon_user-avatar-filled.svg"
                  alt="User avatar"
                  className="w-6 h-6 group-hover:brightness-0 group-hover:saturate-100 group-hover:invert group-hover:sepia group-hover:hue-rotate-180 group-hover:contrast-200"
                />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100),
});

const signUpSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100),
  adminCode: z.string().min(1, "Admin code is required"),
});

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const {
    signIn,
    signUp,
    user,
    isAdmin,
    loading: authLoading,
    adminLoading,
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for both auth and admin status to be loaded before redirecting
    if (user && !authLoading && !adminLoading && isRedirecting) {
      // Redirect based on admin status
      if (isAdmin) {
        navigate("/admin");
      } else {
        navigate("/");
      }
    }
  }, [user, isAdmin, authLoading, adminLoading, isRedirecting, navigate]);

  const handleSignIn = async () => {
    try {
      authSchema.parse({ email, password });
      setLoading(true);

      const { error } = await signIn(email, password);

      if (error) {
        if (error.message.includes("Invalid")) {
          toast.error("Invalid email or password");
        } else {
          toast.error("Sign in failed. Please try again.");
        }
      } else {
        // Show success feedback
        toast.success("Sign in successful! Redirecting...");
        setIsRedirecting(true);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    try {
      signUpSchema.parse({ email, password, adminCode });
      setLoading(true);

      const { error } = await signUp(email, password, adminCode);

      if (error) {
        if (error.message.includes("already exists")) {
          toast.error("Email already exists. Please sign in instead.");
        } else {
          toast.error("Sign up failed. Please try again.");
        }
      } else {
        // Show success feedback
        toast.success("Account created! Redirecting to admin dashboard...");
        setIsRedirecting(true);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      {isRedirecting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm shadow-lg">
            <CardContent className="pt-8 space-y-4 text-center">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
              <p className="text-lg font-medium">Redirecting...</p>
              <p className="text-sm text-muted-foreground">
                {isAdmin
                  ? "Taking you to Admin Dashboard"
                  : "Taking you to the raffle"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">
            DevFest Raffle
          </CardTitle>
          <CardDescription className="text-center">
            Admin authentication for session management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* Sign In Tab */}
            <TabsContent value="signin" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="admin@devfest.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                  disabled={isRedirecting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                  disabled={isRedirecting}
                />
              </div>

              <Button
                onClick={handleSignIn}
                disabled={loading || isRedirecting}
                className="w-full"
                size="lg"
              >
                {isRedirecting
                  ? "Redirecting..."
                  : loading
                  ? "Signing in..."
                  : "Sign In"}
              </Button>
            </TabsContent>

            {/* Sign Up Tab */}
            <TabsContent value="signup" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="admin@devfest.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isRedirecting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isRedirecting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-code">Admin Secret Code</Label>
                <Input
                  id="admin-code"
                  type="password"
                  placeholder="Enter admin code"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSignUp()}
                  disabled={isRedirecting}
                />
                <p className="text-xs text-muted-foreground">
                  Required to create an admin account
                </p>
              </div>

              <Button
                onClick={handleSignUp}
                disabled={loading || isRedirecting}
                className="w-full"
                size="lg"
              >
                {isRedirecting
                  ? "Redirecting..."
                  : loading
                  ? "Creating account..."
                  : "Sign Up"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;

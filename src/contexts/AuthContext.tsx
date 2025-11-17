import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/integrations/firebase/config";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  adminLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    adminCode?: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setAdminLoading(true);
        await checkAdminStatus(currentUser.uid);
        setAdminLoading(false);
      } else {
        setUser(null);
        setIsAdmin(false);
        setAdminLoading(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    try {
      const userRoleDoc = await getDoc(doc(db, "user_roles", userId));
      setIsAdmin(userRoleDoc.exists() && userRoleDoc.data()?.role === "admin");
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    adminCode?: string
  ) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const isAdmin = adminCode === import.meta.env.VITE_ADMIN_SECRET_CODE;
      await setDoc(doc(db, "user_roles", userCredential.user.uid), {
        role: isAdmin ? "admin" : "user",
        created_at: new Date(),
      });
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setIsAdmin(false);
      setUser(null);
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isAdmin, loading, adminLoading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/integrations/firebase/config";
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  where,
  getCountFromServer,
} from "firebase/firestore";
import { generateSessionCode } from "@/utils/sessionCode";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Plus, Users, Play, Download, Eye } from "lucide-react";
import { Link } from "react-router-dom";

interface Session {
  id: string;
  name: string;
  code: string;
  active: boolean;
  created_at: string;
  participant_count?: number;
}

const Admin = () => {
  const { isAdmin, loading, adminLoading, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const [newSession, setNewSession] = useState({
    name: "",
  });

  useEffect(() => {
    // Wait for both auth and admin status to be loaded before redirecting
    if (!loading && !adminLoading && !isAdmin) {
      navigate("/auth");
    }
  }, [isAdmin, loading, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadSessions();
    }
  }, [isAdmin]);

  const loadSessions = async () => {
    try {
      const sessionsQuery = query(
        collection(db, "sessions"),
        orderBy("created_at", "desc")
      );

      const querySnapshot = await getDocs(sessionsQuery);
      const sessionsData = querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Session)
      );

      // Load participant counts
      const sessionsWithCounts = await Promise.all(
        sessionsData.map(async (session) => {
          const participantsQuery = query(
            collection(db, "participants"),
            where("session_id", "==", session.id)
          );
          const countSnapshot = await getCountFromServer(participantsQuery);
          return { ...session, participant_count: countSnapshot.data().count };
        })
      );

      setSessions(sessionsWithCounts);
    } catch (error) {
      console.error("Error loading sessions:", error);
      toast.error("Failed to load sessions");
    }
  };

  const handleCreateSession = async () => {
    if (!newSession.name) {
      toast.error("Please fill in session name");
      return;
    }

    const code = generateSessionCode();

    try {
      await addDoc(collection(db, "sessions"), {
        ...newSession,
        code,
        active: true,
        created_at: new Date(),
      });

      toast.success("Session created successfully!");
      setShowCreateDialog(false);
      setNewSession({ name: "" });
      loadSessions();
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Failed to create session");
    }
  };

  const toggleSessionActive = async (session: Session) => {
    try {
      const sessionRef = doc(db, "sessions", session.id);
      await updateDoc(sessionRef, { active: !session.active });

      toast.success(`Session ${!session.active ? "activated" : "deactivated"}`);
      loadSessions();
    } catch (error) {
      console.error("Error updating session:", error);
      toast.error("Failed to update session");
    }
  };

  const exportParticipants = async (sessionId: string) => {
    try {
      const participantsQuery = query(
        collection(db, "participants"),
        where("session_id", "==", sessionId)
      );
      const querySnapshot = await getDocs(participantsQuery);
      const participants = querySnapshot.docs.map((doc) => doc.data());

      if (!participants.length) {
        toast.error("No participants to export");
        return;
      }

      const csv = [
        ["Name", "Joined At"],
        ...participants.map((p) => [
          p.name,
          new Date(p.joined_at.toDate?.() || p.joined_at).toLocaleString(),
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `participants-${sessionId}.csv`;
      a.click();
    } catch (error) {
      console.error("Error exporting participants:", error);
      toast.error("Failed to export participants");
    }
  };

  const showQRCode = (session: Session) => {
    setSelectedSession(session);
    setShowQRDialog(true);
  };

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Sessions Title */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">Sessions Management</h1>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Create Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Session</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Session Name</Label>
                  <Input
                    id="name"
                    value={newSession.name}
                    onChange={(e) =>
                      setNewSession({ ...newSession, name: e.target.value })
                    }
                    placeholder="DevFest 2024 Main Raffle"
                  />
                </div>
                <Button onClick={handleCreateSession} className="w-full">
                  Create Session
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sessions Table */}
        {sessions.length > 0 ? (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Code</TableHead>
                  <TableHead className="text-right font-semibold">
                    Participants
                  </TableHead>
                  <TableHead className="text-center font-semibold">
                    Status
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {session.name}
                    </TableCell>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono font-bold">
                        {session.code}
                      </code>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        {session.participant_count || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex ${
                            session.active
                              ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {session.active ? "Active" : "Inactive"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => showQRCode(session)}
                          className="h-8 w-8 p-0"
                          title="View QR Code"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportParticipants(session.id)}
                          className="h-8 w-8 p-0"
                          title="Export Participants"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Open Session"
                        >
                          <Link to={`/admin/session/${session.id}`}>
                            <Play className="w-4 h-4 text-green-600" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center p-12 border-2 border-dashed rounded-2xl">
            <p className="text-xl text-muted-foreground">
              No sessions yet. Create your first session to get started!
            </p>
          </div>
        )}
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session QR Code</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="flex flex-col items-center space-y-4 py-4">
              <div className="bg-white p-6 rounded-lg">
                <QRCodeSVG
                  value={`${window.location.origin}/?code=${selectedSession.code}`}
                  size={256}
                  level="H"
                  includeMargin
                />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Session Code
                </p>
                <p className="text-3xl font-mono font-bold">
                  {selectedSession.code}
                </p>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Scan this QR code or use the code above to join
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;

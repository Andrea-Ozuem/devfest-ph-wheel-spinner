import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { WheelSpinner } from "@/components/WheelSpinner";
import { JoinSessionModal } from "@/components/JoinSessionModal";
import { Confetti } from "@/components/Confetti";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/integrations/firebase/config";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { Users } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Participant {
  id: string;
  name: string;
  session_id: string;
}

interface Session {
  id: string;
  name: string;
  code: string;
  active: boolean;
}

const Index = () => {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [joinedName, setJoinedName] = useState<string | null>(null);
  const { user, isAdmin, signOut } = useAuth();

  useEffect(() => {
    const loadActiveSession = async () => {
      try {
        const sessionQuery = query(
          collection(db, "sessions"),
          orderBy("created_at", "desc"),
          limit(1)
        );

        const querySnapshot = await getDocs(sessionQuery);
        if (querySnapshot.docs.length > 0) {
          const sessionData = {
            id: querySnapshot.docs[0].id,
            ...querySnapshot.docs[0].data(),
          } as Session;
          setActiveSession(sessionData);
          loadParticipants(sessionData.id);

          // Check if user has joined this session
          const storedJoin = localStorage.getItem(`joined_${sessionData.id}`);
          if (storedJoin) {
            setHasJoined(true);
            setJoinedName(storedJoin);
          }
        }
      } catch (error) {
        console.error("Error loading active session:", error);
      }
    };

    loadActiveSession();
  }, []);

  const loadParticipants = async (sessionId: string) => {
    try {
      const participantsQuery = query(
        collection(db, "participants"),
        where("session_id", "==", sessionId),
        orderBy("joined_at", "asc")
      );

      const querySnapshot = await getDocs(participantsQuery);
      const participantsData = querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Participant)
      );

      setParticipants(participantsData);

      // Subscribe to real-time updates
      const unsubscribe = onSnapshot(participantsQuery, (snapshot) => {
        const updated = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Participant)
        );
        setParticipants(updated);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error loading participants:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Header showAdminLinks={true} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Session Info */}
        {activeSession && (
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-3xl font-bold">{activeSession.name}</h2>
            <div className="flex items-center justify-center gap-2 text-primary">
              <Users className="w-5 h-5" />
              <span className="font-semibold">
                {participants.length} participants
              </span>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Wheel and Actions */}
          <div className="lg:col-span-2 space-y-8">
            {/* Wheel */}
            <div className="py-8">
              <WheelSpinner
                participants={participants}
                isSpinning={false}
                winner={null}
                spinDuration={4}
                finalRotation={undefined}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {!hasJoined ? (
                <Button
                  size="lg"
                  onClick={() => setShowJoinModal(true)}
                  className="text-lg"
                >
                  Join Session
                </Button>
              ) : (
                <div className="text-center space-y-2">
                  <Badge variant="secondary" className="text-base px-4 py-2">
                    ✓ You're in as {joinedName}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Waiting for draw...
                  </p>
                </div>
              )}
            </div>

            {!activeSession && (
              <div className="text-center p-12 border-2 border-dashed rounded-2xl">
                <p className="text-xl text-muted-foreground">
                  No active session.{" "}
                  {isAdmin
                    ? "Create one in the admin dashboard!"
                    : "Check back soon!"}
                </p>
              </div>
            )}
          </div>

          {/* Right: Participants List */}
          {activeSession && participants.length > 0 && (
            <div className="lg:col-span-1">
              <div className="space-y-4">
                <h3 className="text-xl font-bold">
                  Participants ({participants.length})
                </h3>
                <div className="bg-card rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold">Name</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participants.map((participant) => (
                        <TableRow
                          key={participant.id}
                          className="hover:bg-muted/50"
                        >
                          <TableCell className="font-medium">
                            {participant.name}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <JoinSessionModal
        open={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoin={(sessionId: string, name: string) => {
          if (activeSession) {
            loadParticipants(activeSession.id);
            // Mark as joined
            localStorage.setItem(`joined_${sessionId}`, name);
            setHasJoined(true);
            setJoinedName(name);
          }
        }}
      />
    </div>
  );
};

export default Index;

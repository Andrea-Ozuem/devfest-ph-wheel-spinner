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
  doc,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Participant {
  id: string;
  participant_id: string;
  name: string;
  verification_code: string;
  session_id: string;
}

interface Session {
  id: string;
  name: string;
  code: string;
  active: boolean;
}

interface VerificationData {
  name: string;
  code: string;
  participantId: string;
  sessionId: string;
}

const Index = () => {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [joinedName, setJoinedName] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [spinDuration, setSpinDuration] = useState(4);
  const [finalRotation, setFinalRotation] = useState<number | undefined>();
  const [showConfetti, setShowConfetti] = useState(false);
  const [lastProcessedSpinId, setLastProcessedSpinId] = useState<string | null>(null);
  const [initialSessionCode, setInitialSessionCode] = useState<string | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const { isAdmin } = useAuth();


  useEffect(() => {
    if (!activeSession) return;
    
    const storedData = localStorage.getItem(`verification_${activeSession.id}`);
    if (storedData) {
      try {
        setVerificationData(JSON.parse(storedData));
      } catch (error) {
        // Silently fail
      }
    }
  }, [activeSession]);
  

  // Auto-open join modal if QR code was scanned (code in URL)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('code');
    
    if (codeFromUrl && !hasJoined) {
      setInitialSessionCode(codeFromUrl.toUpperCase());
      setShowJoinModal(true);
      
      // Clear the code from URL to prevent reopening on reload
      urlParams.delete('code');
      const newUrl = urlParams.toString() 
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [hasJoined]);

  useEffect(() => {
    const checkForJoinedSession = async () => {
      try {
        // First, get the most recent session to check if user has joined it
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

          // Only load session if user has previously joined it
          const storedJoin = localStorage.getItem(`joined_${sessionData.id}`);
          if (storedJoin) {
            setActiveSession(sessionData);
            loadParticipants(sessionData.id);
            setHasJoined(true);
            setJoinedName(storedJoin);
          }
          // If user hasn't joined, don't load the session - keep empty state
        }
      } catch (error) {
        // Silently fail
      }
    };

    checkForJoinedSession();
  }, []);

  useEffect(() => {
    if (!activeSession) return;

    const spinStateRef = doc(db, "sessions", activeSession.id, "spin_state", "current");
    
    const unsubscribe = onSnapshot(
      spinStateRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const spinData = snapshot.data();
          
          // Check if this is a new spin (different spinId) AND recent
          const isNewSpin = spinData.spinId && spinData.spinId !== lastProcessedSpinId;
          const isRecentSpin = spinData.timestamp && (Date.now() - spinData.timestamp.toMillis()) < 30000; // 30 seconds
          
          if (isNewSpin && isRecentSpin) {
            // Update local state from Firestore for new spins only
            setIsSpinning(spinData.isSpinning);
            setWinner(spinData.winner?.name || null);
            setSpinDuration(spinData.duration);
            setFinalRotation(spinData.rotation);
            setLastProcessedSpinId(spinData.spinId);
            
            // Show confetti after spin completes
            if (spinData.isSpinning) {
              setTimeout(() => {
                setShowConfetti(true);
                // For public users, show toast with ticket number
                const isCurrentUserWinner = spinData.winner?.name === joinedName;
                const message = isCurrentUserWinner 
                  ? `🎉 Congratulations! You won! Ticket #${spinData.winner?.verification_code || 'N/A'}` 
                  : `🎉 Winner: ${spinData.winner?.name} (Ticket #${spinData.winner?.verification_code || 'N/A'})`;
                toast.success(message, {
                  duration: 8000
                });
              }, spinData.duration * 1000 + 500);
            }
          } else if (!lastProcessedSpinId && spinData.spinId) {
            // First load - just store the spinId without animating
            setLastProcessedSpinId(spinData.spinId);
            // Set other state but keep isSpinning false to prevent animation
            setWinner(spinData.winner?.name || null);
            setSpinDuration(spinData.duration);
            setFinalRotation(spinData.rotation);
          }
        }
      }
    );

    return () => unsubscribe();
  }, [activeSession, lastProcessedSpinId]);

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
      // Silently fail
    }
  };

  const handleLeaveSession = () => {
    setShowLeaveDialog(true);
  };

  const confirmLeaveSession = () => {
    if (!activeSession) return;

    // Clear localStorage for this session
    localStorage.removeItem(`joined_${activeSession.id}`);
    localStorage.removeItem(`verification_${activeSession.id}`);

    // Reset state
    setHasJoined(false);
    setJoinedName(null);
    setActiveSession(null);
    setParticipants([]);
    setWinner(null);
    setIsSpinning(false);
    setShowConfetti(false);
    setLastProcessedSpinId(null);

    toast.success("Left session successfully. You can now join another session.");
    setShowLeaveDialog(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {showConfetti && <Confetti />}
      <Header 
        showAdminLinks={true}
        hasJoinedSession={hasJoined}
        joinedName={joinedName}
        isSpinning={isSpinning}
        onLeaveSession={handleLeaveSession}
      />

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
                isSpinning={isSpinning}
                winner={winner}
                spinDuration={spinDuration}
                finalRotation={finalRotation}
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
                <div className="w-full max-w-md">
                  <div className="text-center space-y-3 mb-4">
                    {verificationData && (
                       <Badge variant="secondary" className="text-base px-4 py-2">
                        ✓ You're in as {joinedName} - {verificationData.code}
                      </Badge>
                    )}
                   
                    <p className="text-sm text-muted-foreground">
                      {isSpinning ? "Draw in progress..." : "Waiting for draw..."}
                    </p>
                  </div>
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
        onClose={() => {
          setShowJoinModal(false);
          setInitialSessionCode(null);
        }}
        initialCode={initialSessionCode}
        onJoin={async (sessionId: string, name: string) => {
          try {
            // Mark as joined first
            localStorage.setItem(`joined_${sessionId}`, name);
            setHasJoined(true);
            setJoinedName(name);

            // If no active session is loaded yet, load it now
            if (!activeSession) {
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
            }
          } else {
            // If session is already loaded, just refresh participants
            loadParticipants(activeSession.id);
          }
        } catch (error: any) {
          toast.error("Failed to join session. Please try again.");
        }  
      }}
    />

    {/* Leave Session Confirmation Dialog */}
    <AlertDialog
      open={showLeaveDialog}
      onOpenChange={(open) => !open && setShowLeaveDialog(false)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave Session?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to leave{" "}
            <span className="font-semibold text-foreground">
              "{activeSession?.name}"
            </span>
            ? You can join another session afterwards.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-3 justify-end">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmLeaveSession}
            className="bg-destructive hover:bg-destructive/90"
          >
            Leave Session
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  </div>
  );
};

export default Index;

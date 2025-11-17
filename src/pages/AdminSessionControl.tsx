import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { WheelSpinner } from "@/components/WheelSpinner";
import { Confetti } from "@/components/Confetti";
import { AddParticipantDialog } from "@/components/AddParticipantDialog";
import { SpinHistory } from "@/components/SpinHistory";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/integrations/firebase/config";
import { getFunctions, httpsCallable } from "firebase/functions";

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  getDoc,
} from "firebase/firestore";
import { toast } from "sonner";
import { ArrowLeft, Users, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

const AdminSessionControl = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { isAdmin, loading, user, signOut } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [winnerParticipant, setWinnerParticipant] =
    useState<Participant | null>(null);
  const [showWinnerAnnouncement, setShowWinnerAnnouncement] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [participantToRemove, setParticipantToRemove] =
    useState<Participant | null>(null);
  const [spinDuration, setSpinDuration] = useState(4);
  const [finalRotation, setFinalRotation] = useState<number | undefined>();

  // Auth guard
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/auth");
    }
  }, [isAdmin, loading, navigate]);

  // Load session data
  useEffect(() => {
    if (!sessionId) return;

    const loadSession = async () => {
      try {
        const sessionDoc = await getDoc(doc(db, "sessions", sessionId));
        if (sessionDoc.exists()) {
          setSession({
            id: sessionDoc.id,
            ...sessionDoc.data(),
          } as Session);
        } else {
          toast.error("Session not found");
          navigate("/admin");
        }
      } catch (error) {
        console.error("Error loading session:", error);
        toast.error("Failed to load session");
      } finally {
        setPageLoading(false);
      }
    };

    loadSession();
  }, [sessionId, navigate]);

  // Set up real-time listener for participants
  useEffect(() => {
    if (!sessionId) return;

    const participantsQuery = query(
      collection(db, "participants"),
      where("session_id", "==", sessionId),
      orderBy("joined_at", "asc")
    );

    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(
      participantsQuery,
      (snapshot) => {
        const participantsData = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Participant)
        );
        setParticipants(participantsData);
      },
      (error) => {
        console.error("Error listening to participants:", error);
      }
    );

    // Cleanup: unsubscribe when component unmounts or sessionId changes
    return () => unsubscribe();
  }, [sessionId]);

  const handleSpin = async () => {
    if (!session || participants.length === 0) {
      toast.error("No participants to spin for!");
      return;
    }

    if (isSpinning) return;

    setIsSpinning(true);

    try {
      const functions = getFunctions();
      console.log("spinning");
      const spinWheel = httpsCallable(functions, "spinWheel");
      const result = await spinWheel({
        sessionId: session.id,
      });
      console.log("Cloud function result:", result);

      const { data } = result as {
        data: {
          winner: { id: string; name: string };
          rotation: number;
          duration: number;
          timestamp: number;
          participantCount: number;
        };
      };

      if (!data || !data.winner) {
        toast.error("Error selecting winner");
        setIsSpinning(false);
        return;
      }

      // Use duration returned from cloud function if present, otherwise fallback
      const durationFromFn =
        typeof data.duration === "number" ? data.duration : undefined;
      const durationToUse = durationFromFn ?? 4; // fallback duration in seconds

      // Set animation properties
      setSpinDuration(durationToUse);
      setFinalRotation(data.rotation);
      setWinner(data.winner.name);
      setWinnerParticipant({
        ...data.winner,
        session_id: session.id,
      });

      // Show confetti and announcement after spin completes
      setTimeout(() => {
        setShowConfetti(true);
        setShowWinnerAnnouncement(true);
      }, durationToUse * 1000 + 500); // use computed duration
    } catch (error: any) {
      console.error("Cloud function error:", error);
      console.error("Error code:", error?.code);
      console.error("Error message:", error?.message);
      console.error("Error details:", error?.details);
      toast.error(`Failed to spin: ${error?.message ?? "unknown error"}`);
      setIsSpinning(false);
    }
  };

  const processWinner = async (winner: { id: string; name: string }) => {
    try {
      // Record the draw
      await addDoc(collection(db, "draws"), {
        session_id: session!.id,
        winner_name: winner.name,
        timestamp: new Date(),
        is_re_spin: false,
      });

      // Remove winner from participants
      await deleteDoc(doc(db, "participants", winner.id));

      console.log(`Winner processed: ${winner.name}`);
    } catch (error) {
      console.error("Error processing winner:", error);
      toast.error("Error processing winner");
      throw error; // Re-throw to be caught by caller
    }
  };

  const handleCloseWinnerAnnouncement = async () => {
    setShowWinnerAnnouncement(false);

    if (!winnerParticipant) return;

    // Process winner AFTER dialog is confirmed
    try {
      await processWinner(winnerParticipant);

      // Show success toast after removal
      toast.success(`🎉 Winner: ${winnerParticipant.name}!`, {
        duration: 5000,
      });
    } catch (error) {
      console.error("Error processing winner:", error);
      toast.error("Failed to record winner");
    }

    // Clean up UI state after 3 seconds
    setTimeout(() => {
      setShowConfetti(false);
      setIsSpinning(false);
      setWinner(null);
      setWinnerParticipant(null);
    }, 3000);
  };

  const handleRemoveParticipant = async () => {
    if (!participantToRemove) return;

    try {
      await deleteDoc(doc(db, "participants", participantToRemove.id));
      toast.success(`Removed ${participantToRemove.name}`);
      setParticipantToRemove(null);
    } catch (error) {
      console.error("Error removing participant:", error);
      toast.error("Failed to remove participant");
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading session...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Session not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {showConfetti && <Confetti />}

      <Header sessionCode={session.code} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Back Button and Session Info */}
        <div className="flex max-w-6xl mx-auto mb-8">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="mb-4 hover:bg-transparent hover:text-blue-600"
          >
            <Link to="/admin">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{session.name}</h1>
          </div>
        </div>
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Wheel */}
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

            {/* Winner Announcement */}

            {/* Spin Button */}
            {participants.length > 0 && (
              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={handleSpin}
                  disabled={isSpinning}
                  className="text-lg bg-accent hover:bg-accent/90 px-12"
                >
                  {isSpinning ? "Spinning..." : "Spin the Wheel!"}
                </Button>
              </div>
            )}

            {participants.length === 0 && (
              <div className="text-center p-12 border-2 border-dashed rounded-2xl">
                <p className="text-lg text-muted-foreground">
                  No participants yet. Share the session code or QR code to get
                  started!
                </p>
              </div>
            )}
          </div>

          {/* Right: Participant List */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              <h2 className="text-xl font-bold">
                Participants ({participants.length})
              </h2>

              {participants.length > 0 ? (
                <div className="bg-card rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold">Name</TableHead>
                        <TableHead className="text-right font-semibold">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participants.map((participant) => (
                        <TableRow
                          key={participant.id}
                          className="hover:bg-muted/50"
                        >
                          <TableCell className="font-medium text-sm">
                            {participant.name}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setParticipantToRemove(participant)
                              }
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Remove participant"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}

              <AddParticipantDialog sessionId={session.id} />
            </div>

            {/* Spin History */}
            <div className="pt-4">
              <SpinHistory sessionId={session.id} />
            </div>
          </div>
        </div>
      </main>

      {/* Remove Participant Dialog */}
      <AlertDialog
        open={participantToRemove !== null}
        onOpenChange={(open) => !open && setParticipantToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Participant?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-semibold text-foreground">
                {participantToRemove?.name}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveParticipant}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Winner Announcement Dialog */}
      <Dialog
        open={showWinnerAnnouncement}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseWinnerAnnouncement();
          }
        }}
      >
        <DialogContent className="border-2 border-accent bg-gradient-to-br from-primary/5 to-accent/5">
          <DialogHeader>
            <DialogTitle className="text-4xl text-center">🎉</DialogTitle>
            <h2 className="text-4xl font-bold text-center mt-4">Winner!</h2>
            <DialogDescription className="text-2xl font-bold text-center text-primary mt-4">
              {winnerParticipant?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center gap-3 mt-6">
            <Button
              size="lg"
              onClick={handleCloseWinnerAnnouncement}
              className="bg-accent hover:bg-accent/90"
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSessionControl;

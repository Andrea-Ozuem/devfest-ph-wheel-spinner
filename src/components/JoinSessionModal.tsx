import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/integrations/firebase/config";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { toast } from "sonner";
import { formatSessionCode } from "@/utils/sessionCode";

interface JoinSessionModalProps {
  open: boolean;
  onClose: () => void;
  onJoin: (sessionId: string, name: string) => void;
}

export const JoinSessionModal = ({
  open,
  onClose,
  onJoin,
}: JoinSessionModalProps) => {
  const [sessionCode, setSessionCode] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!sessionCode || !participantName) {
      toast.error("Please enter both session code and your name");
      return;
    }

    const formattedCode = formatSessionCode(sessionCode);

    if (formattedCode.length !== 6) {
      toast.error("Session code must be 6 characters");
      return;
    }

    setLoading(true);

    try {
      // Find session by code
      console.log("🔍 Searching for session with code:", formattedCode);
      const sessionsRef = collection(db, "sessions");
      const sessionQuery = query(
        sessionsRef,
        where("code", "==", formattedCode)
      );
      const sessionSnapshot = await getDocs(sessionQuery);

      console.log("📊 Query result:", {
        empty: sessionSnapshot.empty,
        size: sessionSnapshot.size,
        docs: sessionSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      });

      if (sessionSnapshot.empty) {
        toast.error("Invalid session code or session not found");
        console.error("❌ No session found with code:", formattedCode);
        setLoading(false);
        return;
      }

      const sessionDoc = sessionSnapshot.docs[0];
      const session = { id: sessionDoc.id, ...sessionDoc.data() };

      // Check for duplicate names
      const participantsRef = collection(db, "participants");
      const participantsQuery = query(
        participantsRef,
        where("session_id", "==", session.id)
      );
      const participantsSnapshot = await getDocs(participantsQuery);
      const existingParticipants = participantsSnapshot.docs.map((doc) =>
        doc.data()
      );

      let finalName = participantName.trim();
      const duplicateCount = existingParticipants.filter((p) =>
        p.name.startsWith(finalName)
      ).length;

      if (duplicateCount > 0) {
        finalName = `${finalName} (${duplicateCount + 1})`;
        toast.info(`Name adjusted to ${finalName} to avoid duplicates`);
      }

      // Add participant
      console.log("➕ Adding participant:", { session_id: session.id, name: finalName });
      await addDoc(collection(db, "participants"), {
        session_id: session.id,
        name: finalName,
        joined_at: new Date(),
      });

      console.log("✅ Successfully joined session");
      toast.success(`Joined ${session.name}! Watch the wheel.`);
      onJoin(session.id, finalName);
      onClose();
      setSessionCode("");
      setParticipantName("");
    } catch (error: any) {
      console.error("❌ Error joining session:", error);
      console.error("Error code:", error?.code);
      console.error("Error message:", error?.message);
      
      if (error?.code === "permission-denied") {
        toast.error("Permission denied. Check Firestore rules.");
      } else if (error?.code === "unavailable") {
        toast.error("Network error. Check your connection.");
      } else {
        toast.error(`Error: ${error?.message || "An error occurred while joining"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Join Raffle Session</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="code">Session Code</Label>
            <Input
              id="code"
              placeholder="Enter 6-character code"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="font-mono text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Your Name</Label>
            <Input
              id="name"
              placeholder="Enter your name"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
          </div>

          <Button
            onClick={handleJoin}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? "Joining..." : "Join Session"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

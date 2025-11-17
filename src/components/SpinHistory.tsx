import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RotateCcw } from "lucide-react";

interface Draw {
  id: string;
  winner_name: string;
  timestamp: { toDate: () => Date } | Date;
  is_re_spin: boolean;
}

interface SpinHistoryProps {
  sessionId: string;
  onRespin?: (winner: string) => void;
}

export const SpinHistory = ({ sessionId, onRespin }: SpinHistoryProps) => {
  const [draws, setDraws] = useState<Draw[]>([]);
  const [loading, setLoading] = useState(true);
  const [respinLoading, setRespinLoading] = useState<string | null>(null);

  const loadDraws = async () => {
    try {
      const drawsQuery = query(
        collection(db, "draws"),
        where("session_id", "==", sessionId),
        orderBy("timestamp", "desc")
      );

      const querySnapshot = await getDocs(drawsQuery);
      const drawsData = querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Draw)
      );

      setDraws(drawsData);
    } catch (error) {
      console.error("Error loading draws:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadDraws();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleRespin = async (draw: Draw) => {
    setRespinLoading(draw.id);

    try {
      // Add participant back
      await addDoc(collection(db, "participants"), {
        name: draw.winner_name,
        session_id: sessionId,
        joined_at: new Date(),
        added_by_admin: true,
      });

      // Mark draw as re-spun
      await deleteDoc(doc(db, "draws", draw.id));

      // Record the re-spin
      await addDoc(collection(db, "draws"), {
        session_id: sessionId,
        winner_name: draw.winner_name,
        timestamp: new Date(),
        is_re_spin: true,
        original_draw_id: draw.id,
      });

      toast.success(`${draw.winner_name} re-spun and returned to participants`);
      onRespin?.(draw.winner_name);
      await loadDraws();
    } catch (error) {
      console.error("Error processing re-spin:", error);
      toast.error("Failed to re-spin");
    } finally {
      setRespinLoading(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Spin History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Raffle Winners</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {draws.map((draw, index) => (
            <div key={draw.id}>
              <div className="font-medium">{draw.winner_name}</div>
              {index < draws.length - 1 && (
                <div className="mt-4 border-b border-border" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

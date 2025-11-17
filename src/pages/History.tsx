import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/integrations/firebase/config";
import {
  collection,
  query,
  getDocs,
  orderBy,
  where,
  getCountFromServer,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import { ArrowLeft, Trophy } from "lucide-react";

interface Draw {
  id: string;
  winner_name: string;
  timestamp: string;
  is_re_spin: boolean;
  session: {
    name: string;
  };
  participant_count?: number;
}

const History = () => {
  const [draws, setDraws] = useState<Draw[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      // Get all draws with session data
      const drawsRef = collection(db, "draws");
      const drawsQuery = query(drawsRef, orderBy("timestamp", "desc"));
      const drawsSnapshot = await getDocs(drawsQuery);

      const drawsData = drawsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Get session data and participant counts for each draw
      const drawsWithDetails = await Promise.all(
        drawsData.map(async (draw: any) => {
          // Get session details
          const sessionsRef = collection(db, "sessions");
          const sessionQuery = query(
            sessionsRef,
            where("id", "==", draw.session_id)
          );
          const sessionSnapshot = await getDocs(sessionQuery);
          const sessionDoc = sessionSnapshot.docs[0]?.data();

          // Count participants
          const participantsRef = collection(db, "participants");
          const participantsQuery = query(
            participantsRef,
            where("session_id", "==", draw.session_id)
          );
          const participantsCount = await getCountFromServer(participantsQuery);

          // Count all draws for this session
          const allDrawsRef = collection(db, "draws");
          const allDrawsQuery = query(
            allDrawsRef,
            where("session_id", "==", draw.session_id)
          );
          const allDrawsCount = await getCountFromServer(allDrawsQuery);

          return {
            ...draw,
            session: {
              name: sessionDoc?.name || "Unknown Session",
              id: draw.session_id,
            },
            participant_count:
              participantsCount.data().count + allDrawsCount.data().count,
          };
        })
      );

      setDraws(drawsWithDetails);
    } catch (error) {
      console.error("Error loading history:", error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button asChild variant="outline" size="icon">
            <Link to="/">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold">Raffle History</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Past Winners</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">
                Loading...
              </p>
            ) : draws.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No draws yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>Winner</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draws.map((draw) => (
                    <TableRow key={draw.id}>
                      <TableCell className="font-medium">
                        {draw.session.name}
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        {draw.winner_name}
                      </TableCell>
                      <TableCell>
                        {new Date(draw.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>{draw.participant_count || 0}</TableCell>
                      <TableCell>
                        {draw.is_re_spin && (
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded">
                            Re-spin
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default History;

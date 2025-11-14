import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trophy } from 'lucide-react';

interface Draw {
  id: string;
  winner_name: string;
  timestamp: string;
  is_re_spin: boolean;
  session: {
    name: string;
    prize: string;
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
    const { data: drawsData } = await supabase
      .from('draws')
      .select(`
        *,
        session:sessions(name, prize, id)
      `)
      .order('timestamp', { ascending: false });

    if (drawsData) {
      // Get participant counts for each session
      const drawsWithCounts = await Promise.all(
        drawsData.map(async (draw: any) => {
          const { count } = await supabase
            .from('participants')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', draw.session.id);

          const { count: totalDraws } = await supabase
            .from('draws')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', draw.session.id);
          
          return {
            ...draw,
            participant_count: (count || 0) + (totalDraws || 0),
          };
        })
      );

      setDraws(drawsWithCounts);
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
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : draws.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No draws yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>Prize</TableHead>
                    <TableHead>Winner</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draws.map((draw) => (
                    <TableRow key={draw.id}>
                      <TableCell className="font-medium">{draw.session.name}</TableCell>
                      <TableCell>{draw.session.prize}</TableCell>
                      <TableCell className="font-bold text-primary">{draw.winner_name}</TableCell>
                      <TableCell>{new Date(draw.timestamp).toLocaleString()}</TableCell>
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

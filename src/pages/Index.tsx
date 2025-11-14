import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { WheelSpinner } from '@/components/WheelSpinner';
import { JoinSessionModal } from '@/components/JoinSessionModal';
import { Confetti } from '@/components/Confetti';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Trophy, Users, LogIn, LogOut } from 'lucide-react';
import { toast } from 'sonner';

interface Participant {
  id: string;
  name: string;
  session_id: string;
}

interface Session {
  id: string;
  name: string;
  code: string;
  prize: string;
  active: boolean;
}

const Index = () => {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const { user, isAdmin, signOut } = useAuth();

  useEffect(() => {
    loadActiveSession();
    subscribeToParticipants();
  }, []);

  const loadActiveSession = async () => {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (sessions && sessions.length > 0) {
      setActiveSession(sessions[0]);
      loadParticipants(sessions[0].id);
    }
  };

  const loadParticipants = async (sessionId: string) => {
    const { data } = await supabase
      .from('participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('joined_at', { ascending: true });

    if (data) {
      setParticipants(data);
    }
  };

  const subscribeToParticipants = () => {
    const channel = supabase
      .channel('participants-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
        },
        () => {
          if (activeSession) {
            loadParticipants(activeSession.id);
          } else {
            loadActiveSession();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSpin = async () => {
    if (!activeSession || participants.length === 0) {
      toast.error('No participants to spin for!');
      return;
    }

    if (isSpinning) return;

    setIsSpinning(true);
    const randomWinner = participants[Math.floor(Math.random() * participants.length)];
    setWinner(randomWinner.name);

    // Show confetti after spin completes
    setTimeout(() => {
      setShowConfetti(true);
      toast.success(`🎉 Winner: ${randomWinner.name}!`, {
        duration: 5000,
      });

      // Record the draw
      supabase.from('draws').insert({
        session_id: activeSession.id,
        winner_name: randomWinner.name,
        seed: Date.now().toString(),
      });

      // Remove winner from participants
      supabase
        .from('participants')
        .delete()
        .eq('id', randomWinner.id)
        .then(() => {
          loadParticipants(activeSession.id);
        });

      setTimeout(() => {
        setShowConfetti(false);
        setIsSpinning(false);
        setWinner(null);
      }, 3000);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {showConfetti && <Confetti />}
      
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">DevFest Raffle</h1>
              <p className="text-sm text-muted-foreground">Live Event Spinner</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {isAdmin && (
              <>
                <Button asChild variant="outline">
                  <Link to="/admin">Admin Dashboard</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/history">History</Link>
                </Button>
              </>
            )}
            {user ? (
              <Button onClick={signOut} variant="outline" size="icon">
                <LogOut className="w-4 h-4" />
              </Button>
            ) : (
              <Button asChild variant="outline" size="icon">
                <Link to="/auth">
                  <LogIn className="w-4 h-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Session Info */}
          {activeSession && (
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">{activeSession.name}</h2>
              <p className="text-lg text-muted-foreground">Prize: {activeSession.prize}</p>
              <div className="flex items-center justify-center gap-2 text-primary">
                <Users className="w-5 h-5" />
                <span className="font-semibold">{participants.length} participants</span>
              </div>
            </div>
          )}

          {/* Wheel */}
          <div className="py-8">
            <WheelSpinner 
              participants={participants}
              isSpinning={isSpinning}
              winner={winner}
            />
          </div>

          {/* Winner Announcement */}
          {winner && (
            <div className="text-center p-8 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl border-2 border-primary/20 animate-fade-in">
              <h3 className="text-4xl font-bold mb-2">🎉 Winner! 🎉</h3>
              <p className="text-3xl font-bold text-primary">{winner}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => setShowJoinModal(true)}
              className="text-lg"
            >
              Join Session
            </Button>
            
            {isAdmin && participants.length > 0 && (
              <Button 
                size="lg" 
                onClick={handleSpin}
                disabled={isSpinning || participants.length === 0}
                variant="default"
                className="text-lg bg-accent hover:bg-accent/90"
              >
                {isSpinning ? 'Spinning...' : 'Spin the Wheel!'}
              </Button>
            )}
          </div>

          {!activeSession && (
            <div className="text-center p-12 border-2 border-dashed rounded-2xl">
              <p className="text-xl text-muted-foreground">
                No active session. {isAdmin ? 'Create one in the admin dashboard!' : 'Check back soon!'}
              </p>
            </div>
          )}
        </div>
      </main>

      <JoinSessionModal 
        open={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoin={() => {
          if (activeSession) {
            loadParticipants(activeSession.id);
          }
        }}
      />
    </div>
  );
};

export default Index;

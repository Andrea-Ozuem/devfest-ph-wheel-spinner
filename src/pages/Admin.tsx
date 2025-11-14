import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { generateSessionCode } from '@/utils/sessionCode';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Users, Play, Download, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Session {
  id: string;
  name: string;
  code: string;
  prize: string;
  round: string;
  active: boolean;
  created_at: string;
  participant_count?: number;
}

const Admin = () => {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  
  const [newSession, setNewSession] = useState({
    name: '',
    prize: '',
    round: '',
  });

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/auth');
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadSessions();
    }
  }, [isAdmin]);

  const loadSessions = async () => {
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (sessionsData) {
      // Load participant counts
      const sessionsWithCounts = await Promise.all(
        sessionsData.map(async (session) => {
          const { count } = await supabase
            .from('participants')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id);
          
          return { ...session, participant_count: count || 0 };
        })
      );
      
      setSessions(sessionsWithCounts);
    }
  };

  const handleCreateSession = async () => {
    if (!newSession.name || !newSession.prize || !newSession.round) {
      toast.error('Please fill in all fields');
      return;
    }

    const code = generateSessionCode();
    
    const { error } = await supabase.from('sessions').insert({
      ...newSession,
      code,
      active: true,
    });

    if (error) {
      toast.error('Failed to create session');
      return;
    }

    toast.success('Session created successfully!');
    setShowCreateDialog(false);
    setNewSession({ name: '', prize: '', round: '' });
    loadSessions();
  };

  const toggleSessionActive = async (session: Session) => {
    const { error } = await supabase
      .from('sessions')
      .update({ active: !session.active })
      .eq('id', session.id);

    if (error) {
      toast.error('Failed to update session');
      return;
    }

    toast.success(`Session ${!session.active ? 'activated' : 'deactivated'}`);
    loadSessions();
  };

  const exportParticipants = async (sessionId: string) => {
    const { data } = await supabase
      .from('participants')
      .select('*')
      .eq('session_id', sessionId);

    if (!data) return;

    const csv = [
      ['Name', 'Joined At'],
      ...data.map(p => [p.name, new Date(p.joined_at).toLocaleString()])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participants-${sessionId}.csv`;
    a.click();
  };

  const showQRCode = (session: Session) => {
    setSelectedSession(session);
    setShowQRDialog(true);
  };

  if (loading) {
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
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
              <Link to="/">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
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
                    onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                    placeholder="DevFest 2024 Main Raffle"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prize">Prize Description</Label>
                  <Input
                    id="prize"
                    value={newSession.prize}
                    onChange={(e) => setNewSession({ ...newSession, prize: e.target.value })}
                    placeholder="Google Home Mini"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="round">Round</Label>
                  <Input
                    id="round"
                    value={newSession.round}
                    onChange={(e) => setNewSession({ ...newSession, round: e.target.value })}
                    placeholder="Early Bird"
                  />
                </div>
                <Button onClick={handleCreateSession} className="w-full">
                  Create Session
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{session.name}</CardTitle>
                    <CardDescription>{session.prize}</CardDescription>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    session.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {session.active ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Code:</span>
                    <span className="font-mono font-bold text-lg">{session.code}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Round:</span>
                    <span>{session.round}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Participants:</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {session.participant_count || 0}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => showQRCode(session)}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    QR
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportParticipants(session.id)}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                </div>

                <Button
                  variant={session.active ? 'secondary' : 'default'}
                  onClick={() => toggleSessionActive(session)}
                  className="w-full"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {session.active ? 'Deactivate' : 'Activate'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {sessions.length === 0 && (
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
                <p className="text-sm text-muted-foreground mb-2">Session Code</p>
                <p className="text-3xl font-mono font-bold">{selectedSession.code}</p>
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

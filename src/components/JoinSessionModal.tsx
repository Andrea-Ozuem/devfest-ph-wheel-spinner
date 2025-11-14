import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatSessionCode } from '@/utils/sessionCode';

interface JoinSessionModalProps {
  open: boolean;
  onClose: () => void;
  onJoin: () => void;
}

export const JoinSessionModal = ({ open, onClose, onJoin }: JoinSessionModalProps) => {
  const [sessionCode, setSessionCode] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!sessionCode || !participantName) {
      toast.error('Please enter both session code and your name');
      return;
    }

    const formattedCode = formatSessionCode(sessionCode);
    
    if (formattedCode.length !== 6) {
      toast.error('Session code must be 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Find session by code
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('id, name, active')
        .eq('code', formattedCode)
        .eq('active', true)
        .maybeSingle();

      if (sessionError || !session) {
        toast.error('Invalid session code or session not found');
        setLoading(false);
        return;
      }

      // Check for duplicate names
      const { data: existingParticipants } = await supabase
        .from('participants')
        .select('name')
        .eq('session_id', session.id);

      let finalName = participantName.trim();
      const duplicateCount = existingParticipants?.filter(p => 
        p.name.startsWith(finalName)
      ).length || 0;

      if (duplicateCount > 0) {
        finalName = `${finalName} (${duplicateCount + 1})`;
        toast.info(`Name adjusted to ${finalName} to avoid duplicates`);
      }

      // Add participant
      const { error: insertError } = await supabase
        .from('participants')
        .insert({
          session_id: session.id,
          name: finalName,
        });

      if (insertError) {
        toast.error('Failed to join session');
        setLoading(false);
        return;
      }

      toast.success(`Joined ${session.name}! Watch the wheel.`);
      onJoin();
      onClose();
      setSessionCode('');
      setParticipantName('');
    } catch (error) {
      toast.error('An error occurred while joining');
      console.error(error);
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
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
          </div>

          <Button 
            onClick={handleJoin} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? 'Joining...' : 'Join Session'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

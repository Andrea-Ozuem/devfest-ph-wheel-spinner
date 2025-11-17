import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { Plus } from "lucide-react";

interface AddParticipantDialogProps {
  sessionId: string;
}

export const AddParticipantDialog = ({
  sessionId,
}: AddParticipantDialogProps) => {
  const [open, setOpen] = useState(false);
  const [singleName, setSingleName] = useState("");
  const [bulkNames, setBulkNames] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("single");

  const handleAddSingle = async () => {
    if (!singleName.trim()) {
      toast.error("Please enter a participant name");
      return;
    }

    setIsLoading(true);
    try {
      await addDoc(collection(db, "participants"), {
        name: singleName.trim(),
        session_id: sessionId,
        joined_at: new Date(),
        added_by_admin: true,
      });

      toast.success(`Added ${singleName}!`);
      setSingleName("");
      setOpen(false);
    } catch (error) {
      console.error("Error adding participant:", error);
      toast.error("Failed to add participant");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBulk = async () => {
    const names = bulkNames
      .split("\n")
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    if (names.length === 0) {
      toast.error("Please enter at least one participant name");
      return;
    }

    setIsLoading(true);
    try {
      const promises = names.map((name) =>
        addDoc(collection(db, "participants"), {
          name,
          session_id: sessionId,
          joined_at: new Date(),
          added_by_admin: true,
        })
      );

      await Promise.all(promises);

      toast.success(`Added ${names.length} participant(s)!`);
      setBulkNames("");
      setOpen(false);
    } catch (error) {
      console.error("Error adding participants:", error);
      toast.error("Failed to add participants");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSingleName("");
      setBulkNames("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Participant
      </Button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Participant(s)</DialogTitle>
          <DialogDescription>
            Add a single participant or bulk import multiple names
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single</TabsTrigger>
            <TabsTrigger value="bulk">Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="participant-name">Participant Name</Label>
              <Input
                id="participant-name"
                placeholder="Enter name"
                value={singleName}
                onChange={(e) => setSingleName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddSingle();
                  }
                }}
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleAddSingle}
              disabled={isLoading || !singleName.trim()}
              className="w-full"
            >
              {isLoading ? "Adding..." : "Add Participant"}
            </Button>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-names">Names (one per line)</Label>
              <Textarea
                id="bulk-names"
                placeholder="Alice&#10;Bob&#10;Charlie"
                value={bulkNames}
                onChange={(e) => setBulkNames(e.target.value)}
                rows={6}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Enter one name per line. Empty lines will be ignored.
              </p>
            </div>
            <Button
              onClick={handleAddBulk}
              disabled={isLoading || bulkNames.trim().length === 0}
              className="w-full"
            >
              {isLoading
                ? "Adding..."
                : `Add ${
                    bulkNames.split("\n").filter((n) => n.trim().length > 0)
                      .length
                  } Participant(s)`}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

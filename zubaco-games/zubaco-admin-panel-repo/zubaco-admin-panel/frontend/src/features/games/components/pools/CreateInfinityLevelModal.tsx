import { useState } from "react";
import {
  Dialog,
  DialogDrawerContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useCreateInfinityLevel } from "../../hooks/pools/useInfinityPool";
import { Loader2 } from "lucide-react";

interface CreateInfinityLevelModalProps {
  gameId: string;
  gameName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateInfinityLevelModal({
  gameId,
  gameName,
  open,
  onOpenChange,
}: CreateInfinityLevelModalProps) {
  const [name, setName] = useState("");

  const { mutate: createLevel, isPending } = useCreateInfinityLevel(
    gameId,
    gameName,
  );

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName("");
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    createLevel(
      { name: name.trim() },
      {
        onSuccess: () => {
          handleOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogDrawerContent className="max-w-[480px]">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle>Add Level</DialogTitle>
            <DialogDescription>
              Create a new difficulty level.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Level Name</Label>
              <Input
                id="name"
                placeholder="e.g. Easy"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter className="border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Level
            </Button>
          </DialogFooter>
        </form>
      </DialogDrawerContent>
    </Dialog>
  );
}

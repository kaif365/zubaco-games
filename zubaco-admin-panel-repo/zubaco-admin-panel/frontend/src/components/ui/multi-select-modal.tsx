"use client";

import { useState, useEffect, memo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Dialog,
  DialogDrawerContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface Item {
  id: string;
  name: string;
}

interface MultiSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
  title: string;
  items: Item[];
  alreadySelectedIds: string[];
  isLoading?: boolean;
  onSearch?: (term: string) => void;
}

export const MultiSelectModal = memo(function MultiSelectModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  items,
  alreadySelectedIds,
  isLoading,
  onSearch,
}: MultiSelectModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    setSelectedIds([]);
    setSearchTerm("");
  }, [isOpen]);

  useEffect(() => {
    onSearch?.(debouncedSearchTerm);
  }, [debouncedSearchTerm, onSearch]);

  const toggleItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const availableItems = items.filter(
    (item) => !alreadySelectedIds.includes(item.id),
  );

  // If onSearch is provided, we assume the items prop is already filtered server-side
  const filteredItems = onSearch
    ? availableItems
    : availableItems.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );

  const handleConfirm = () => {
    onConfirm(selectedIds);
  };

  const hasManyItems = filteredItems.length > 4;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogDrawerContent className="max-w-[500px] overflow-hidden border-l border-border bg-background p-0">
        <DialogHeader className="border-b border-border p-6 pb-4">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div
          className={`min-h-0 flex-1 overflow-y-auto p-6 pt-4 transition-all duration-300 ${filteredItems.length === 0 ? "space-y-2" : "space-y-4"}`}
        >
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search items..."
              className="pl-10 h-11 bg-muted/50 border-transparent focus-visible:ring-1 focus-visible:ring-primary transition-all duration-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div
            className={`pr-2 custom-scrollbar transition-all duration-300 ${
              hasManyItems
                ? "h-[224px] overflow-y-auto"
                : "h-auto max-h-[224px] overflow-y-visible"
            }`}
          >
            <div className="space-y-1.5 py-1">
              {filteredItems.map((item) => {
                const isChecked = selectedIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 group border ${
                      isChecked
                        ? "bg-primary/5 border-primary/20 shadow-sm"
                        : "hover:bg-muted/80 border-transparent cursor-pointer"
                    }`}
                    onClick={() => toggleItem(item.id)}
                  >
                    <Checkbox
                      id={`item-${item.id}`}
                      checked={isChecked}
                      readOnly
                      className={`h-5 w-5 pointer-events-none transition-all duration-200 ${isChecked ? "scale-110" : "scale-100"}`}
                    />
                    <label
                      className={`text-sm font-medium leading-none flex-1 cursor-pointer transition-colors ${
                        isChecked
                          ? "text-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      {item.name}
                    </label>
                  </div>
                );
              })}

              {filteredItems.length === 0 && (
                <div className="flex items-center justify-center py-2 text-muted-foreground animate-in fade-in duration-300">
                  <Search className="h-3.5 w-3.5 mr-2 opacity-50" />
                  <p className="text-xs font-medium">No matches found</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-3 border-t border-border bg-muted/30 p-6 pt-4 sm:gap-0">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="h-11 px-6 hover:bg-background transition-colors"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || selectedIds.length === 0}
            className="h-11 px-8 min-w-[140px] shadow-lg shadow-primary/20 transition-all active:scale-95"
          >
            {isLoading
              ? "Adding..."
              : `Add Selected ${selectedIds.length > 0 ? `(${selectedIds.length})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogDrawerContent>
    </Dialog>
  );
});

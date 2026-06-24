"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";

interface JsonViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  data: unknown;
}

export function JsonViewModal({
  isOpen,
  onClose,
  title = "View JSON",
  data,
}: JsonViewModalProps) {
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "json"}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 px-6 py-4 border-b border-white/10 pr-12">
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 bg-white/5 border-white/10 hover:bg-white/10 transition-colors"
              onClick={handleDownload}
            >
              <Download className="h-3.5 w-3.5" />
              Download JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 bg-white/5 border-white/10 hover:bg-white/10 transition-colors"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy JSON
                </>
              )}
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-6 custom-scrollbar scrollbar-subtle">
          <pre className="text-xs font-mono whitespace-pre-wrap break-all text-white/70 leading-relaxed">
            {jsonString}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}

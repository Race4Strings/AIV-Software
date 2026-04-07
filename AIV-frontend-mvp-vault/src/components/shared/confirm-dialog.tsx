"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** What will happen — shown in a warning box */
  consequence?: string;
  /** Require password input before confirming */
  requirePassword?: boolean;
  /** Called with password (if required) when user confirms */
  onConfirm: (password?: string) => void | Promise<void>;
  /** Label for the confirm button */
  confirmLabel?: string;
  /** Visual variant for the confirm button */
  variant?: "default" | "destructive";
  /** Whether the action is currently in progress */
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  consequence,
  requirePassword = false,
  onConfirm,
  confirmLabel = "Confirm",
  variant = "destructive",
  loading = false,
}: ConfirmDialogProps) {
  const [password, setPassword] = useState("");

  const canConfirm = !requirePassword || password.length >= 8;

  async function handleConfirm() {
    await onConfirm(requirePassword ? password : undefined);
    setPassword("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setPassword("");
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {consequence && (
          <div className="rounded-lg border border-warning/20 bg-warning/5 px-4 py-3 text-sm text-warning">
            {consequence}
          </div>
        )}

        {requirePassword && (
          <div className="space-y-2">
            <label
              htmlFor="confirm-password"
              className="text-sm font-medium text-foreground"
            >
              Enter your password to continue
            </label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canConfirm && !loading) handleConfirm();
              }}
              autoFocus
            />
          </div>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant={variant}
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

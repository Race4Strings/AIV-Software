"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus, Save } from "lucide-react";

interface PillEditorProps {
  items: string[];
  onChange: (items: string[]) => void;
}

export function PillEditor({ items, onChange }: PillEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [addValue, setAddValue] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(items[index]);
  };

  const handleEditSave = (index: number) => {
    if (editValue.trim()) {
      const updated = [...items];
      updated[index] = editValue.trim();
      onChange(updated);
    }
    setEditingIndex(null);
    setEditValue("");
  };

  const handleAdd = () => {
    if (addValue.trim()) {
      onChange([...items, addValue.trim()]);
      setAddValue("");
      setShowAdd(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {items.map((item, i) =>
        editingIndex === i ? (
          <div key={i} className="flex items-center gap-1">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleEditSave(i);
                if (e.key === "Escape") setEditingIndex(null);
              }}
              className="h-7 w-auto min-w-[80px] text-xs px-2"
              autoFocus
            />
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleEditSave(i)}>
              <Save className="size-3" />
            </Button>
          </div>
        ) : (
          <span
            key={i}
            className="group inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary cursor-pointer hover:bg-primary/10 transition-colors"
            onClick={() => handleEdit(i)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter") handleEdit(i); }}
          >
            {item}
            <button
              onClick={(e) => { e.stopPropagation(); handleRemove(i); }}
              className="ml-0.5 rounded-full hover:bg-primary/20 p-0.5 transition-colors"
              aria-label={`Remove ${item}`}
            >
              <X className="size-3" />
            </button>
          </span>
        )
      )}
      {showAdd ? (
        <div className="flex items-center gap-1">
          <Input
            value={addValue}
            onChange={(e) => setAddValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") { setShowAdd(false); setAddValue(""); }
            }}
            placeholder="New item"
            className="h-7 w-auto min-w-[80px] text-xs px-2"
            autoFocus
          />
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleAdd}>
            <Plus className="size-3" />
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/30 px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
        >
          <Plus className="size-3" /> Add
        </button>
      )}
    </div>
  );
}

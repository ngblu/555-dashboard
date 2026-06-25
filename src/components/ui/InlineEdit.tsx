"use client";

import { useState, useRef, useEffect } from "react";

interface InlineEditProps {
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  className?: string;
}

export default function InlineEdit({ value, onChange, prefix = "$", className = "" }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    const num = parseFloat(draft.replace(/[^0-9.]/g, ""));
    if (!isNaN(num) && num >= 0) {
      onChange(num);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") {
      setDraft(String(value));
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className={`bg-surface-2 border border-primary rounded px-2 py-0.5 text-sm font-bold text-accent outline-none w-28 ${className}`}
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      className={`text-accent font-medium hover:bg-primary/10 rounded px-1.5 py-0.5 cursor-pointer transition-colors border border-transparent hover:border-primary/20 ${className}`}
      title="Click to edit"
    >
      {prefix}{value.toLocaleString()}
    </button>
  );
}

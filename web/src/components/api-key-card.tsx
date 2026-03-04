"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Trash2, Check } from "lucide-react";
import type { ApiKey } from "@/lib/types";

interface ApiKeyCardProps {
  apiKey: ApiKey;
  onRevoke: (id: string) => void;
}

export function ApiKeyCard({ apiKey, onRevoke }: ApiKeyCardProps) {
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  return (
    <div className="flex items-center justify-between p-3 bg-white border border-neutral-200 rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-900">
            {apiKey.name}
          </span>
          <code className="text-xs px-1.5 py-0.5 bg-neutral-100 text-neutral-500 rounded">
            {apiKey.key_prefix}...
          </code>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-neutral-400">
            Created {formatDistanceToNow(new Date(apiKey.created_at), { addSuffix: true })}
          </span>
          {apiKey.last_used_at && (
            <span className="text-xs text-neutral-400">
              Last used {formatDistanceToNow(new Date(apiKey.last_used_at), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 ml-3">
        {confirmRevoke ? (
          <button
            onClick={() => onRevoke(apiKey.id)}
            className="p-1.5 rounded-md hover:bg-red-50 text-red-500 cursor-pointer"
            title="Confirm revoke"
          >
            <Check size={14} />
          </button>
        ) : (
          <button
            onClick={() => {
              setConfirmRevoke(true);
              setTimeout(() => setConfirmRevoke(false), 3000);
            }}
            className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400 cursor-pointer"
            title="Revoke key"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

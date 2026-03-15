"use client";

import { THEMES } from "@/lib/themes";

export function ThemeSwitcher({
  active,
  onChange,
}: {
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {THEMES.map((theme) => (
        <button
          key={theme.id}
          onClick={() => onChange(theme.id)}
          title={theme.name}
          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs transition-all ${
            active === theme.id
              ? "ring-1 ring-white/30 scale-110"
              : "opacity-50 hover:opacity-100"
          }`}
        >
          {theme.emoji}
        </button>
      ))}
    </div>
  );
}

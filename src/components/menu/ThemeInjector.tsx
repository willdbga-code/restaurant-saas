"use client";

import React from "react";

export function ThemeInjector({ color }: { color?: string }) {
  if (!color) return null;
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      :root {
        --primary: ${color};
        --primary-foreground: #ffffff;
      }
      .bg-primary-theme { background-color: var(--primary) !important; }
      .text-primary-theme { color: var(--primary) !important; }
      .border-primary-theme { border-color: var(--primary) !important; }
      .shadow-primary-theme { box-shadow: 0 20px 25px -5px ${color}33, 0 8px 10px -6px ${color}33 !important; }
      .btn-primary-glow { 
        background-color: var(--primary) !important;
        box-shadow: 0 10px 15px -3px ${color}40 !important;
      }
    ` }} />
  );
}

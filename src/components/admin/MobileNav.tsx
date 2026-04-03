"use client";

import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { SidebarContent } from "./Sidebar";
import { Button } from "@/components/ui/button";
import { ChefHat } from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close sheet when navigation happens
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 md:hidden">
      <div className="flex items-center gap-2">
        <ChefHat className="h-6 w-6 text-orange-400" />
        <span className="text-lg font-bold tracking-tight text-white leading-none">RestaurantOS</span>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          }
        />
        <SheetContent side="left" className="w-64 p-0 border-r-zinc-800 bg-zinc-950">
          <SheetTitle className="sr-only">Navegação Administrativa</SheetTitle>
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </div>
  );
}

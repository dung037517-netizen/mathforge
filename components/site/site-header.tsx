"use client";

import { motion } from "framer-motion";
import { Github, Moon, Sigma, Sun } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { applyTheme, themeStore } from "@/lib/theme";

const REPOSITORY_URL = "https://github.com/dung037517-netizen/mathforge";

/**
 * Sticky header with a theme toggle.
 *
 * The toggle reads and writes `data-theme` on the document element through
 * `useSyncExternalStore`, so the button label is derived from the DOM that is
 * actually painted rather than from a mirrored copy that could drift out of sync.
 */
export function SiteHeader() {
  const theme = React.useSyncExternalStore(
    themeStore.subscribe,
    themeStore.getSnapshot,
    themeStore.getServerSnapshot,
  );

  const toggleTheme = (): void => {
    applyTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Sigma className="size-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Math<span className="text-primary">Forge</span>
          </span>
        </motion.div>

        <nav aria-label="Sections" className="ml-4 hidden items-center gap-1 md:flex">
          {[
            { href: "#workbench", label: "Workbench" },
            { href: "#actuarial", label: "Actuarial" },
            { href: "#simulation", label: "Simulation" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label={`Switch to the ${theme === "dark" ? "light" : "dark"} theme`}
              >
                {theme === "dark" ? <Sun /> : <Moon />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle the colour theme</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" asChild>
                <a
                  href={REPOSITORY_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Open the MathForge repository on GitHub"
                >
                  <Github />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Source on GitHub</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}

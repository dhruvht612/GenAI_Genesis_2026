import { cn } from "../../lib/utils";
import { NavLink } from "react-router-dom";
import React from "react";

export interface SidebarNavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  exact?: boolean;
}

/** Static, always-expanded sidebar — no collapse animation */
export const SidebarBody = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <aside
    className={cn("flex flex-col h-screen flex-shrink-0", className)}
    style={{
      width: "220px",
      background: "var(--card-bg)",
      borderRight: "1px solid var(--border)",
      padding: "1.25rem 0.75rem",
    }}
  >
    {children}
  </aside>
);

export const SidebarLink = ({
  link,
  className,
}: {
  link: SidebarNavItem;
  className?: string;
}) => (
  <NavLink
    to={link.to}
    end={link.exact ?? false}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
        isActive
          ? "text-[var(--primary)] bg-[var(--primary-glow)]"
          : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]",
        className
      )
    }
  >
    <span className="flex-shrink-0 w-5 h-5">{link.icon}</span>
    <span>{link.label}</span>
  </NavLink>
);

/** Non-link row for actions like logout */
export const SidebarAction = ({
  icon,
  label,
  onClick,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium w-full transition-all duration-150 text-left",
      "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]",
      className
    )}
  >
    <span className="flex-shrink-0 w-5 h-5">{icon}</span>
    <span>{label}</span>
  </button>
);

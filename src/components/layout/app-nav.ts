import {
  Bookmark,
  Highlighter,
  Home,
  Library,
  MonitorSmartphone,
  Settings,
  StickyNote,
  User,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/library", label: "My Library", icon: Library },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/highlights", label: "Highlights", icon: Highlighter },
  { href: "/notes", label: "Notes", icon: StickyNote },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/settings/sessions", label: "Devices & Sessions", icon: MonitorSmartphone },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Compact set for the mobile bottom bar.
export const MOBILE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/library", label: "Library", icon: Library },
  { href: "/bookmarks", label: "Saved", icon: Bookmark },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/profile", label: "Profile", icon: User },
];

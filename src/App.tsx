import React, { useState } from "react";
import {
  Authenticated,
  Unauthenticated,
  useQuery,
  useMutation,
} from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { Toaster } from "sonner";
import { HomePage } from "./components/HomePage";
import { LeaderboardPage } from "./components/LeaderboardPage";
import { PurchasesPage } from "./components/PurchasesPage";
import { ProfilePage } from "./components/ProfilePage";
import { Onboarding } from "./components/Onboarding";
import { AdminPage } from "./components/AdminPage";
import {
  Home,
  Trophy,
  ShoppingCart,
  User,
  LogOut,
  Settings,
  Loader2,
} from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { MemberWithProfile } from "./lib/members";
import { cn } from "./lib/utils";

type PageType = "home" | "leaderboard" | "purchases" | "admin" | "profile";

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>("home");

  return (
    <div className="min-h-screen bg-bg-primary">
      <Authenticated>
        <NavigationBar
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
        <MainContent currentPage={currentPage} />
      </Authenticated>

      <Unauthenticated>
        <AuthScreen />
      </Unauthenticated>

      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: "#18181b",
            border: "1px solid #27272a",
            color: "#fafafa",
          },
        }}
      />
    </div>
  );
}

interface NavigationBarProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

function NavigationBar({ currentPage, onPageChange }: NavigationBarProps) {
  const currentMember = useQuery(api.members.getCurrentMember) as
    | MemberWithProfile
    | null
    | undefined;
  const { signOut } = useAuthActions();

  const isAdmin = currentMember?.role === "admin";
  const isLead = currentMember?.role === "lead";
  const canAccessAdmin = isAdmin || isLead;

  const navItems = [
    { id: "home" as PageType, label: "Home", icon: Home },
    { id: "leaderboard" as PageType, label: "Leaderboard", icon: Trophy },
    { id: "purchases" as PageType, label: "Purchases", icon: ShoppingCart },
    ...(canAccessAdmin
      ? [{ id: "admin" as PageType, label: "Admin", icon: Settings }]
      : []),
    { id: "profile" as PageType, label: "Profile", icon: User },
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-bg-primary/80 backdrop-blur-lg border-b border-border-subtle">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-accent rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-glow-accent">
              μ
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-text-primary">
                mutrack
              </span>
              <span className="text-xs text-text-muted">7157</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  currentPage === item.id
                    ? "bg-bg-tertiary text-text-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* User Actions */}
          <button
            onClick={() => void signOut()}
            className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-bg-hover"
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </nav>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-bg-primary/95 backdrop-blur-lg border-b border-border-subtle safe-top">
        <div className="h-14 px-4 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-accent rounded-lg flex items-center justify-center font-bold text-white text-xs">
              μ
            </div>
            <span className="text-base font-semibold text-text-primary">
              mutrack
            </span>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-primary/95 backdrop-blur-xl border-t border-border-subtle">
        <div
          className="flex justify-around items-center px-2"
          style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2 px-4 min-w-[64px] transition-colors duration-200",
                  isActive ? "text-accent" : "text-text-muted"
                )}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[11px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

interface MainContentProps {
  currentPage: PageType;
}

function MainContent({ currentPage }: MainContentProps) {
  const currentMember = useQuery(api.members.getCurrentMember) as
    | MemberWithProfile
    | null
    | undefined;
  const createMember = useMutation(api.members.createMemberIfNotExists);

  // Auto-create member if logged in but no member record exists
  React.useEffect(() => {
    if (currentMember === null) {
      createMember();
    }
  }, [currentMember, createMember]);

  // Loading state
  if (currentMember === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
          <p className="text-text-muted text-sm">Loading mutrack...</p>
        </div>
      </main>
    );
  }

  // Creating member record
  if (!currentMember) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
          <p className="text-text-muted text-sm">Setting up your profile...</p>
        </div>
      </main>
    );
  }

  // Onboarding required
  if (!currentMember.onboardingCompleted) {
    return (
      <main className="pt-16 md:pt-20 pb-24 md:pb-8 px-4 max-w-2xl mx-auto">
        <Onboarding />
      </main>
    );
  }

  return (
    <main className="pt-16 md:pt-20 pb-24 md:pb-8 px-4 md:px-6 max-w-5xl mx-auto">
      <div className="animate-fade-in">
        {currentPage === "home" && <HomePage member={currentMember} />}
        {currentPage === "leaderboard" && <LeaderboardPage member={currentMember} />}
        {currentPage === "purchases" && <PurchasesPage member={currentMember} />}
        {currentPage === "admin" &&
          (currentMember.role === "admin" || currentMember.role === "lead") && (
            <AdminPage member={currentMember} />
          )}
        {currentPage === "profile" && <ProfilePage member={currentMember} />}
      </div>
    </main>
  );
}

function AuthScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-accent rounded-2xl flex items-center justify-center font-bold text-2xl text-white shadow-glow-accent mx-auto mb-6">
            μ
          </div>
          <h1 className="text-2xl font-semibold text-text-primary mb-2">
            Welcome to mutrack
          </h1>
          <p className="text-sm text-text-secondary">
            Team management for FRC 7157
          </p>
        </div>

        {/* Sign In Form */}
        <div className="bg-bg-secondary border border-border rounded-2xl p-6">
          <SignInForm />
        </div>
      </div>
    </div>
  );
}

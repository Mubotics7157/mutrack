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
import { MembersPage } from "./components/MembersPage";
import { PurchasesPage } from "./components/PurchasesPage";
import { ProfilePage } from "./components/ProfilePage";
import { Onboarding } from "./components/Onboarding";
import { Home, Users, ShoppingCart, User, LogOut } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";

type PageType = "home" | "members" | "purchases" | "profile";

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>("home");

  return (
    <div className="min-h-screen bg-void-black relative overflow-hidden">
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
        toastOptions={{
          style: {
            background: "rgba(15, 15, 15, 0.98)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            color: "#fff",
            boxShadow: "0 0 40px rgba(136, 58, 234, 0.2)",
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
  const currentMember = useQuery(api.members.getCurrentMember);
  const { signOut } = useAuthActions();

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-dark-bg/95 backdrop-blur-2xl border-b border-border-glass">
        <div className="h-16 px-4 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-orange-red rounded-xl flex items-center justify-center font-bold text-void-black shadow-glow">
              μ
            </div>
            <h1 className="text-lg font-light text-gradient">mutrack</h1>
            <span className="px-2 py-0.5 bg-glass backdrop-blur-md border border-border-glass rounded-full text-xs text-text-muted font-mono">
              by frc 7157
            </span>
          </div>
        </div>
      </div>

      {/* Desktop Navigation */}
      <nav className="nav-bar hidden md:block">
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-orange-red rounded-xl flex items-center justify-center font-bold text-lg text-void-black shadow-glow">
              μ
            </div>
            <h1 className="text-xl font-light text-gradient">mutrack</h1>
            <span className="px-3 py-1 bg-glass backdrop-blur-md border border-border-glass rounded-full text-xs text-text-muted font-mono">
              by frc 7157
            </span>
          </div>

          {/* Navigation Links */}
          <div className="flex gap-2 p-1 bg-glass backdrop-blur-md border border-border-glass rounded-full">
            <button
              className={`nav-link ${currentPage === "home" ? "active" : ""}`}
              onClick={() => onPageChange("home")}
            >
              home
            </button>
            <button
              className={`nav-link ${currentPage === "members" ? "active" : ""}`}
              onClick={() => onPageChange("members")}
            >
              members
            </button>
            <button
              className={`nav-link ${currentPage === "purchases" ? "active" : ""}`}
              onClick={() => onPageChange("purchases")}
            >
              purchases
            </button>
            <button
              className={`nav-link ${currentPage === "profile" ? "active" : ""}`}
              onClick={() => onPageChange("profile")}
            >
              profile
            </button>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-4">
            {currentMember && (
              <div
                className="avatar"
                onClick={() => onPageChange("profile")}
                title={currentMember.name}
              >
                {currentMember.name.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              onClick={() => void signOut()}
              className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-all duration-300 flex items-center gap-2"
            >
              <LogOut size={16} />
              <span>sign out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="mobile-nav md:hidden">
        <div className="flex justify-around">
          <button
            className={`mobile-nav-link ${currentPage === "home" ? "active" : ""}`}
            onClick={() => onPageChange("home")}
          >
            <Home size={20} />
            <span>home</span>
          </button>
          <button
            className={`mobile-nav-link ${currentPage === "members" ? "active" : ""}`}
            onClick={() => onPageChange("members")}
          >
            <Users size={20} />
            <span>members</span>
          </button>
          <button
            className={`mobile-nav-link ${currentPage === "purchases" ? "active" : ""}`}
            onClick={() => onPageChange("purchases")}
          >
            <ShoppingCart size={20} />
            <span>purchases</span>
          </button>
          <button
            className={`mobile-nav-link ${currentPage === "profile" ? "active" : ""}`}
            onClick={() => onPageChange("profile")}
          >
            <User size={20} />
            <span>profile</span>
          </button>
        </div>
      </nav>
    </>
  );
}

interface MainContentProps {
  currentPage: PageType;
}

function MainContent({ currentPage }: MainContentProps) {
  const currentMember = useQuery(api.members.getCurrentMember);
  const createMember = useMutation(api.members.createMemberIfNotExists);

  // Auto-create member if logged in but no member record exists
  React.useEffect(() => {
    if (currentMember === null) {
      createMember();
    }
  }, [currentMember, createMember]);

  if (currentMember === undefined) {
    return (
      <main className="pt-20 md:pt-24 px-4 md:px-8 pb-24 md:pb-8 max-w-7xl mx-auto">
        <div className="glass-panel p-8 text-center">
          <div className="loading-spinner mx-auto mb-4" />
          <p className="text-text-muted">loading mutrack...</p>
        </div>
      </main>
    );
  }

  if (!currentMember) {
    return (
      <main className="pt-20 md:pt-24 px-4 md:px-8 pb-24 md:pb-8 max-w-7xl mx-auto">
        <div className="glass-panel p-8 text-center">
          <h2 className="text-xl font-light mb-4">
            setting up your profile...
          </h2>
          <div className="loading-spinner mx-auto" />
        </div>
      </main>
    );
  }

  if (!currentMember.onboardingCompleted) {
    return (
      <main className="pt-20 md:pt-24 px-4 md:px-8 pb-24 md:pb-8 max-w-7xl mx-auto">
        <Onboarding />
      </main>
    );
  }

  return (
    <main className="pt-20 md:pt-24 px-4 md:px-8 pb-24 md:pb-8 max-w-7xl mx-auto">
      <div className="animate-fade-in">
        {currentPage === "home" && <HomePage member={currentMember} />}
        {currentPage === "members" && <MembersPage member={currentMember} />}
        {currentPage === "purchases" && (
          <PurchasesPage member={currentMember} />
        )}
        {currentPage === "profile" && <ProfilePage member={currentMember} />}
      </div>
    </main>
  );
}

function AuthScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-panel p-8 md:p-10 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-orange-red rounded-2xl flex items-center justify-center font-bold text-3xl text-void-black shadow-glow mx-auto mb-6">
            μ
          </div>
          <h2 className="text-3xl font-light mb-2 text-gradient">
            welcome to mutrack
          </h2>
          <p className="text-text-muted text-sm">
            internal tool for frc team 7157
          </p>
        </div>
        <SignInForm />
      </div>
    </div>
  );
}

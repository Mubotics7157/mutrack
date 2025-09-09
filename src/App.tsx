import React from "react";
import {
  Authenticated,
  Unauthenticated,
  useQuery,
  useMutation,
} from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { Dashboard } from "./components/Dashboard";

export default function App() {
  return (
    <div className="min-h-screen">
      <div className="min-h-screen backdrop-blur-sm">
        <header className="sticky top-0 z-50 bg-black/30 backdrop-blur-md border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-sm">μ</span>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                MuTrack
              </h1>
              <span className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded-full">
                FRC Team 7157
              </span>
            </div>
            <Authenticated>
              <SignOutButton />
            </Authenticated>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <Content />
        </main>

        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: "rgba(15, 15, 15, 0.98)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#fff",
              boxShadow: "0 0 40px rgba(249, 115, 22, 0.2)",
            },
          }}
        />
      </div>
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const currentMember = useQuery(api.members.getCurrentMember);
  const createMember = useMutation(api.members.createMemberIfNotExists);

  // Auto-create member if logged in but no member record exists
  React.useEffect(() => {
    if (loggedInUser && currentMember === null) {
      createMember();
    }
  }, [loggedInUser, currentMember, createMember]);

  if (loggedInUser === undefined || currentMember === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="glass-panel p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-orange-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-300">Loading MuTrack...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Authenticated>
        {currentMember ? (
          <Dashboard member={currentMember} />
        ) : (
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="glass-panel p-8 text-center">
              <h2 className="text-xl font-semibold text-white mb-4">
                setting up your profile...
              </h2>
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-400 border-t-transparent mx-auto"></div>
            </div>
          </div>
        )}
      </Authenticated>

      <Unauthenticated>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="glass-panel p-8 w-full max-w-md">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                welcome to mutrack
              </h2>
              <p className="text-gray-300">internal tool for frc team 7157</p>
            </div>
            <SignInForm />
          </div>
        </div>
      </Unauthenticated>
    </>
  );
}

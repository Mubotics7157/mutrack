import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MeetingsPanel } from "./MeetingsPanel";
import { MembersPanel } from "./MembersPanel";
import { PurchasesPanel } from "./PurchasesPanel";
import { Doc } from "../../convex/_generated/dataModel";

interface DashboardProps {
  member: Doc<"members">;
}

type TabType = "meetings" | "members" | "purchases";

export function Dashboard({ member }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("meetings");

  const tabs = [
    { id: "meetings" as const, label: "Meetings", icon: "📅" },
    { id: "members" as const, label: "Members", icon: "👥" },
    { id: "purchases" as const, label: "Purchases", icon: "🛒" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Welcome back, {member.name}!
            </h2>
            <div className="flex items-center space-x-2">
              <span className="text-gray-300">Role:</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  member.role === "admin"
                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                    : member.role === "lead"
                      ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                      : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                }`}
              >
                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
              </span>
            </div>
          </div>
          <div className="text-right text-gray-400">
            <p className="text-sm">FRC Team 7157</p>
            <p className="text-xs">Internal Management System</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="glass-panel p-1">
        <div className="flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-orange-500/15 text-white border border-orange-500/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === "meetings" && <MeetingsPanel member={member} />}
        {activeTab === "members" && <MembersPanel member={member} />}
        {activeTab === "purchases" && <PurchasesPanel member={member} />}
      </div>
    </div>
  );
}

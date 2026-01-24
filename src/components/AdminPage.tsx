import { useState } from "react";
import { Clock, Radio, ShieldCheck, BarChart3 } from "lucide-react";
import { MemberWithProfile } from "../lib/members";
import { Tabs } from "./ui";
import { TimeTrackingContent } from "./admin/TimeTrackingContent";
import { ScannersContent } from "./admin/ScannersContent";
import { MemberManagementContent } from "./admin/MemberManagementContent";
import { InsightsContent } from "./admin/InsightsContent";

type TabKey = "time" | "scanners" | "members" | "insights";

interface AdminPageProps {
  member: MemberWithProfile;
}

export function AdminPage({ member }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("time");

  const tabs = [
    { id: "time" as const, label: "Time Tracking", icon: <Clock size={16} /> },
    { id: "scanners" as const, label: "Scanners", icon: <Radio size={16} /> },
    { id: "members" as const, label: "Members", icon: <ShieldCheck size={16} /> },
    { id: "insights" as const, label: "Insights", icon: <BarChart3 size={16} /> },
  ];

  return (
    <div className="space-y-6 pt-2">
      {/* Header */}
      <section>
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-text-primary">Admin</h1>
          <p className="text-sm text-text-muted mt-1">
            Team management and time tracking
          </p>
        </div>

        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as TabKey)}
          variant="segment"
        />
      </section>

      {activeTab === "time" && <TimeTrackingContent member={member} />}
      {activeTab === "scanners" && <ScannersContent member={member} />}
      {activeTab === "members" && <MemberManagementContent member={member} />}
      {activeTab === "insights" && <InsightsContent member={member} />}
    </div>
  );
}

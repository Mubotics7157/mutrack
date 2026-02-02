import { useState } from "react";
import { ShoppingCart, Video, Target } from "lucide-react";
import { MemberWithProfile } from "../lib/members";
import { PurchasesPage } from "./PurchasesPage";
import { VideosPage } from "./VideosPage";
import { BallisticsPage } from "./ballistics";
import { Tabs } from "./ui";

interface ToolsPageProps {
  member: MemberWithProfile;
}

type ToolTab = "purchases" | "videos" | "ballistics";

export function ToolsPage({ member }: ToolsPageProps) {
  const [activeTab, setActiveTab] = useState<ToolTab>("videos");

  const tabs = [
    { id: "purchases" as const, label: "Purchases", icon: <ShoppingCart size={16} /> },
    { id: "videos" as const, label: "Shooting Videos", icon: <Video size={16} /> },
    { id: "ballistics" as const, label: "Ballistics", icon: <Target size={16} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-bg-secondary border border-border rounded-xl p-2">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as ToolTab)}
          variant="segment"
          fullWidth
        />
      </div>

      {/* Content */}
      <div className="animate-fade-in">
        {activeTab === "purchases" && <PurchasesPage member={member} />}
        {activeTab === "videos" && <VideosPage member={member} />}
        {activeTab === "ballistics" && <BallisticsPage member={member} />}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Calendar, Users, ShoppingCart } from 'lucide-react';
import { MeetingsPanel } from './MeetingsPanel';
import { MembersPanel } from './MembersPanel';
import { PurchasesPanel } from './PurchasesPanel';
import { ActiveAttendanceStatus } from './ActiveAttendanceStatus';
import { MemberWithProfile } from '../lib/members';
import { Badge } from './ui';
import { cn } from '../lib/utils';

interface DashboardProps {
  member: MemberWithProfile;
}

type TabType = 'meetings' | 'members' | 'purchases';

export function Dashboard({ member }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('meetings');

  const tabs = [
    { id: 'meetings' as const, label: 'Meetings', icon: Calendar },
    { id: 'members' as const, label: 'Members', icon: Users },
    { id: 'purchases' as const, label: 'Purchases', icon: ShoppingCart },
  ];

  const getRoleVariant = (role: string): 'default' | 'success' | 'warning' | 'error' => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'lead':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-bg-secondary border border-border rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">
              Welcome back, {member.name}!
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-text-muted text-sm">Role:</span>
              <Badge variant={getRoleVariant(member.role)}>
                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-text-muted">FRC Team 7157</p>
            <p className="text-xs text-text-dim">Internal Management System</p>
          </div>
        </div>
      </div>

      {/* Active Attendance Status */}
      <ActiveAttendanceStatus />

      {/* Navigation Tabs */}
      <div className="bg-bg-secondary border border-border rounded-xl p-1">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all',
                  activeTab === tab.id
                    ? 'bg-accent/15 text-text-primary border border-accent/30'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                )}
              >
                <Icon size={18} />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'meetings' && <MeetingsPanel member={member} />}
        {activeTab === 'members' && <MembersPanel member={member} />}
        {activeTab === 'purchases' && <PurchasesPanel member={member} />}
      </div>
    </div>
  );
}

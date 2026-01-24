import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { MemberWithProfile } from "../../lib/members";
import { ProfileAvatar } from "../ProfileAvatar";
import { cn } from "../../lib/utils";
import {
  Users,
  UserCheck,
  Clock,
  Trophy,
  Calendar,
  TrendingUp,
  Target,
  Zap,
  BarChart3,
  Activity,
  Flame,
  Award,
  ChevronRight,
} from "lucide-react";

interface InsightsContentProps {
  member: MemberWithProfile;
}

export function InsightsContent({ member }: InsightsContentProps) {
  const insights = useQuery(api.analytics.getTeamInsights);

  if (!insights) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <section>
        <h2 className="text-sm font-medium text-text-secondary mb-3">Team Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<Users size={18} />}
            label="Total Members"
            value={insights.totalMembers.toString()}
            color="accent"
          />
          <StatCard
            icon={<UserCheck size={18} />}
            label="Active (30d)"
            value={insights.activeMembers.toString()}
            subtext={`${Math.round((insights.activeMembers / Math.max(1, insights.totalMembers)) * 100)}% of team`}
            color="success"
          />
          <StatCard
            icon={<Clock size={18} />}
            label="Total Hours"
            value={`${insights.totalAttendanceHours}h`}
            color="warning"
          />
          <StatCard
            icon={<Trophy size={18} />}
            label="Points Awarded"
            value={formatNumber(insights.totalPointsAwarded)}
            color="orange"
          />
        </div>
      </section>

      {/* Two column layout on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Breakdown */}
        <section>
          <h2 className="text-sm font-medium text-text-secondary mb-3">Member Engagement</h2>
          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <div className="space-y-3">
              <EngagementBar
                label="Highly Active"
                sublabel="5+ meetings"
                count={insights.engagementTiers.highlyActive}
                total={insights.totalMembers}
                color="bg-accent-success"
              />
              <EngagementBar
                label="Active"
                sublabel="2-4 meetings"
                count={insights.engagementTiers.active}
                total={insights.totalMembers}
                color="bg-accent"
              />
              <EngagementBar
                label="Occasional"
                sublabel="1 meeting"
                count={insights.engagementTiers.occasional}
                total={insights.totalMembers}
                color="bg-accent-warning"
              />
              <EngagementBar
                label="Inactive"
                sublabel="0 meetings"
                count={insights.engagementTiers.inactive}
                total={insights.totalMembers}
                color="bg-text-muted"
              />
            </div>
            <p className="text-xs text-text-muted mt-4 text-center">
              Based on meeting attendance in the last 30 days
            </p>
          </div>
        </section>

        {/* Top Contributors */}
        <section>
          <h2 className="text-sm font-medium text-text-secondary mb-3">Top Contributors</h2>
          <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
            {insights.topContributors.length === 0 ? (
              <div className="p-8 text-center">
                <Award size={32} className="text-text-muted mx-auto mb-2" />
                <p className="text-sm text-text-muted">No activity yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {insights.topContributors.map((contributor, index) => (
                  <div
                    key={contributor.memberId}
                    className="p-3 flex items-center gap-3 hover:bg-bg-tertiary transition-colors"
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0",
                        index === 0
                          ? "bg-accent-orange/20 text-accent-orange"
                          : index === 1
                          ? "bg-zinc-400/20 text-zinc-300"
                          : index === 2
                          ? "bg-amber-600/20 text-amber-500"
                          : "bg-bg-tertiary text-text-muted"
                      )}
                    >
                      {index + 1}
                    </div>
                    <ProfileAvatar
                      name={contributor.name}
                      imageUrl={contributor.profileImageUrl}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {contributor.name}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {contributor.totalHours}h
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy size={10} />
                          {contributor.totalPoints}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-accent">{contributor.combinedScore}</p>
                      <p className="text-[10px] text-text-muted">score</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Weekly Activity Chart */}
      <section>
        <h2 className="text-sm font-medium text-text-secondary mb-3">Weekly Activity</h2>
        <div className="bg-bg-secondary border border-border rounded-xl p-4">
          <div className="flex items-end justify-between gap-2 h-40 mb-3">
            {insights.weeklyActivity.map((week, index) => {
              const maxHours = Math.max(...insights.weeklyActivity.map((w) => w.totalHours), 1);
              const height = Math.max(8, (week.totalHours / maxHours) * 100);
              const isCurrentWeek = index === insights.weeklyActivity.length - 1;

              return (
                <div key={week.weekStart} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center justify-end h-32">
                    {week.totalHours > 0 && (
                      <span className="text-[10px] text-text-muted mb-1">
                        {week.totalHours}h
                      </span>
                    )}
                    <div
                      className={cn(
                        "w-full max-w-8 rounded-t-md transition-all",
                        isCurrentWeek
                          ? "bg-accent"
                          : "bg-accent/40 hover:bg-accent/60"
                      )}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className={cn(
                    "text-[10px]",
                    isCurrentWeek ? "text-accent font-medium" : "text-text-muted"
                  )}>
                    {week.weekLabel}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-border-subtle">
            <div className="text-center">
              <p className="text-lg font-semibold text-text-primary">
                {insights.weeklyActivity.reduce((sum, w) => sum + w.meetingCount, 0)}
              </p>
              <p className="text-[10px] text-text-muted">Meetings</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-text-primary">
                {Math.round(insights.weeklyActivity.reduce((sum, w) => sum + w.totalHours, 0) * 10) / 10}h
              </p>
              <p className="text-[10px] text-text-muted">Hours</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-text-primary">
                {insights.weeklyActivity.reduce((sum, w) => sum + w.uniqueAttendees, 0)}
              </p>
              <p className="text-[10px] text-text-muted">Attendees</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-text-primary">
                {insights.weeklyActivity.reduce((sum, w) => sum + w.pointsAwarded, 0)}
              </p>
              <p className="text-[10px] text-text-muted">Points</p>
            </div>
          </div>
        </div>
      </section>

      {/* Meeting Attendance */}
      <section>
        <h2 className="text-sm font-medium text-text-secondary mb-3">Recent Meeting Attendance</h2>
        <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
          {insights.recentMeetings.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar size={32} className="text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-muted">No meetings yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {insights.recentMeetings.map((meeting) => (
                <div
                  key={meeting.meetingId}
                  className="p-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {meeting.title}
                    </p>
                    <p className="text-xs text-text-muted">
                      {formatDate(meeting.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium text-text-primary">
                        {meeting.attendeeCount}/{meeting.totalMembers}
                      </p>
                      <p className="text-[10px] text-text-muted">attended</p>
                    </div>
                    <AttendanceIndicator rate={meeting.attendanceRate} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Bounty Stats */}
      <section>
        <h2 className="text-sm font-medium text-text-secondary mb-3">Bounty Progress</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-bg-secondary border border-border rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-accent mb-1">
              <Target size={16} />
              <span className="text-xl font-semibold">{insights.bountyStats.totalOpen}</span>
            </div>
            <p className="text-xs text-text-muted">Open Bounties</p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-accent-success mb-1">
              <Zap size={16} />
              <span className="text-xl font-semibold">{insights.bountyStats.totalCompleted}</span>
            </div>
            <p className="text-xs text-text-muted">Completed</p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-accent-warning mb-1">
              <Flame size={16} />
              <span className="text-xl font-semibold">{insights.bountyStats.pointsAvailable}</span>
            </div>
            <p className="text-xs text-text-muted">Points Available</p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-accent-orange mb-1">
              <Trophy size={16} />
              <span className="text-xl font-semibold">{insights.bountyStats.pointsAwarded}</span>
            </div>
            <p className="text-xs text-text-muted">Points Awarded</p>
          </div>
        </div>
      </section>

      {/* Meeting Stats Summary */}
      <section>
        <h2 className="text-sm font-medium text-text-secondary mb-3">Meeting Statistics</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-bg-secondary border border-border rounded-xl p-4 text-center">
            <Calendar size={20} className="text-accent mx-auto mb-2" />
            <p className="text-2xl font-semibold text-text-primary">{insights.totalMeetings}</p>
            <p className="text-xs text-text-muted">Total Meetings</p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-xl p-4 text-center">
            <TrendingUp size={20} className="text-accent-success mx-auto mb-2" />
            <p className="text-2xl font-semibold text-text-primary">{insights.meetingsThisMonth}</p>
            <p className="text-xs text-text-muted">This Month</p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-xl p-4 text-center">
            <BarChart3 size={20} className="text-accent-warning mx-auto mb-2" />
            <p className="text-2xl font-semibold text-text-primary">
              {insights.averageAttendancePerMeeting}
            </p>
            <p className="text-xs text-text-muted">Avg Attendance</p>
          </div>
        </div>
      </section>
    </div>
  );
}

// Helper components

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  color: "accent" | "success" | "warning" | "orange" | "error";
}

function StatCard({ icon, label, value, subtext, color }: StatCardProps) {
  const colorClasses = {
    accent: "bg-accent/10 text-accent border-accent/20",
    success: "bg-accent-success/10 text-accent-success border-accent-success/20",
    warning: "bg-accent-warning/10 text-accent-warning border-accent-warning/20",
    orange: "bg-accent-orange/10 text-accent-orange border-accent-orange/20",
    error: "bg-accent-error/10 text-accent-error border-accent-error/20",
  };

  return (
    <div className={cn("rounded-xl p-4 border", colorClasses[color])}>
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs opacity-80">{label}</p>
      {subtext && <p className="text-[10px] opacity-60 mt-0.5">{subtext}</p>}
    </div>
  );
}

interface EngagementBarProps {
  label: string;
  sublabel: string;
  count: number;
  total: number;
  color: string;
}

function EngagementBar({ label, sublabel, count, total, color }: EngagementBarProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-text-primary">{label}</span>
          <span className="text-xs text-text-muted ml-2">{sublabel}</span>
        </div>
        <span className="text-sm font-semibold text-text-primary">{count}</span>
      </div>
      <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${Math.max(percentage, count > 0 ? 4 : 0)}%` }}
        />
      </div>
    </div>
  );
}

function AttendanceIndicator({ rate }: { rate: number }) {
  const color = rate >= 70 ? "text-accent-success bg-accent-success/20" :
                rate >= 40 ? "text-accent-warning bg-accent-warning/20" :
                "text-accent-error bg-accent-error/20";

  return (
    <div className={cn("px-2 py-1 rounded-lg text-xs font-medium", color)}>
      {rate}%
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <>
      <section>
        <div className="h-4 w-32 bg-bg-tertiary rounded animate-pulse mb-3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-bg-secondary border border-border rounded-xl p-4 h-24 animate-pulse" />
          ))}
        </div>
      </section>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-bg-secondary border border-border rounded-xl p-4 h-64 animate-pulse" />
        <div className="bg-bg-secondary border border-border rounded-xl p-4 h-64 animate-pulse" />
      </div>
      <div className="bg-bg-secondary border border-border rounded-xl p-4 h-48 animate-pulse" />
    </>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

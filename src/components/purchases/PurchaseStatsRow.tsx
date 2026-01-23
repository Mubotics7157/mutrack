import { Clock, CheckCircle, Package, DollarSign, type LucideIcon } from 'lucide-react';

interface PurchaseStat {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}

interface PurchaseStatsRowProps {
  pending: number;
  approved: number;
  awaitingPlacement: number;
  outstandingTotal: number;
}

export function PurchaseStatsRow({
  pending,
  approved,
  awaitingPlacement,
  outstandingTotal,
}: PurchaseStatsRowProps) {
  const stats: PurchaseStat[] = [
    {
      label: 'Pending Review',
      value: pending,
      icon: <Clock size={18} />,
      color: 'text-accent-warning',
    },
    {
      label: 'Approved',
      value: approved,
      icon: <CheckCircle size={18} />,
      color: 'text-accent-success',
    },
    {
      label: 'Awaiting Placement',
      value: awaitingPlacement,
      icon: <Package size={18} />,
      color: 'text-accent',
    },
    {
      label: 'Outstanding',
      value: `$${outstandingTotal.toFixed(2)}`,
      icon: <DollarSign size={18} />,
      color: 'text-accent-orange',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-bg-secondary border border-border rounded-xl p-4 text-center"
        >
          <div className={`flex items-center justify-center gap-1.5 ${stat.color} mb-1`}>
            {stat.icon}
            <span className="text-xl font-semibold">{stat.value}</span>
          </div>
          <p className="text-xs text-text-muted">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

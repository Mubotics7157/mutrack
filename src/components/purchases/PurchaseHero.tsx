import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { Button } from '../ui';

interface Stat {
  label: string;
  value: number;
  color: string;
}

interface PurchaseHeroProps {
  stats: Stat[];
}

const workflowGuide = [
  {
    title: 'Submit a purchase request (any member)',
    body: "Requests should cover a single item or cart, like a McMaster cart submission or a heat gun off Amazon.",
  },
  {
    title: 'Use saved vendors and products',
    body: "Pick the vendor you plan to buy from - vendors are the companies we order from - and the product field will auto-fill from anything we've bought before. Reusing these saves time and keeps details consistent.",
  },
  {
    title: "Open an order when you're ready to buy (lead/admin)",
    body: "Once the needed requests are approved, bundle them into a purchase order. Orders almost always map to one vendor (for example, a single Amazon checkout) and capture the total cost, cart link, and any notes the buyer needs.",
  },
  {
    title: 'Mark the order as placed and close the loop',
    body: "Every new order starts in the pending state until you confirm the checkout happened. You can upload the confirmation email or receipt and add notes or the final total so everyone knows it's handled.",
    points: [
      'Pending -> waiting for the purchaser to check out.',
      'Placed -> confirmation uploaded or notes added, with the final total recorded when you have it.',
    ],
  },
];

export function PurchaseHero({ stats }: PurchaseHeroProps) {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <section className="space-y-4 pt-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Purchases</h1>
          <p className="text-sm text-text-muted mt-1">
            Keep the team supplied and every order transparent
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowGuide((prev) => !prev)}
          className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors"
          aria-expanded={showGuide}
        >
          <HelpCircle size={16} />
          <span>How it works</span>
          <ChevronDown
            size={14}
            className={`transition-transform ${showGuide ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-bg-secondary border border-border rounded-xl p-3 text-center"
          >
            <div className={`text-xl font-semibold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-text-muted mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Guide */}
      {showGuide && (
        <div className="bg-bg-secondary border border-border rounded-xl p-4 md:p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              How the purchasing flow works
            </h2>
            <p className="text-sm text-text-muted mt-1">
              Keep this checklist in mind so requests move smoothly from an idea to a confirmed order.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {workflowGuide.map((section, index) => (
              <div key={section.title} className="bg-bg-tertiary rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent text-white text-xs font-medium shrink-0">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-medium text-text-primary">
                      {section.title}
                    </h3>
                    <p className="text-sm text-text-muted mt-1">{section.body}</p>
                    {section.points && (
                      <ul className="list-disc pl-4 text-sm text-text-muted mt-2 space-y-1">
                        {section.points.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

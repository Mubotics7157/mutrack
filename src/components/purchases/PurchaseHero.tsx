import { useState } from 'react';

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
    title: 'submit a purchase request (any member)',
    body: "Requests should cover a single item or cart, like a McMaster cart submission or a heat gun off Amazon.",
  },
  {
    title: 'use saved vendors and products',
    body: "Pick the vendor you plan to buy from - vendors are the companies we order from - and the product field will auto-fill from anything we've bought before. Reusing these saves time and keeps details consistent.",
  },
  {
    title: 'open an order when you\'re ready to buy (lindsey/admin)',
    body: "Once the needed requests are approved, bundle them into a purchase order. Orders almost always map to one vendor (for example, a single Amazon checkout) and capture the total cost, cart link, and any notes the buyer needs.",
  },
  {
    title: 'mark the order as placed and close the loop (almost always Eichinger)',
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
    <div className="glass-panel p-8 space-y-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div>
            <h1 className="text-3xl font-light">purchase management</h1>
            <p className="text-text-muted">keep the team supplied and every order transparent</p>
          </div>
          <button
            type="button"
            onClick={() => setShowGuide((prev) => !prev)}
            className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-sunset-orange hover:text-sunset-orange/80 transition-colors touch-feedback"
            aria-expanded={showGuide}
          >
            <span>how does purchasing work</span>
            <svg
              className={`h-3 w-3 transition-transform ${showGuide ? 'rotate-180' : ''}`}
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 5L6 8L9 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 md:gap-6 w-full md:w-auto">
          {stats.map((stat) => (
            <div key={stat.label} className="card-modern p-4 text-left">
              <div className={`text-2xl font-light ${stat.color}`}>{stat.value}</div>
              <div className="text-xs uppercase tracking-wide text-text-muted mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {showGuide && (
        <div className="card-modern p-6 md:p-8 space-y-6 leading-relaxed">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-text-primary">how the purchasing flow works</h2>
            <p className="text-sm text-text-muted">
              Keep this checklist in mind so requests move smoothly from an idea to a confirmed order.
            </p>
          </div>

          {workflowGuide.map((section) => (
            <section key={section.title} className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
                {section.title}
              </h3>
              <p className="text-sm text-text-muted">{section.body}</p>
              {section.points && (
                <ul className="list-disc pl-5 text-sm text-text-muted space-y-1">
                  {section.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

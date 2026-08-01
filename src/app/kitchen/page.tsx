import AppShell from '../../components/AppShell';
import { AlarmClock, Clock3, Search, TimerReset } from 'lucide-react';

const tickets = [
  { title: 'Table 5 • 2x Flat White', stage: 'Preparing', eta: '8 min' },
  { title: 'Takeaway • 1x Matcha Latte', stage: 'Ready', eta: '2 min' },
  { title: 'Table 2 • Croissant Box', stage: 'New', eta: '4 min' },
];

export default function KitchenPage() {
  return (
    <AppShell title="Kitchen KDS" description="A real-time display for ticket flow, prep progress, and service readiness." badge="Active">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-panel p-6 rounded-2xl border border-border/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Live Ticket Board</h2>
              <p className="mt-1 text-sm text-muted-foreground">Kitchen staff can view incoming orders, manage prep stages, and prioritize urgent tickets.</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              <Search size={14} /> Filter & search
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {tickets.map((ticket) => (
              <div key={ticket.title} className="flex items-center justify-between rounded-2xl border border-border/50 bg-background/70 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{ticket.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{ticket.stage}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TimerReset size={14} /> {ticket.eta}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-border/40">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock3 size={16} /> Prep metrics
            </div>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>• Average ticket time: 7m 20s</li>
              <li>• Bottlenecks by pastry and espresso lines</li>
              <li>• Service alerts for delayed orders</li>
            </ul>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-border/40">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlarmClock size={16} /> Priority workflow
            </div>
            <p className="mt-3 text-sm text-muted-foreground">New orders are highlighted, prep timers are visible, and critical tickets can be escalated instantly.</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

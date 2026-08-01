import AppShell from '../../components/AppShell';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { summarizeInventoryStatus } from '../../lib/operations';

const inventoryItems = [
  { name: 'Arabica Beans', qty: '4.2kg', status: 'critical', note: 'Threshold breach' },
  { name: 'Oat Milk', qty: '11L', status: 'low_stock', note: 'Reorder due soon' },
  { name: 'Pistachio Cream', qty: '32 units', status: 'in_stock', note: 'Healthy coverage' },
];

export default function InventoryPage() {
  const summary = summarizeInventoryStatus(inventoryItems.map((item) => ({ status: item.status })));

  return (
    <AppShell title="Inventory Management" description="Monitor stock levels, supplier orders, and reorder risk with automated alerts." badge="Healthy">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-panel p-6 rounded-2xl border border-border/40">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Stock Overview</h2>
              <p className="mt-1 text-sm text-muted-foreground">Track critical ingredients, restock timing, and minimum stock thresholds.</p>
            </div>
            <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Live health</div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/50 bg-background/70 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Critical</p>
              <p className="mt-2 text-2xl font-black text-foreground">{summary.critical}</p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/70 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Warning</p>
              <p className="mt-2 text-2xl font-black text-foreground">{summary.warning}</p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/70 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Healthy</p>
              <p className="mt-2 text-2xl font-black text-foreground">{summary.healthy}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {inventoryItems.map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-2xl border border-border/50 bg-background/70 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{item.qty}</p>
                  <p className="mt-1 text-xs font-semibold text-warning">{item.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-border/40">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertTriangle size={16} /> AI restock signals
            </div>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>• Low stock and risk scoring</li>
              <li>• Supplier purchase order drafts</li>
              <li>• Audit logs for every change</li>
            </ul>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-border/40">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck size={16} /> Control center
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Approval workflows, reorder recommendations, and supplier handoff are centralized here for rapid action.</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

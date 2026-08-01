import AppShell from '../../components/AppShell';
import { CreditCard, DollarSign, Receipt, ScanLine, Smartphone, Sparkles } from 'lucide-react';

const paymentModes = [
  { label: 'Cash', value: 'Cash', detail: 'Fast closeout' },
  { label: 'Card', value: 'Card', detail: 'Tap to pay' },
  { label: 'Wallet', value: 'Wallet', detail: 'QR & mobile' },
];

const queueItems = [
  { title: 'Table 4 • 2x Nitro Brew', status: 'Kitchen sent' },
  { title: 'Takeaway • 1x Pistachio Latte', status: 'Ready for pickup' },
  { title: 'Table 8 • 3x Croissant Box', status: 'Awaiting payment' },
];

export default function PosPage() {
  return (
    <AppShell title="POS Terminal" description="Fast checkout and order entry for café staff and cashiers." badge="Live">
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="glass-panel p-6 rounded-2xl border border-border/40 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Order Entry</h2>
              <p className="mt-1 text-sm text-muted-foreground">Capture orders, apply loyalty, and send them instantly to the kitchen.</p>
            </div>
            <div className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">Online mode</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {paymentModes.map((mode) => (
              <div key={mode.label} className="rounded-2xl border border-border/50 bg-background/70 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {mode.label === 'Card' ? <CreditCard size={14} /> : mode.label === 'Wallet' ? <Smartphone size={14} /> : <DollarSign size={14} />}
                  {mode.label}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{mode.detail}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-dashed border-border/50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ScanLine size={16} /> Barcode-ready workflow
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Scan product labels, attach modifiers, and split bills across cash, card, or wallet in one flow.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-border/40">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Receipt size={16} /> Checkout snapshot
            </div>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>• Tap-to-pay, cash, and wallet support</li>
              <li>• Discounts, taxes, and notes at item level</li>
              <li>• Instant kitchen and customer notification sync</li>
            </ul>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-border/40">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles size={16} /> Live queue
            </div>
            <div className="mt-4 space-y-3">
              {queueItems.map((item) => (
                <div key={item.title} className="flex items-center justify-between rounded-xl bg-background/70 px-3 py-2 text-sm">
                  <span className="text-foreground">{item.title}</span>
                  <span className="text-xs text-muted-foreground">{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

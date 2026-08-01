import AppShell from '../../components/AppShell';

export default function AnalyticsPage() {
  return (
    <AppShell title="Analytics & Reports" description="Business performance reporting with sales, demand, and predictive insight views." badge="Smart">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel p-6 rounded-2xl border border-border/40">
          <h2 className="text-lg font-semibold text-foreground">Performance Reports</h2>
          <p className="mt-2 text-sm text-muted-foreground">Review revenue, order volume, and product popularity trends by day and week.</p>
        </div>
        <div className="glass-panel p-6 rounded-2xl border border-border/40">
          <h2 className="text-lg font-semibold text-foreground">AI Recommendations</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>• Forecast demand and peak-hours</li>
            <li>• Identify top-selling items</li>
            <li>• Recommend staffing and restocking actions</li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}

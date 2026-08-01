import AppShell from '../../components/AppShell';
import DashboardGuard from '../../components/auth/DashboardGuard';
import { MetricCards, AIInsightsWidget, KitchenQueueWidget, RecentOrdersWidget, InventoryAlertsWidget, WeatherWidget, CalendarWidget, QuickActionsWidget } from '../../components/DashboardWidgets';
import DashboardCharts from '../../components/DashboardCharts';

export default function DashboardPage() {
  return (
    <DashboardGuard>
      <AppShell title="Operations Dashboard" description="Live command center for orders, inventory, staffing, and insights." badge="Premium Active">
        <div className="space-y-6">
          <MetricCards />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <DashboardCharts />
            </div>

            <div className="space-y-6">
              <AIInsightsWidget />
              <InventoryAlertsWidget />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <KitchenQueueWidget />
            <RecentOrdersWidget />
            <QuickActionsWidget />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <WeatherWidget />
            <CalendarWidget />
          </div>
        </div>
      </AppShell>
    </DashboardGuard>
  );
}

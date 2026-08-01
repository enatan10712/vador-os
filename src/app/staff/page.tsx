import AppShell from '../../components/AppShell';
import { ShieldCheck, Sparkles, Users2 } from 'lucide-react';

const teamMembers = [
  { name: 'Mina', role: 'Manager', shift: '08:00–16:00' },
  { name: 'Dawit', role: 'Barista', shift: '09:00–17:00' },
  { name: 'Selam', role: 'Host', shift: '10:00–18:00' },
];

export default function StaffPage() {
  return (
    <AppShell title="Staff & Team" description="Manage live roles, shifts, and team access for staff operations." badge="Configured">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel p-6 rounded-2xl border border-border/40">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users2 size={16} /> Team presence
          </div>
          <div className="mt-5 space-y-3">
            {teamMembers.map((member) => (
              <div key={member.name} className="flex items-center justify-between rounded-2xl border border-border/50 bg-background/70 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{member.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{member.role}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">{member.shift}</p>
                  <p className="mt-1">On shift</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-border/40">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck size={16} /> Role-based access
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Admin, manager, cashier, kitchen, waiter, and customer experiences are defined in the platform model.</p>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-border/40">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles size={16} /> Shift optimization
            </div>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>• Assign daily roles and responsibilities</li>
              <li>• Monitor active team members</li>
              <li>• Protect sensitive operations with access rules</li>
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

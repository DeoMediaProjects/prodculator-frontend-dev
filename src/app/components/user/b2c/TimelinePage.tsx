import { useEffect, useState } from 'react';
import { ProductionTimeline } from '@/app/components/user/ProductionTimeline';
import { useAuth } from '@/app/contexts/AuthContext';
import { apiClient } from '@/services/api';

type ReportApiResponse = {
  id: string; title?: string; script_title?: string;
  analysis?: { error?: string } | null; report_data?: { error?: string } | null;
};

export function TimelinePage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiClient.get<ReportApiResponse[]>('/api/reports', { auth: true });
        const completed = data
          .filter((r) => (r.analysis || r.report_data) && !(r.analysis || r.report_data)?.error)
          .map((r) => ({ id: r.id, title: r.title || r.script_title || 'Untitled' }));
        if (!cancelled) setReports(completed);
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const plan = user?.plan;
  const timelinePlan: 'free' | 'professional' | 'studio' =
    plan === 'free' ? 'free' : plan === 'professional' ? 'professional' : 'studio';

  return <ProductionTimeline userPlan={timelinePlan} reports={reports} />;
}

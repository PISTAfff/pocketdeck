'use client';

/**
 * Analytics tab body.
 *
 * Stat cards across the top, then two stacked time-series (traffic +
 * sales) and a row of summary panels (status donut, top pages, top
 * configurations). Server pre-shapes everything so render is purely
 * presentational.
 */
import { useMemo } from 'react';
import type { AdminAnalytics } from '@/lib/adminAuth';
import {
  STATUS_HEX,
  STATUSES,
  formatEGP,
  formatNumber,
  formatPercent,
} from './format';
import { BarChart, ChartCard, DonutChart, HBars, LineChart } from './charts';

interface Props {
  analytics: AdminAnalytics | null;
  byStatus: Record<string, number>;
  busy: boolean;
}

export function AnalyticsPanel({ analytics, byStatus, busy }: Props) {
  // Tick labels along the X axis: "23 May" pattern, friendly to scan.
  const dailyLabels = useMemo(() => {
    if (!analytics) return [];
    return analytics.daily.map((d) =>
      new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
      }),
    );
  }, [analytics]);

  if (!analytics) {
    return (
      <div className="grid place-items-center rounded-2xl border border-bone-50/10 bg-white/[0.02] py-24">
        <p className="font-mono text-[11px] tracking-[0.28em] text-bone-50/40 uppercase">
          {busy ? 'Loading analytics…' : 'No analytics yet.'}
        </p>
      </div>
    );
  }

  const { totals, daily, topConfigurations } = analytics;

  const labelAt = (i: number) => dailyLabels[i] ?? '';

  const viewsSeries = {
    name: 'Page views',
    color: '#ff5b14',
    points: daily.map((d, i) => ({ label: labelAt(i), value: d.views })),
  };
  const uniqueSeries = {
    name: 'Unique visitors',
    color: '#22d3ee',
    points: daily.map((d, i) => ({
      label: labelAt(i),
      value: d.uniqueVisitors,
    })),
  };
  const ordersSeries = {
    name: 'Orders',
    color: '#a78bfa',
    points: daily.map((d, i) => ({ label: labelAt(i), value: d.orders })),
  };
  const revenueBars = daily.map((d, i) => ({
    label: labelAt(i),
    value: d.revenueEGP,
  }));

  const statusData = STATUSES.map((s) => ({
    label: s,
    value: byStatus[s] ?? 0,
    color: STATUS_HEX[s],
  }));
  const statusTotal = statusData.reduce((a, b) => a + b.value, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          label="Page views (30d)"
          value={formatNumber(totals.pageViews)}
          accent
        />
        <Kpi
          label="Unique visitors"
          value={formatNumber(totals.uniqueVisitors)}
        />
        <Kpi
          label="Conversion"
          value={totals.uniqueVisitors > 0 ? formatPercent(totals.conversionRate) : '—'}
          sub={`${formatNumber(totals.totalOrders)} orders`}
        />
        <Kpi
          label="Sales (delivered)"
          value={formatEGP(totals.deliveredRevenueEGP)}
          sub={`${formatNumber(totals.deliveredCount)} completed`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Traffic · last 30 days" hint="views vs unique">
          <Legend
            items={[
              { color: viewsSeries.color, label: 'Page views' },
              { color: uniqueSeries.color, label: 'Unique visitors' },
            ]}
          />
          <div className="mt-2 h-56">
            <LineChart series={[viewsSeries, uniqueSeries]} height={224} />
          </div>
        </ChartCard>

        <ChartCard title="Sales · last 30 days" hint="orders · revenue">
          <Legend
            items={[
              { color: ordersSeries.color, label: 'Orders/day' },
              { color: '#ff5b14', label: 'Revenue (EGP)' },
            ]}
          />
          <div className="mt-2 h-56">
            <BarChart
              data={revenueBars}
              color="#ff5b14"
              height={224}
              yFormatter={(n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)))}
            />
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Orders by status" hint="all-time">
          <div className="grid grid-cols-[auto,1fr] items-center gap-5">
            <div className="h-44 w-44">
              <DonutChart
                data={statusData}
                centerLabel="orders"
                centerValue={formatNumber(statusTotal)}
              />
            </div>
            <ul className="space-y-1.5">
              {statusData.map((d) => (
                <li
                  key={d.label}
                  className="flex items-center justify-between gap-3 font-mono text-[11px] tracking-wider text-bone-200 uppercase"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: d.color }}
                    />
                    {d.label}
                  </span>
                  <span className="text-bone-50">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </ChartCard>

        <ChartCard title="Top builds" hint="by units sold">
          {topConfigurations.length === 0 ? (
            <EmptyHint />
          ) : (
            <HBars
              color="#ff5b14"
              data={topConfigurations.map((c) => ({
                label: `${c.selection.deck} · ${c.selection.wheel} · ${c.selection.truck} · ${c.selection.grip}`,
                value: c.count,
                sub: `${formatEGP(c.revenueEGP)} revenue`,
              }))}
            />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent
          ? 'border-ember-500/40 bg-ember-500/[0.08]'
          : 'border-bone-50/10 bg-white/[0.03]'
      }`}
    >
      <p className="font-mono text-[10px] tracking-[0.22em] text-bone-50/50 uppercase">
        {label}
      </p>
      <p
        className={`mt-1.5 text-2xl font-bold md:text-[26px] ${
          accent ? 'text-ember-300' : 'text-bone-50'
        }`}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-1 font-mono text-[10px] tracking-[0.18em] text-bone-50/40 uppercase">
          {sub}
        </p>
      )}
    </div>
  );
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-3">
      {items.map((i) => (
        <li
          key={i.label}
          className="flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-bone-50/60 uppercase"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: i.color }}
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

function EmptyHint() {
  return (
    <p className="py-8 text-center font-mono text-[11px] tracking-[0.22em] text-bone-50/30 uppercase">
      No data yet
    </p>
  );
}

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts";

type MonthlyPoint = { month: string; count: number };
type PlatformPoint = { name: string; value: number };

export function AnalyticsCharts({
  monthly,
  platforms,
}: {
  monthly: MonthlyPoint[];
  platforms: PlatformPoint[];
}) {
  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 pulse-card p-4 sm:p-5 space-y-4">
        <h2 className="font-semibold text-sm">Content output over time</h2>
        {monthly.length > 0 ? (
          <div className="h-56 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(196 52% 27%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">Create posts to see trends here.</p>
        )}
      </div>

      <div className="pulse-card p-4 sm:p-5 space-y-4">
        <h2 className="font-semibold text-sm">Platform mix</h2>
        {platforms.length > 0 ? (
          <div className="h-56 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={platforms} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(196 45% 38%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">No platform data yet.</p>
        )}
      </div>
    </div>
  );
}

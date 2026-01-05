import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { PriceHistoryPoint } from "../api";

interface Props {
  history?: PriceHistoryPoint[];
  currency?: string;
}

function formatCompactNumber(n: number) {
  // Avoid Intl.NumberFormat compact to keep behavior predictable across environments
  // while still improving readability.
  if (n >= 1_000_000) return `${Math.round((n / 1_000_000) * 10) / 10}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`;
  return `${n}`;
}

export default function PriceHistoryChart({ history, currency }: Props) {
  if (!history || history.length === 0) return null;

  const data = [...history]
    .sort(
      (a, b) =>
        new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime()
    )
    .map((p) => {
      const d = new Date(p.checkedAt);
      return {
        ...p,
        // Shorter label reduces clutter on small charts
        dateLabel: d.toLocaleDateString(undefined, { month: "short", day: "2-digit" }),
        // Keep full date/time for tooltip
        checkedAtLabel: d.toLocaleString(),
      };
    });

  return (
    <div style={{ width: "100%", height: 170 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />

          <XAxis
            dataKey="dateLabel"
            style={{ fontSize: 11, opacity: 0.85 }}
            tickMargin={6}
            interval="preserveStartEnd"
            minTickGap={18}
          />

          <YAxis
            style={{ fontSize: 11, opacity: 0.85 }}
            tickMargin={6}
            width={70}
            tickFormatter={(v: any) =>
              currency ? `${formatCompactNumber(Number(v))} ${currency}` : formatCompactNumber(Number(v))
            }
          />

          <Tooltip
            formatter={(value: any) => `${value} ${currency ?? ""}`.trim()}
            labelFormatter={(label: any, payload: any) => {
              const p = payload?.[0]?.payload as any;
              return p?.checkedAtLabel ? `Checked: ${p.checkedAtLabel}` : `Date: ${label}`;
            }}
          />

          <Line type="monotone" dataKey="price" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

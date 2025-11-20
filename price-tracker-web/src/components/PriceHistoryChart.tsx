import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PriceHistoryPoint } from "../api";

interface Props {
  history?: PriceHistoryPoint[];
  currency?: string;
}

export default function PriceHistoryChart({ history, currency }: Props) {
  if (!history || history.length === 0) return null;

  // Sort by time ascending, and add a short date label for the x-axis
  const data = [...history]
    .sort(
      (a, b) =>
        new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime()
    )
    .map((p) => ({
      ...p,
      dateLabel: new Date(p.checkedAt).toLocaleDateString(),
    }));

  return (
    <div style={{ width: "100%", height: 160, marginTop: 8 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <XAxis dataKey="dateLabel" style={{ fontSize: 11 }} tickMargin={4} />
          <YAxis style={{ fontSize: 11 }} tickMargin={4} width={60} />
          <Tooltip
            formatter={(value: any) =>
              `${value} ${currency ?? ""}`.trim()
            }
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="price"
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { SugarTimeOfDay } from '@/utils/sugar'

interface GlucoseTimeOfDayChartProps {
  data: SugarTimeOfDay[] | undefined
  loading?: boolean
}

const BAR_COLOR = '#f59e0b'

export function GlucoseTimeOfDayChart({ data, loading }: GlucoseTimeOfDayChartProps) {
  if (loading || !data) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="w-full h-full bg-slate-100 animate-pulse rounded" />
      </div>
    )
  }

  const hasData = data.some((d) => d.avg != null)
  if (!hasData) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400">
        No blood glucose data yet
      </div>
    )
  }

  const chartData = data.map((d) => ({
    label: d.label,
    avg: d.avg != null ? Number(d.avg.toFixed(1)) : null,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" tickLine={false} />
        <YAxis
          tick={{ fontSize: 12 }}
          stroke="#94a3b8"
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: '#f8fafc' }}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value) => [typeof value === 'number' ? value : '--', 'Avg']}
        />
        <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={BAR_COLOR} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

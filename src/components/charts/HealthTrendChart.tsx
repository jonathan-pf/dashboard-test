import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { LocalHealthRecord } from '@/types/airtable'

interface HealthTrendChartProps {
  data: LocalHealthRecord[] | undefined
  type: LocalHealthRecord['type']
  loading?: boolean
}

const typeColors: Record<LocalHealthRecord['type'], string> = {
  Glucose: '#f59e0b',
  Units: '#3b82f6',
  Reps: '#10b981',
  Willpoint: '#8b5cf6',
  Tidy: '#ec4899',
  Weight: '#6366f1',
}

export function HealthTrendChart({ data, type, loading }: HealthTrendChartProps) {
  if (loading || !data) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="w-full h-full bg-slate-100 animate-pulse rounded" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400">
        No {type.toLowerCase()} data yet
      </div>
    )
  }

  const chartData = data.map((record) => ({
    date: new Date(record.date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    }),
    value: record.value,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          stroke="#94a3b8"
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          stroke="#94a3b8"
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={typeColors[type]}
          strokeWidth={2}
          dot={{ fill: typeColors[type], r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

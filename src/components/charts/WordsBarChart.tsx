import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { LocalWeeksRecord } from '@/types/airtable'

interface WordsBarChartProps {
  weeks: LocalWeeksRecord[] | undefined
  loading?: boolean
}

export function WordsBarChart({ weeks, loading }: WordsBarChartProps) {
  if (loading || !weeks) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="w-full h-full bg-slate-100 animate-pulse rounded" />
      </div>
    )
  }

  if (weeks.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400">
        No word data yet
      </div>
    )
  }

  // Take last 8 weeks
  const recentWeeks = weeks.slice(0, 8).reverse()

  // Check if we span multiple years
  const years = new Set(recentWeeks.map((w) => new Date(w.weekCommencing).getFullYear()))
  const showYear = years.size > 1

  const chartData = recentWeeks.map((week) => {
    const year = new Date(week.weekCommencing).getFullYear()
    const yearSuffix = showYear ? ` '${String(year).slice(-2)}` : ''
    return {
      name: `W${week.weekNumber}${yearSuffix}`,
      Arcadia: week.totalFiction ?? 0,
      Blog: week.totalBlog ?? 0,
      Notes: week.totalNotes ?? 0,
      Novella: week.totalNovella ?? 0,
    }
  })

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="name"
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
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Bar dataKey="Arcadia" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
        <Bar dataKey="Blog" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
        <Bar dataKey="Notes" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
        <Bar dataKey="Novella" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

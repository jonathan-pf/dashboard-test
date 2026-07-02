import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { SugarDay } from '@/utils/sugar'

interface GlucoseTrendChartProps {
  data: SugarDay[] | undefined
  loading?: boolean
}

const AVG_COLOR = '#f59e0b' // amber, matches the existing Glucose colour
const BAND_COLOR = '#fbbf24'

export function GlucoseTrendChart({ data, loading }: GlucoseTrendChartProps) {
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
        No blood glucose data yet
      </div>
    )
  }

  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    avg: d.avg,
    // A [min, max] tuple draws a single shaded range band (one tooltip entry).
    band: d.min != null && d.max != null ? [d.min, d.max] : null,
  }))

  const mins = data.map((d) => d.min).filter((v): v is number => v != null)
  const maxes = data.map((d) => d.max).filter((v): v is number => v != null)
  const yDomain: [number, number] = [
    mins.length ? Math.floor(Math.min(...mins) - 1) : 0,
    maxes.length ? Math.ceil(Math.max(...maxes) + 1) : 'auto' as unknown as number,
  ]

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" tickLine={false} />
        <YAxis
          tick={{ fontSize: 12 }}
          stroke="#94a3b8"
          tickLine={false}
          axisLine={false}
          domain={yDomain}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value, name) => {
            if (name === 'band') {
              return Array.isArray(value)
                ? [`${value[0]}–${value[1]}`, 'Min–Max']
                : ['--', 'Min–Max']
            }
            const v = typeof value === 'number' ? value : null
            return [v == null ? '--' : v.toFixed(1), 'Avg']
          }}
        />
        {/* Shaded daily min→max range band */}
        <Area
          dataKey="band"
          stroke="none"
          fill={BAND_COLOR}
          fillOpacity={0.18}
          isAnimationActive={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="avg"
          stroke={AVG_COLOR}
          strokeWidth={2}
          dot={{ fill: AVG_COLOR, r: 3 }}
          activeDot={{ r: 5 }}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

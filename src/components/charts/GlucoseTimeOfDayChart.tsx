import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LabelList,
  type LabelProps,
} from 'recharts'
import type { SugarTimeOfDay } from '@/utils/sugar'

interface GlucoseTimeOfDayChartProps {
  data: SugarTimeOfDay[] | undefined
  loading?: boolean
}

const BAR_COLOR = '#f59e0b'
// Target average glucose (mmol/L) — matches the green threshold for Sugar
const TARGET = 8

// Mini label above each bar showing how far the bucket is over/under the target
function DeltaLabel(props: LabelProps) {
  const { x, y, width, value } = props
  if (typeof value !== 'number' || typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number') {
    return null
  }
  const delta = value - TARGET
  const text = `${delta >= 0 ? '+' : '-'}${Math.abs(delta).toFixed(1)}`
  const fill = delta > 0 ? '#dc2626' : '#16a34a' // over target red, under green
  return (
    <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill={fill}>
      {text}
    </text>
  )
}

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
      <BarChart data={chartData} margin={{ top: 18, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" tickLine={false} />
        <YAxis
          tick={{ fontSize: 12 }}
          stroke="#94a3b8"
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          domain={[0, (dataMax: number) => Math.max(Math.ceil(dataMax + 1), TARGET + 1)]}
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
        <ReferenceLine y={TARGET} stroke="#94a3b8" strokeDasharray="4 4" />
        <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
          <LabelList dataKey="avg" content={DeltaLabel} />
          {chartData.map((_, i) => (
            <Cell key={i} fill={BAR_COLOR} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

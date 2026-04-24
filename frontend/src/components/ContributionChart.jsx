import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CHART_COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(15, 20, 35, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '0.8rem',
        backdropFilter: 'blur(10px)',
      }}>
        <p style={{ fontWeight: 700, marginBottom: 4 }}>{payload[0].name}</p>
        <p style={{ color: payload[0].color }}>
          ₹{payload[0].value?.toLocaleString('en-IN')} ({payload[0].payload?.percentage?.toFixed(1)}%)
        </p>
      </div>
    );
  }
  return null;
};

export default function ContributionChart({ participantStats, participants }) {
  if (!participantStats || participantStats.length === 0) {
    return null;
  }

  // Pie chart data — who paid how much
  const pieData = participantStats.map((stat, i) => ({
    name: stat.name,
    value: stat.totalPaid,
    percentage: stat.percentage,
    color: participants?.find(p => p.name === stat.name)?.color || CHART_COLORS[i % CHART_COLORS.length],
  }));

  // Bar chart data — paid vs owed
  const barData = participantStats.map((stat, i) => ({
    name: stat.name,
    Paid: stat.totalPaid,
    Owes: stat.totalOwed,
    color: participants?.find(p => p.name === stat.name)?.color || CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
      {/* Pie: Contribution Share */}
      <div className="chart-container">
        <div className="chart-title">
          🥧 Contribution Share
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {pieData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Bar: Paid vs Owed */}
      <div className="chart-container">
        <div className="chart-title">
          📊 Paid vs Owed
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={barData} barGap={4}>
            <XAxis
              dataKey="name"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="Paid" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Owes" fill="#06b6d4" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

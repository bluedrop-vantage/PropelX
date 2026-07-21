import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useDesignStore } from '../state/designStore.js';
import { HelpTip } from '../help/HelpTip.js';
import { HELP } from '../help/content.js';

export function MassBreakdown() {
  const result = useDesignStore((s) => s.solveResult);
  const mission = useDesignStore((s) => s.design.mission);

  const row: Record<string, number | string> = { name: 'GLOW', Payload: mission.payload_kg };
  for (const s of result.stages) {
    row[`S${s.position} propellant`] = Math.round(s.propellant_kg);
    row[`S${s.position} dry`] = Math.round(s.dry_kg);
  }

  const propKeys = result.stages.map((s) => `S${s.position} propellant`);
  const dryKeys = result.stages.map((s) => `S${s.position} dry`);

  return (
    <div className="chart mass-breakdown" role="region" aria-label="Mass breakdown">
      <h3>
        Mass breakdown <HelpTip {...HELP.massBreakdown} />
      </h3>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={[row]} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
          <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}t`} />
          <YAxis type="category" dataKey="name" width={60} />
          <Tooltip formatter={(v: number) => `${(v / 1000).toFixed(1)} t`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Payload" stackId="glow" fill="#E5E7EB" />
          {propKeys.map((k, i) => (
            <Bar key={k} dataKey={k} stackId="glow" fill={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][i % 5]} />
          ))}
          {dryKeys.map((k, i) => (
            <Bar
              key={k}
              dataKey={k}
              stackId="glow"
              fill={['#1E3A8A', '#065F46', '#92400E', '#7F1D1D', '#4C1D95'][i % 5]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

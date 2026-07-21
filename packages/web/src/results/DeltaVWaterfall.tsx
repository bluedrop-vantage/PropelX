import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useDesignStore } from '../state/designStore.js';
import { branding } from '../branding/Wordmark.js';
import { HelpTip } from '../help/HelpTip.js';
import { HELP } from '../help/content.js';

const STAGE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function DeltaVWaterfall() {
  const result = useDesignStore((s) => s.solveResult);
  const mission = useDesignStore((s) => s.design.mission);

  const data = result.stages.map((s) => ({
    name: `S${s.position}`,
    dv: Math.round(s.delta_v_m_s),
  }));

  const totalAlloc = data.reduce((a, s) => a + s.dv, 0);
  const missing = Math.max(0, mission.delta_v_m_s - totalAlloc);
  if (missing > 0.5) data.push({ name: 'gap', dv: Math.round(missing) });

  return (
    <div className="chart delta-v-waterfall" role="region" aria-label="Delta-v per stage">
      <h3>
        Δv per stage <HelpTip {...HELP.deltaVWaterfall} />
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
          <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
          <YAxis type="category" dataKey="name" width={40} />
          <Tooltip formatter={(v: number) => `${v.toLocaleString()} m/s`} />
          <Bar dataKey="dv">
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.name === 'gap' ? '#4B4B4B' : STAGE_COLORS[i % STAGE_COLORS.length] ?? branding.accent}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

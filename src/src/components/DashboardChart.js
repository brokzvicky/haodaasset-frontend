import React from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const PIE_COLORS = ["#2563eb", "#16a34a", "#a16207", "#c2410c", "#b91c1c", "#7c3aed"];

const CustomTooltipStyle = {
  background: "#fff",
  border: "1px solid var(--gray-200)",
  borderRadius: 8,
  fontSize: 12,
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  padding: "8px 12px",
};

export function StatusPieChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const filtered = data.filter((d) => d.value > 0);

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={filtered.length > 0 ? filtered : [{ name: "No data", value: 1 }]}
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={2}
            stroke="#fff"
          >
            {(filtered.length > 0 ? filtered : [{ name: "No data", value: 1 }]).map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={filtered.length === 0 ? "#e2e8f0" : PIE_COLORS[index % PIE_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={CustomTooltipStyle}
            formatter={(value, name) => [value, name]}
          />
          <Legend
            iconType="circle"
            iconSize={7}
            formatter={(value) => (
              <span style={{ fontSize: 11.5, color: "var(--gray-600)", fontWeight: 600 }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      {total > 0 && (
        <div style={{ textAlign: "center", marginTop: -10 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--gray-900)", fontFamily: "var(--font-data)", letterSpacing: "-1px" }}>
            {total}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--gray-400)", fontWeight: 600 }}>Total Assets</div>
        </div>
      )}
    </div>
  );
}

export function AssetTypeBarChart({ data, color = "#2563eb" }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0", color: "var(--gray-300)", fontSize: 13 }}>
        No data yet — add assets to see the chart.
      </div>
    );
  }

  const COLORS = ["#2563eb", "#16a34a", "#7c3aed", "#d97706", "#c2410c", "#0284c7", "#be185d", "#059669"];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barSize={24} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="0" stroke="var(--gray-100)" vertical={false} />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10.5, fill: "var(--gray-400)", fontWeight: 600 }}
          interval={0}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          tick={{ fontSize: 10.5, fill: "var(--gray-400)" }}
          width={28}
        />
        <Tooltip
          contentStyle={CustomTooltipStyle}
          cursor={{ fill: "var(--gray-50)", radius: 4 }}
          formatter={(value) => [value, "Assets"]}
        />
        <Bar dataKey="value" radius={[5, 5, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}


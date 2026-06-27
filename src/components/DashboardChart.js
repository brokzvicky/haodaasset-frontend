import React from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

// Modern Enterprise Colors matching CSS variables
const PIE_COLORS = ["#0052cc", "#00875a", "#ff991f", "#5243aa", "#00b8d9"];

export function StatusPieChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <ResponsiveContainer width="100%" height={230}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #dfe1e6",
              borderRadius: "4px",
              fontSize: "13px",
              boxShadow: "0 4px 8px -2px rgba(9, 30, 66, 0.25)",
              color: "#172b4d"
            }}
            itemStyle={{ color: "#172b4d", fontWeight: 600 }}
          />
          <Legend
            iconType="circle"
            iconSize={10}
            formatter={(value) => <span style={{ fontSize: 13, color: "#42526e", fontWeight: 500 }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
      {total > 0 && (
        <div style={{ textAlign: "center", marginTop: -16 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#172b4d" }}>{total}</div>
          <div style={{ fontSize: 13, color: "#6b778c", fontWeight: 500 }}>Total Assets</div>
        </div>
      )}
    </div>
  );
}

export function AssetTypeBarChart({ data, color = "#0052cc" }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0", color: "#6b778c", fontSize: 13 }}>
        No data yet — add some assets to see this chart.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barSize={32}>
        <CartesianGrid strokeDasharray="4 4" stroke="#ebecf0" vertical={false} />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#6b778c", fontWeight: 500 }}
          dy={10}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          tick={{ fontSize: 12, fill: "#6b778c", fontWeight: 500 }}
          dx={-10}
        />
        <Tooltip
          contentStyle={{
            background: "#ffffff",
            border: "1px solid #dfe1e6",
            borderRadius: "4px",
            fontSize: "13px",
            boxShadow: "0 4px 8px -2px rgba(9, 30, 66, 0.25)",
          }}
          cursor={{ fill: "rgba(9, 30, 66, 0.04)" }}
        />
        <Bar dataKey="value" name="Count" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
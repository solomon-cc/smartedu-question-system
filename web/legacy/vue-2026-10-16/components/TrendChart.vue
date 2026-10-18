<script setup lang="ts">
import { computed } from 'vue';
import type { Point } from '../lib/types';
const props = defineProps<{ points: Point[]; label: string }>();
const max = computed(() => Math.max(1, ...props.points.map((p) => p.value)));
const coords = computed(() =>
  props.points
    .map(
      (p, i) =>
        `${32 + i * (536 / Math.max(1, props.points.length - 1))},${174 - (p.value / max.value) * 138}`,
    )
    .join(' '),
);
</script>
<template>
  <div class="trend-chart">
    <svg viewBox="0 0 600 220" role="img" :aria-label="label">
      <line
        v-for="n in 4"
        :key="n"
        x1="32"
        x2="568"
        :y1="36 + (n - 1) * 46"
        :y2="36 + (n - 1) * 46"
        stroke="currentColor"
        opacity=".08"
        stroke-dasharray="4 5"
      />
      <polygon
        :points="`32,174 ${coords} ${points.length > 1 ? 568 : 32},174`"
        fill="rgb(var(--v-theme-primary))"
        opacity=".07"
      />
      <polyline
        :points="coords"
        fill="none"
        stroke="rgb(var(--v-theme-primary))"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
      <g v-for="(p, i) in points" :key="i">
        <circle
          :cx="32 + i * (536 / Math.max(1, points.length - 1))"
          :cy="174 - (p.value / max) * 138"
          r="3"
          fill="rgb(var(--v-theme-primary))"
        >
          <title>{{ p.label }}：{{ p.value }}</title>
        </circle>
        <text
          v-if="i === 0 || i === points.length - 1 || points.length < 9"
          :x="32 + i * (536 / Math.max(1, points.length - 1))"
          y="205"
          text-anchor="middle"
          fill="currentColor"
          opacity=".5"
          font-size="10"
        >
          {{ p.label.slice(-5) }}
        </text>
      </g>
    </svg>
    <details class="chart-data">
      <summary>查看数据明细</summary>
      <v-table density="compact">
        <thead>
          <tr>
            <th>日期</th>
            <th>{{ label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(p, i) in points" :key="i">
            <td>{{ p.label }}</td>
            <td>{{ p.value }}</td>
          </tr>
        </tbody>
      </v-table>
    </details>
  </div>
</template>
<style scoped>
.trend-chart {
  padding: 20px 24px 12px;
}
svg {
  display: block;
  width: 100%;
  max-height: 290px;
}
.chart-data {
  font-size: 11px;
  opacity: 0.65;
  margin-top: 6px;
}
.chart-data summary {
  cursor: pointer;
}
</style>

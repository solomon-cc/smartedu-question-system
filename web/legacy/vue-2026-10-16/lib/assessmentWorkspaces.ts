import { defineAsyncComponent, type Component } from 'vue';
// Only trusted, locally bundled renderers can be selected by method metadata.
const workspaces: Record<string, Component> = {
  peak: defineAsyncComponent(() => import('../components/PeakAssessment.vue')),
  numeric: defineAsyncComponent(() => import('../components/GenericAssessment.vue')),
};
export const assessmentWorkspace = (renderer: string) => workspaces[renderer] || workspaces.numeric;

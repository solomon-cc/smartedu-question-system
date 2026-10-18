<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import { IslandButton, IslandCard, IslandDialog } from './island';
import { editingControl, focusEditingControl } from '../lib/focus';

const props = defineProps<{ dirty: boolean; busy?: boolean }>();
const confirming = ref(false);
const resumeEditing = ref(false);
let previousControl: HTMLElement | undefined;
function rememberFocus(event: FocusEvent) {
  const control = editingControl(event);
  if (control?.closest('[data-settings-editor]')) previousControl = control;
}
document.addEventListener('focusin', rememberFocus);
let pending: ((discard: boolean) => void) | undefined;
function confirm() {
  if (props.busy) return Promise.resolve(false);
  if (!props.dirty) return Promise.resolve(true);
  // An additional navigation attempt must not replace an unresolved decision.
  if (pending) return Promise.resolve(false);
  confirming.value = true;
  return new Promise<boolean>((resolve) => {
    pending = resolve;
  });
}
function resolve(discard: boolean) {
  resumeEditing.value = !discard;
  confirming.value = false;
  pending?.(discard);
  pending = undefined;
}
function restoreFocus() {
  if (resumeEditing.value) focusEditingControl('[data-settings-editor]', previousControl);
}
onBeforeRouteLeave(confirm);
onBeforeRouteUpdate(confirm);
function beforeUnload(event: BeforeUnloadEvent) {
  if (props.dirty || props.busy) {
    event.preventDefault();
    event.returnValue = '';
  }
}
window.addEventListener('beforeunload', beforeUnload);
onBeforeUnmount(() => {
  document.removeEventListener('focusin', rememberFocus);
  window.removeEventListener('beforeunload', beforeUnload);
  resolve(false);
});
defineExpose({ confirm });
</script>

<template>
  <IslandDialog
    :model-value="confirming"
    max-width="440"
    @update:model-value="resolve(false)"
    @after-leave="restoreFocus"
  >
    <IslandCard title="放弃未保存的修改？">
      <v-card-text>当前设置还未保存。可以继续编辑，或放弃本次修改。</v-card-text>
      <v-card-actions>
        <v-spacer />
        <IslandButton color="primary" variant="flat" @click="resolve(false)">继续编辑</IslandButton>
        <IslandButton color="error" @click="resolve(true)">放弃修改</IslandButton>
      </v-card-actions>
    </IslandCard>
  </IslandDialog>
</template>

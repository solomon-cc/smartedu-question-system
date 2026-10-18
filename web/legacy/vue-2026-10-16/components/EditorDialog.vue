<script setup lang="ts">
import { IslandButton, IslandCard, IslandDialog } from './island';
import { onBeforeUnmount, ref, useId } from 'vue';
import { editingControl, focusEditingControl } from '../lib/focus';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    dirty: boolean;
    saving?: boolean;
    maxWidth?: number | string;
  }>(),
  { maxWidth: 780 },
);
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
const confirming = ref(false);
const editorId = useId();
let previousControl: HTMLElement | undefined;
function rememberFocus(event: FocusEvent) {
  previousControl = editingControl(event) || previousControl;
}
function restoreFocus() {
  if (props.modelValue && !confirming.value)
    focusEditingControl(`[data-editor-id="${editorId}"] .v-overlay__content`, previousControl);
}
let pendingLeave: ((value: boolean) => void) | undefined;
function close() {
  if (props.saving) return;
  if (props.dirty) confirming.value = true;
  else emit('update:modelValue', false);
}
function resolve(discard: boolean) {
  confirming.value = false;
  if (discard) emit('update:modelValue', false);
  pendingLeave?.(discard);
  pendingLeave = undefined;
}
function guardNavigation() {
  if (!props.modelValue || !props.dirty) return true;
  if (props.saving) return false;
  confirming.value = true;
  return new Promise<boolean>((resolve) => {
    pendingLeave = resolve;
  });
}
onBeforeRouteLeave(guardNavigation);
onBeforeRouteUpdate(guardNavigation);
function beforeUnload(event: BeforeUnloadEvent) {
  if (props.modelValue && props.dirty) {
    event.preventDefault();
    event.returnValue = '';
  }
}
window.addEventListener('beforeunload', beforeUnload);
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnload);
  pendingLeave?.(false);
});
</script>
<template>
  <IslandDialog
    :model-value="modelValue"
    :max-width="maxWidth"
    :persistent="saving"
    scrollable
    class="editor-dialog"
    :data-editor-id="editorId"
    @focusin="rememberFocus"
    @update:model-value="close"
  >
    <slot :close="close" />
  </IslandDialog>
  <IslandDialog
    :model-value="confirming"
    max-width="440"
    @update:model-value="resolve(false)"
    @after-leave="restoreFocus"
  >
    <IslandCard title="放弃未保存的修改？">
      <v-card-text>当前内容还未保存。你可以继续编辑，或放弃本次修改。</v-card-text>
      <v-card-actions>
        <v-spacer />
        <IslandButton color="primary" variant="flat" @click="resolve(false)">继续编辑</IslandButton>
        <IslandButton color="error" @click="resolve(true)">放弃修改</IslandButton>
      </v-card-actions>
    </IslandCard>
  </IslandDialog>
</template>
<style scoped>
.editor-dialog :deep(.v-form) {
  overflow-y: auto;
  min-height: 0;
}
.editor-dialog :deep(.v-card-actions) {
  position: sticky;
  bottom: 0;
  background: rgb(var(--v-theme-surface));
  border-top: 1px solid rgba(var(--v-border-color), 0.12);
  z-index: 1;
}
</style>

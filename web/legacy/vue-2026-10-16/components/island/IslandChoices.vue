<script setup lang="ts">
import { computed, useId } from 'vue';
import type { Option } from '../../lib/types';
const props = withDefaults(
  defineProps<{
    modelValue: string | string[];
    options: Option[];
    multiple?: boolean;
    disabled?: boolean;
  }>(),
  { multiple: false, disabled: false },
);
const emit = defineEmits<{ 'update:modelValue': [value: string | string[]] }>();
const name = useId();
const hasImages = computed(() => props.options.some((option) => !!option.image));
function selected(value: string) {
  return props.multiple
    ? Array.isArray(props.modelValue) && props.modelValue.includes(value)
    : props.modelValue === value;
}
function choose(value: string) {
  if (props.disabled) return;
  if (!props.multiple) emit('update:modelValue', value);
  else {
    const current = Array.isArray(props.modelValue) ? props.modelValue : [];
    emit(
      'update:modelValue',
      selected(value) ? current.filter((v) => v !== value) : [...current, value],
    );
  }
}
</script>
<template>
  <fieldset class="island-choices" :class="{ 'with-images': hasImages }" :disabled="disabled">
    <legend class="choice-instruction">{{ multiple ? '选出所有合适的答案' : '选一个答案' }}</legend>
    <div class="choices-grid">
      <label
        v-for="option in options"
        :key="option.value"
        class="choice-tile"
        :class="{ selected: selected(option.value) }"
      >
        <input
          :type="multiple ? 'checkbox' : 'radio'"
          :name="name"
          :value="option.value"
          :checked="selected(option.value)"
          :disabled="disabled"
          @change="choose(option.value)"
        />
        <img
          v-if="option.image"
          :src="option.image"
          :alt="option.text || '选项图片'"
          class="choice-picture"
        />
        <span class="choice-caption">
          <span class="choice-marker" aria-hidden="true">
            <v-icon v-if="selected(option.value)" icon="mdi-check" size="20" />
          </span>
          <span>{{ option.text || option.value }}</span>
        </span>
      </label>
    </div>
  </fieldset>
</template>
<style scoped>
.island-choices {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}
.choice-instruction {
  font-size: 15px;
  color: var(--island-muted);
  margin-bottom: 12px;
  padding: 0;
}
.choices-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.choice-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 84px;
  gap: 14px;
  padding: 18px;
  border: 2px solid var(--island-border);
  border-radius: 24px;
  cursor: pointer;
  background: var(--island-surface);
  transition:
    background 0.2s,
    border-color 0.2s,
    transform 0.2s;
}
.choice-tile:hover {
  border-color: rgb(var(--v-theme-primary));
}
.choice-tile.selected {
  border-color: rgb(var(--v-theme-primary));
  background: var(--island-mint);
}
.choice-tile input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}
.choice-tile:has(input:focus-visible) {
  outline: 3px solid #f5c31c;
  outline-offset: 4px;
}
.choice-caption {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 21px;
  font-weight: 700;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.choice-marker {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 2px solid var(--island-border);
  border-radius: 12px;
  flex-shrink: 0;
  background: var(--island-content);
}
.selected .choice-marker {
  background: rgb(var(--v-theme-primary));
  border-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}
.choice-picture {
  width: 100%;
  height: 160px;
  object-fit: contain;
}
.island-choices:disabled .choice-tile {
  cursor: default;
}
@media (max-width: 599px) {
  .choices-grid {
    gap: 12px;
  }
  .choice-tile {
    min-height: 72px;
    padding: 14px;
    border-radius: 20px;
  }
  .choice-caption {
    font-size: 18px;
    gap: 10px;
  }
  .choice-marker {
    width: 26px;
    height: 26px;
  }
  .choice-picture {
    height: 116px;
  }
}
@media (max-width: 359px) {
  .choices-grid {
    grid-template-columns: 1fr;
  }
  .with-images .choices-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .with-images .choice-caption {
    font-size: 16px;
    gap: 6px;
  }
}
</style>

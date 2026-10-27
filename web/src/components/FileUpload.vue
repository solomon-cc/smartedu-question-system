<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import { IconUpload, IconCheckCircle } from '@arco-design/web-vue/es/icon';
import { uploadFile, validateUploadFile } from '../lib/uploads';
import { message } from '../lib/api';
const props = defineProps<{ modelValue: string; kind: string; disabled?: boolean }>(),
  emit = defineEmits<{ 'update:modelValue': [value: string]; busy: [value: boolean] }>(),
  busy = ref(false),
  progress = ref(0),
  error = ref(''),
  name = ref('');
let controller: AbortController | undefined;
async function select(e: Event) {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  input.value = '';
  if (!f || busy.value || props.disabled) return;
  name.value = f.name;
  try {
    validateUploadFile(f, props.kind);
  } catch (e) {
    error.value = message(e);
    return;
  }
  progress.value = 0;
  busy.value = true;
  emit('busy', true);
  error.value = '';
  const current = new AbortController();
  controller = current;
  try {
    const result = await uploadFile(f, current.signal, (p) => (progress.value = p));
    emit('update:modelValue', result.id);
  } catch (e) {
    error.value = current.signal.aborted
      ? '上传已暂停，重新选择同一文件即可继续。'
      : message(e) + '；重新选择同一文件可继续上传。';
    if (props.modelValue) error.value += ' 新文件尚未替换原文件。';
  } finally {
    busy.value = false;
    emit('busy', false);
  }
}
watch(
  () => props.modelValue,
  (value) => {
    if (!value && !busy.value) {
      name.value = '';
      error.value = '';
      progress.value = 0;
    }
  },
);
watch(
  () => props.kind,
  () => {
    name.value = '';
    error.value = '';
    progress.value = 0;
  },
);
onBeforeUnmount(() => controller?.abort());
</script>
<template>
  <div class="file-upload">
    <label class="file-picker" :class="{ disabled: busy || disabled }">
      <IconUpload />
      <span>{{ busy ? '正在上传…' : modelValue ? '更换文件' : '选择文件上传' }}</span>
      <input
        type="file"
        :disabled="busy || disabled"
        :aria-label="kind === 'video' ? '上传视频文件' : '上传文档文件'"
        :accept="kind === 'video' ? '.mp4,.webm,.mov' : '.pdf,.docx,.pptx,.txt'"
        @change="select"
      />
    </label>
    <small v-if="name">{{ error ? '本次选择：' : '' }}{{ name }}</small>
    <p v-if="modelValue && !busy" class="success-text">
      <IconCheckCircle />
      {{ error ? '原文件已保留' : '文件已保存' }}
    </p>
    <div v-if="busy">
      <a-progress :percent="progress / 100" />
      <a-button class="upload-pause" @click="controller?.abort()">暂停上传</a-button>
    </div>
    <p v-if="error" role="alert" class="error-text">{{ error }}</p>
    <small class="muted">最大 2GB · 支持断点续传，网络中断后重新选择原文件即可继续。</small>
  </div>
</template>
<style scoped>
.file-picker:focus-within {
  outline: 3px solid var(--brand);
  outline-offset: 4px;
}
.upload-pause {
  min-height: 44px;
}
</style>

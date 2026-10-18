<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';
import { IconUpload, IconCheckCircle } from '@arco-design/web-vue/es/icon';
import { uploadFile } from '../lib/uploads';
import { message } from '../lib/api';
const props = defineProps<{ modelValue: string; kind: string }>(),
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
  if (!f) return;
  name.value = f.name;
  busy.value = true;
  emit('busy', true);
  error.value = '';
  controller = new AbortController();
  try {
    const result = await uploadFile(f, controller.signal, (p) => (progress.value = p));
    emit('update:modelValue', result.id);
  } catch (e) {
    error.value = controller.signal.aborted
      ? '上传已暂停，重新选择同一文件即可继续。'
      : message(e) + '；重新选择同一文件可继续上传。';
  } finally {
    busy.value = false;
    emit('busy', false);
  }
}
onBeforeUnmount(() => controller?.abort());
</script>
<template>
  <div class="file-upload">
    <label class="file-picker" :class="{ disabled: busy }">
      <IconUpload />
      <span>{{ busy ? '正在上传…' : modelValue ? '更换文件' : '选择文件上传' }}</span>
      <input
        type="file"
        :disabled="busy"
        :accept="kind === 'video' ? '.mp4,.webm,.mov' : '.pdf,.docx,.pptx,.txt'"
        @change="select"
      />
    </label>
    <small v-if="name">{{ name }}</small>
    <p v-if="modelValue && !busy" class="success-text">
      <IconCheckCircle />
      文件已保存
    </p>
    <div v-if="busy">
      <a-progress :percent="progress / 100" />
      <a-button size="small" @click="controller?.abort()">暂停上传</a-button>
    </div>
    <p v-if="error" role="alert" class="error-text">{{ error }}</p>
    <small class="muted">最大 2GB · 支持断点续传，网络中断后重新选择原文件即可继续。</small>
  </div>
</template>

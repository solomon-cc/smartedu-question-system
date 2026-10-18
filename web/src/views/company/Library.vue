<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { companyGet } from '../../lib/companyApi';
import { gradeCardsFor } from '../../lib/catalog';
import type { Topic } from '../../lib/types';
import GradeCatalog from '../../components/GradeCatalog.vue';
import CompanyState from '../../components/CompanyState.vue';
const items = ref<Topic[]>([]),
  loading = ref(true),
  error = ref('');
const cards = computed(() => gradeCardsFor(items.value));
async function load() {
  loading.value = true;
  error.value = '';
  try {
    items.value = await companyGet<Topic[]>('catalog');
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败';
  } finally {
    loading.value = false;
  }
}
onMounted(load);
</script>
<template>
  <section class="container section">
    <div class="page-heading">
      <div>
        <span class="company-label">有方向的练习</span>
        <h1>题库</h1>
        <p>按年级和学科梳理知识点，让练习目标更清晰。</p>
      </div>
    </div>
    <CompanyState
      :loading="loading"
      :error="error"
      :empty="!cards.length"
      title="题库目录整理中"
      @retry="load"
    />
    <GradeCatalog v-if="!loading && !error" :cards="cards" login-links />
  </section>
</template>

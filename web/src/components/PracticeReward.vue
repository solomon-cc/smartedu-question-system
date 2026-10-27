<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import {
  IconStar,
  IconHeart,
  IconThumbUp,
  IconGift,
  IconClose,
} from '@arco-design/web-vue/es/icon';
import { rewardImage, type PracticeReward } from '../lib/rewards';
import RewardGame from './RewardGame.vue';
const props = defineProps<{ reward: PracticeReward }>();
const visible = ref(true),
  playing = ref(false),
  expired = ref(false),
  imageFailed = ref(false);
const symbol = computed(() =>
  props.reward.image === 'heart'
    ? IconHeart
    : props.reward.image === 'thumbs'
      ? IconThumbUp
      : props.reward.image === 'party'
        ? IconGift
        : IconStar,
);
let timer: ReturnType<typeof setTimeout>;
function closeGame() {
  playing.value = false;
  if (expired.value) visible.value = false;
}
onMounted(() => {
  timer = setTimeout(
    () => {
      expired.value = true;
      if (!playing.value) visible.value = false;
    },
    Math.max(1, Math.min(props.reward.duration || 3, 300)) * 1000,
  );
});
onBeforeUnmount(() => clearTimeout(timer));
</script>
<template>
  <section
    v-if="visible"
    class="practice-reward"
    :class="{ 'reward-animation': reward.type === 'animation' }"
    aria-label="练习鼓励"
  >
    <template v-if="reward.type !== 'text' && reward.type !== 'game'">
      <img
        v-if="rewardImage(reward.image) && !imageFailed"
        :src="reward.image"
        alt=""
        @error="imageFailed = true"
      />
      <component :is="symbol" v-else class="reward-symbol" aria-hidden="true" />
    </template>
    <div class="grow" role="status">
      <strong>{{ reward.name }}</strong>
      <p v-if="reward.prompt">{{ reward.prompt }}</p>
    </div>
    <a-button v-if="reward.type === 'game'" @click="playing = true">互动一下</a-button>
    <button class="reward-close" aria-label="收起鼓励" @click="visible = false">
      <IconClose />
    </button>
  </section>
  <a-modal
    :visible="playing"
    title="练习小休息"
    :footer="false"
    :mask-closable="false"
    @cancel="closeGame"
  >
    <RewardGame v-if="playing" :game="reward.image" @close="closeGame" />
  </a-modal>
</template>
<style scoped>
.practice-reward {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--soft);
  margin-top: 20px;
}
.practice-reward img {
  width: 64px;
  height: 64px;
  object-fit: contain;
}
.practice-reward p {
  margin: 4px 0 0;
  overflow-wrap: anywhere;
}
.reward-symbol {
  font-size: 40px;
  color: var(--brand);
  flex-shrink: 0;
}
.reward-close {
  display: grid;
  place-items: center;
  min-width: 44px;
  min-height: 44px;
  background: transparent;
  border: 0;
  color: var(--muted);
}
.reward-animation .reward-symbol {
  animation: reward-pulse 1s ease-in-out 2;
}
@keyframes reward-pulse {
  50% {
    transform: scale(1.15);
  }
}
@media (max-width: 540px) {
  .practice-reward {
    flex-wrap: wrap;
  }
}
@media (prefers-reduced-motion: reduce) {
  .reward-animation .reward-symbol {
    animation: none;
  }
}
</style>

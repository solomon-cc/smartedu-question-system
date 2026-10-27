<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import { IconStar, IconHeart } from '@arco-design/web-vue/es/icon';
import { rewardGames } from '../lib/rewards';
const props = defineProps<{ game?: string }>();
const mode = computed(() =>
  rewardGames.some((g) => g.value === props.game) ? props.game : 'breath',
);
const title = computed(() => rewardGames.find((g) => g.value === mode.value)?.label);
const emit = defineEmits<{ close: [] }>();
const done = ref(false),
  feedback = ref(''),
  ready = ref(false),
  started = ref(false);
const lit = ref(-1),
  showing = ref(false),
  step = ref(0);
const tapped = ref<number[]>([]),
  flipped = ref<number[]>([]),
  matched = ref<number[]>([]);
const cards = [0, 1, 1, 0],
  sequence = [0, 2, 1];
const timers: ReturnType<typeof setTimeout>[] = [];
function later(fn: () => void, ms: number) {
  timers.push(setTimeout(fn, ms));
}
function complete() {
  done.value = true;
  feedback.value = '已完成，可以继续练习。';
}
function reaction() {
  if (ready.value) {
    complete();
    return;
  }
  started.value = true;
  later(() => {
    ready.value = true;
  }, 1200);
}
function tap(i: number) {
  if (tapped.value.includes(i) || done.value) return;
  tapped.value.push(i);
  if (tapped.value.length === 3) complete();
}
function flip(i: number) {
  if (
    done.value ||
    matched.value.includes(i) ||
    flipped.value.includes(i) ||
    flipped.value.length === 2
  )
    return;
  flipped.value.push(i);
  if (flipped.value.length === 2) {
    if (cards[flipped.value[0]!] === cards[flipped.value[1]!]) {
      matched.value.push(...flipped.value);
      flipped.value = [];
      if (matched.value.length === cards.length) complete();
    } else
      later(() => {
        flipped.value = [];
      }, 700);
  }
}
function startSequence() {
  showing.value = true;
  started.value = true;
  sequence.forEach((n, i) => {
    later(() => {
      lit.value = n;
    }, i * 850);
    later(
      () => {
        lit.value = -1;
      },
      i * 850 + 650,
    );
  });
  later(() => {
    showing.value = false;
    ready.value = true;
    feedback.value = '按相同顺序点击图形。';
  }, sequence.length * 850);
}
function press(i: number) {
  if (!ready.value || showing.value || done.value) return;
  if (i !== sequence[step.value]) {
    step.value = 0;
    feedback.value = '可以再看一遍顺序。';
    ready.value = false;
    started.value = false;
    return;
  }
  step.value++;
  if (step.value === sequence.length) complete();
}
onBeforeUnmount(() => timers.forEach(clearTimeout));
</script>
<template>
  <section class="reward-game">
    <h3>{{ title }}</h3>
    <p v-if="mode === 'breath' && !done">跟着圆圈慢慢呼吸，准备好后继续练习。</p>
    <template v-if="mode === 'breath' && !done">
      <div class="breathing-circle" aria-hidden="true" />
      <a-button @click="complete">我准备好了</a-button>
    </template>
    <template v-else-if="mode === 'reaction' && !done">
      <p>等到出现“现在点击”时，点击按钮。</p>
      <a-button :disabled="started && !ready" type="primary" @click="reaction">
        {{ ready ? '现在点击' : started ? '等待信号' : '开始' }}
      </a-button>
    </template>
    <template v-else-if="mode === 'clicker'">
      <p>点亮三颗星星。</p>
      <div class="game-tiles">
        <button
          v-for="n in 3"
          :key="n"
          :aria-label="`点亮星星${n}`"
          :disabled="done || tapped.includes(n)"
          :class="{ lit: tapped.includes(n) }"
          @click="tap(n)"
        >
          <IconStar />
        </button>
      </div>
    </template>
    <template v-else-if="mode === 'math' && !done">
      <p>2 + 3 = ?</p>
      <div class="game-tiles">
        <button
          v-for="n in [4, 5, 6]"
          :key="n"
          @click="n === 5 ? complete() : (feedback = '再想一想。')"
        >
          {{ n }}
        </button>
      </div>
    </template>
    <template v-else-if="mode === 'memory'">
      <p>找到两组相同的图形。</p>
      <div class="game-tiles memory-tiles">
        <button
          v-for="(value, i) in cards"
          :key="i"
          :aria-label="`卡片${i + 1}${flipped.includes(i) || matched.includes(i) ? (value === 0 ? '星星' : '爱心') : ''}`"
          :disabled="done || matched.includes(i) || flipped.includes(i) || flipped.length === 2"
          @click="flip(i)"
        >
          <template v-if="flipped.includes(i) || matched.includes(i)">
            <IconStar v-if="value === 0" />
            <IconHeart v-else />
          </template>
          <span v-else>?</span>
        </button>
      </div>
    </template>
    <template v-else-if="mode === 'simon'">
      <p>看清亮起的顺序，再按相同顺序点击。</p>
      <a-button v-if="!started && !done" @click="startSequence">看一遍顺序</a-button>
      <div class="game-tiles">
        <button
          v-for="n in 3"
          :key="n"
          :aria-label="`图形${n}`"
          :class="{ lit: lit === n - 1 }"
          :disabled="!ready || showing || done"
          @click="press(n - 1)"
        >
          {{ n }}
        </button>
      </div>
    </template>
    <p role="status">{{ feedback }}</p>
    <a-button @click="emit('close')">返回练习</a-button>
  </section>
</template>
<style scoped>
.reward-game {
  display: grid;
  gap: 16px;
  text-align: center;
  justify-items: center;
}
h3 {
  font-size: 20px;
}
.game-tiles {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}
.game-tiles button {
  min-width: 64px;
  min-height: 64px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: white;
  color: var(--brand);
  font-size: 24px;
}
.game-tiles button:disabled {
  opacity: 0.65;
  cursor: default;
}
.game-tiles .lit {
  background: var(--brand);
  color: white;
  opacity: 1;
}
.memory-tiles {
  max-width: 160px;
}
.breathing-circle {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: var(--soft);
  border: 2px solid var(--brand);
  margin: 20px;
  animation: breathe 6s ease-in-out 2;
}
@keyframes breathe {
  50% {
    transform: scale(1.2);
  }
}
@media (prefers-reduced-motion: reduce) {
  .breathing-circle {
    animation: none;
  }
}
</style>

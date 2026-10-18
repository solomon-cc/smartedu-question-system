<script setup lang="ts">
import { IslandButton, IslandInput } from './island';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { rewardGames } from '../lib/rewards';
const props = defineProps<{ game: string }>();
const mode = computed(() =>
  rewardGames.some((g) => g.value === props.game) ? props.game : 'breath',
);
const title = computed(() => rewardGames.find((g) => g.value === mode.value)?.title);
const status = ref('idle'),
  feedback = ref(''),
  count = ref(0),
  remaining = ref(5),
  readyAt = ref(0),
  a = ref(1),
  b = ref(2),
  answer = ref('');
const cards = ref<number[]>([]),
  flipped = ref<number[]>([]),
  matched = ref<number[]>([]),
  sequence = ref<number[]>([]),
  step = ref(0),
  lit = ref(-1);
let timers: ReturnType<typeof setTimeout>[] = [];
let interval: ReturnType<typeof setInterval> | undefined;
function later(fn: () => void, ms: number) {
  const id = setTimeout(fn, ms);
  timers.push(id);
}
function reset() {
  timers.forEach(clearTimeout);
  timers = [];
  clearInterval(interval);
  count.value = 0;
  remaining.value = 5;
  feedback.value = '';
  status.value = 'idle';
  flipped.value = [];
  matched.value = [];
  step.value = 0;
  lit.value = -1;
  cards.value = [0, 0, 1, 1, 2, 2, 3, 3]
    .map((value) => ({ value, sort: Math.random() }))
    .sort((x, y) => x.sort - y.sort)
    .map((x) => x.value);
  newMath();
}
function reaction() {
  if (status.value === 'idle' || status.value === 'done') {
    status.value = 'waiting';
    feedback.value = '等待出现“现在点击”';
    later(
      () => {
        status.value = 'ready';
        readyAt.value = performance.now();
        feedback.value = '现在点击！';
      },
      1200 + Math.random() * 1800,
    );
  } else if (status.value === 'waiting') {
    timers.forEach(clearTimeout);
    status.value = 'done';
    feedback.value = '早了一点，再试一次吧。';
  } else if (status.value === 'ready') {
    feedback.value = `反应时间 ${Math.round(performance.now() - readyAt.value)} 毫秒`;
    status.value = 'done';
  }
}
function clicker() {
  if (status.value === 'done') return;
  if (status.value === 'idle') {
    status.value = 'playing';
    interval = setInterval(() => {
      remaining.value--;
      if (remaining.value <= 0) {
        clearInterval(interval);
        status.value = 'done';
        feedback.value = `完成了 ${count.value} 次点击，休息一下吧！`;
      }
    }, 1000);
  }
  count.value++;
}
function newMath() {
  a.value = Math.floor(Math.random() * 10);
  b.value = Math.floor(Math.random() * 10);
  answer.value = '';
}
function checkMath() {
  if (!answer.value.trim()) return;
  if (Number(answer.value) === a.value + b.value) {
    count.value++;
    feedback.value = '答对了！';
    newMath();
  } else feedback.value = '再想一想，你可以的。';
}
function flip(index: number) {
  if (matched.value.includes(index) || flipped.value.includes(index) || flipped.value.length >= 2)
    return;
  flipped.value.push(index);
  if (flipped.value.length === 2) {
    const [x, y] = flipped.value;
    if (cards.value[x!] === cards.value[y!]) {
      matched.value.push(x!, y!);
      flipped.value = [];
      if (matched.value.length === 8) feedback.value = '全部配对成功！';
    } else later(() => (flipped.value = []), 850);
  }
}
function playSequence() {
  status.value = 'showing';
  step.value = 0;
  feedback.value = '看清数字顺序，再按相同顺序点击。';
  sequence.value.push(Math.floor(Math.random() * 4));
  sequence.value.forEach((value, index) => {
    later(() => (lit.value = value), index * 850 + 200);
    later(() => (lit.value = -1), index * 850 + 750);
  });
  later(
    () => {
      status.value = 'playing';
      feedback.value = '轮到你了。';
    },
    sequence.value.length * 850 + 200,
  );
}
function pressTile(value: number) {
  if (status.value !== 'playing') return;
  if (value !== sequence.value[step.value]) {
    feedback.value = '再试一次吧！';
    sequence.value = [];
    status.value = 'idle';
    return;
  }
  step.value++;
  if (step.value === sequence.value.length) {
    count.value++;
    feedback.value = '记住了！';
    status.value = 'idle';
  }
}
onMounted(reset);
onBeforeUnmount(() => {
  timers.forEach(clearTimeout);
  clearInterval(interval);
});
</script>
<template>
  <section class="reward-game">
    <h2 class="mb-5">{{ title }}</h2>
    <template v-if="mode === 'reaction'">
      <IslandButton
        height="130"
        block
        :color="status === 'ready' ? 'success' : 'primary'"
        @click="reaction"
      >
        {{
          status === 'ready' ? '现在点击' : status === 'waiting' ? '等待信号' : '开始 / 再试一次'
        }}
      </IslandButton>
    </template>
    <template v-else-if="mode === 'clicker'">
      <p class="mb-5">剩余 {{ remaining }} 秒 · 已点击 {{ count }} 次</p>
      <IslandButton
        height="120"
        block
        color="primary"
        :disabled="status === 'done'"
        @click="clicker"
      >
        点一下
      </IslandButton>
      <IslandButton v-if="status === 'done'" variant="text" class="mt-4" @click="reset">
        再玩一次
      </IslandButton>
    </template>
    <template v-else-if="mode === 'math'">
      <h3 class="math-problem">{{ a }} + {{ b }} = ?</h3>
      <v-form @submit.prevent="checkMath">
        <IslandInput v-model="answer" label="答案" inputmode="numeric" />
        <IslandButton type="submit" color="primary">确认</IslandButton>
      </v-form>
      <p class="mt-4 muted">已答对 {{ count }} 题</p>
    </template>
    <template v-else-if="mode === 'memory'">
      <div class="game-grid">
        <IslandButton
          v-for="(card, index) in cards"
          :key="index"
          height="68"
          :aria-label="`卡片 ${index + 1}${matched.includes(index) ? '，已配对' : ''}`"
          :variant="matched.includes(index) ? 'tonal' : 'flat'"
          color="primary"
          @click="flip(index)"
        >
          {{ matched.includes(index) || flipped.includes(index) ? card + 1 : '?' }}
        </IslandButton>
      </div>
    </template>
    <template v-else-if="mode === 'simon'">
      <div class="game-grid">
        <IslandButton
          v-for="n in 4"
          :key="n"
          height="80"
          :variant="lit === n - 1 ? 'flat' : 'outlined'"
          color="primary"
          :disabled="status === 'showing'"
          @click="pressTile(n - 1)"
        >
          {{ n }}
        </IslandButton>
      </div>
      <IslandButton v-if="status === 'idle'" color="primary" class="mt-5" @click="playSequence">
        {{ sequence.length ? '下一轮' : '开始记忆' }}
      </IslandButton>
      <p class="muted mt-3">已完成 {{ count }} 轮</p>
    </template>
    <template v-else>
      <div class="breath-circle"><v-icon icon="mdi-weather-windy" size="45" /></div>
      <p class="mt-5">
        慢慢吸气，慢慢呼气。
        <br />
        按照自己的节奏，休息一小会儿。
      </p>
    </template>
    <p v-if="feedback" role="status" class="mt-5">{{ feedback }}</p>
  </section>
</template>
<style scoped>
.reward-game {
  text-align: center;
}
.game-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.math-problem {
  font-size: 32px;
  margin-bottom: 25px;
}
.breath-circle {
  width: 130px;
  height: 130px;
  border-radius: 50%;
  margin: 30px auto;
  background: rgba(var(--v-theme-primary), 0.12);
  display: grid;
  place-items: center;
  animation: breathe 8s ease-in-out infinite;
  color: rgb(var(--v-theme-primary));
}
@keyframes breathe {
  0%,
  100% {
    transform: scale(0.85);
  }
  50% {
    transform: scale(1.12);
  }
}
</style>

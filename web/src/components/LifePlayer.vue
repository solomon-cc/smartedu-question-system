<script setup lang="ts">
import { ref, computed } from 'vue';
import { api, ApiError, message } from '../lib/api';
import { auth } from '../lib/auth';
import { useLeaveGuard } from './useLeaveGuard';
import {
  centsFrom,
  yuan,
  type GameSession,
  type GameAction,
  type GameResult,
} from '../lib/lifeGames';
import ProductArt from './ProductArt.vue';
const props = defineProps<{ initial: GameSession }>();
const emit = defineEmits<{ close: []; updated: [GameSession] }>();
const session = ref(props.initial),
  busy = ref(false),
  error = ref(''),
  feedback = ref(''),
  amount = ref(''),
  pending = ref<GameAction | null>(null),
  previewActions = ref<GameAction[]>([]);
const level = computed(
  () => session.value.definition.levels.find((l) => l.id === session.value.levelId)!,
);
const step = computed(() => level.value.steps[session.value.state.step]);
const readOnly = computed(
  () =>
    session.value.status !== 'ongoing' ||
    (session.value.mode !== 'preview' &&
      session.value.actorId !== auth.user?.id &&
      auth.user?.role !== 'ADMIN'),
);
const locked = computed(() => busy.value || !!pending.value || readOnly.value);
const shopping = computed(() => ['shop', 'pack'].includes(step.value?.kind || ''));
const paid = computed(() =>
  level.value.wallet.reduce((n, m) => n + m.cents * (session.value.state.money[m.cents] || 0), 0),
);
const guard = useLeaveGuard(
  () => !!pending.value,
  () => busy.value,
);
async function close() {
  if (await guard.confirm()) emit('close');
}
async function act(action: GameAction, retry = false) {
  if (busy.value || readOnly.value || (pending.value && !retry)) return;
  const request = retry ? pending.value! : { ...action, requestId: crypto.randomUUID() };
  pending.value = request;
  busy.value = true;
  error.value = '';
  try {
    const result =
      session.value.mode === 'preview'
        ? await api<GameResult>(`/scenarios/${session.value.scenarioId}/preview`, 'POST', {
            levelId: session.value.levelId,
            actions: [...previewActions.value, request],
          })
        : await api<GameResult>(`/scenario-sessions/${session.value.id}/actions`, 'POST', request);
    if (session.value.mode === 'preview') previewActions.value.push(request);
    if (result.session.state.step !== session.value.state.step) amount.value = '';
    session.value = result.session;
    feedback.value = result.feedback;
    pending.value = null;
    emit('updated', result.session);
  } catch (e) {
    error.value = message(e);
    if (e instanceof ApiError && [200, 400, 403, 404].includes(e.status)) pending.value = null;
  } finally {
    busy.value = false;
  }
}
async function answer() {
  const value = centsFrom(amount.value);
  if (value === null) {
    error.value = '请输入有效金额，最多两位小数';
    return;
  }
  await act({ kind: 'answer', value });
}
const itemName = (id: string) => session.value.items.find((i) => i.id === id)?.name || id;
</script>
<template>
  <section class="life-player">
    <div class="page-heading">
      <div>
        <h1>{{ session.scenarioName }}</h1>
        <p>
          {{ level.name }}
          <span v-if="session.mode === 'preview'">· 预览，不保存学习记录</span>
        </p>
      </div>
      <a-button :disabled="busy" @click="close">返回生活</a-button>
    </div>
    <a-alert v-if="error" type="error" class="mb-24">
      {{ error }}
      <a-button v-if="pending" :loading="busy" @click="act(pending!, true)">重试本次操作</a-button>
    </a-alert>
    <div class="task-progress">
      <span>
        {{
          session.state.finished
            ? '已完成'
            : `${Math.min(session.state.step + 1, level.steps.length)} / ${level.steps.length} · ${step?.title}`
        }}
      </span>
      <a-progress :percent="session.state.step / level.steps.length" :show-text="false" />
    </div>
    <template v-if="session.state.finished || readOnly">
      <div class="task-complete">
        <h2>{{ session.state.finished ? '本次任务已完成' : '练习记录（只读）' }}</h2>
        <p>
          {{ session.events.filter((e) => e.kind !== 'hint' && !e.correct).length }} 次需重试 ·
          {{ session.events.filter((e) => e.kind === 'hint').length }} 次提示
        </p>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>步骤</th>
              <th>记录</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(event, index) in session.events" :key="index">
              <td>{{ level.steps.find((s) => s.id === event.stepId)?.title || event.stepId }}</td>
              <td>
                {{
                  event.kind === 'hint' ? '查看提示' : event.correct ? '完成操作' : event.feedback
                }}
              </td>
              <td>{{ new Date(event.at).toLocaleTimeString('zh-CN') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
    <template v-else-if="step">
      <div class="task-instruction">
        <h2>{{ step.prompt }}</h2>
        <a-button :disabled="locked" @click="act({ kind: 'hint' })">提示</a-button>
      </div>
      <p v-if="feedback" class="task-feedback" role="status">{{ feedback }}</p>
      <div v-if="shopping" class="task-columns">
        <section class="task-list">
          <h3>物品清单</h3>
          <ul>
            <li v-for="target in level.targets" :key="target.itemId">
              {{ itemName(target.itemId) }}
              <strong>× {{ target.quantity }}</strong>
            </li>
          </ul>
        </section>
        <section class="task-shelf">
          <h3>{{ session.definition.environment === 'schoolbag' ? '准备物品' : '选择物品' }}</h3>
          <div class="object-grid">
            <article v-for="item in session.items" :key="item.id">
              <ProductArt :art="item.art" :image="item.image" />
              <strong>{{ item.name }}</strong>
              <span v-if="item.price">¥{{ yuan(Math.round(item.price * 100)) }}</span>
              <div class="object-quantity">
                <button
                  :disabled="locked || !(session.state.cart[item.id] > 0)"
                  :aria-label="'取出' + item.name"
                  @click="act({ kind: 'remove', itemId: item.id })"
                >
                  −
                </button>
                <output :aria-label="item.name + '已选数量'">
                  {{ session.state.cart[item.id] || 0 }}
                </output>
                <button
                  :disabled="locked || session.state.cart[item.id] >= 9"
                  :aria-label="'放入' + item.name"
                  @click="act({ kind: 'add', itemId: item.id })"
                >
                  ＋
                </button>
              </div>
            </article>
          </div>
          <a-button
            type="primary"
            size="large"
            :loading="busy"
            :disabled="locked"
            @click="act({ kind: 'check' })"
          >
            核对清单
          </a-button>
        </section>
      </div>
      <form
        v-else-if="['total', 'change'].includes(step.kind)"
        class="task-answer"
        @submit.prevent="answer"
      >
        <div class="receipt">
          <span
            v-for="item in session.items.filter((i) => session.state.cart[i.id] > 0)"
            :key="item.id"
          >
            {{ item.name }} × {{ session.state.cart[item.id] }}
            <strong>¥{{ yuan(Math.round(item.price * 100) * session.state.cart[item.id]) }}</strong>
          </span>
          <span v-if="step.kind === 'change'">
            已付款
            <strong>¥{{ yuan(session.state.paidCents) }}</strong>
          </span>
        </div>
        <label>
          金额（元）
          <input
            v-model="amount"
            inputmode="decimal"
            maxlength="12"
            :disabled="locked"
            aria-label="金额（元）"
          />
        </label>
        <a-button type="primary" html-type="submit" :disabled="locked" :loading="busy">
          确认金额
        </a-button>
      </form>
      <div v-else-if="step.kind === 'pay'" class="task-answer">
        <p>
          应付 ¥{{ yuan(session.state.totalCents) }} · 已付 ¥{{ yuan(paid) }} · 预算 ¥{{
            yuan(level.budgetCents)
          }}
        </p>
        <div class="money-list">
          <article v-for="money in level.wallet" :key="money.cents">
            <strong>¥{{ yuan(money.cents) }}</strong>
            <span>可用 {{ money.count }} 张</span>
            <div class="object-quantity">
              <button
                :disabled="locked || !(session.state.money[money.cents] > 0)"
                :aria-label="'取回' + yuan(money.cents) + '元'"
                @click="act({ kind: 'money-remove', value: money.cents })"
              >
                −
              </button>
              <output>{{ session.state.money[money.cents] || 0 }}</output>
              <button
                :disabled="locked || (session.state.money[money.cents] || 0) >= money.count"
                :aria-label="'支付' + yuan(money.cents) + '元'"
                @click="act({ kind: 'money-add', value: money.cents })"
              >
                ＋
              </button>
            </div>
          </article>
        </div>
        <a-button type="primary" :disabled="locked" :loading="busy" @click="act({ kind: 'check' })">
          确认付款
        </a-button>
      </div>
      <div v-else-if="step.kind === 'choice'" class="choice-list">
        <button
          v-for="choice in step.choices"
          :key="choice.id"
          :disabled="locked"
          @click="act({ kind: 'choice', choiceId: choice.id })"
        >
          <ProductArt :art="choice.art" />
          <span>{{ choice.label }}</span>
        </button>
      </div>
      <a-button
        v-else-if="step.kind === 'ack'"
        type="primary"
        size="large"
        :disabled="locked"
        :loading="busy"
        @click="act({ kind: 'check' })"
      >
        继续
      </a-button>
      <a-alert v-else type="warning">当前步骤暂不支持，请联系老师。</a-alert>
    </template>
  </section>
</template>
<style scoped>
.task-progress {
  display: flex;
  gap: 24px;
  align-items: center;
  margin: 16px 0 24px;
  font-size: 14px;
  color: var(--muted);
}
.task-progress > .arco-progress {
  max-width: 240px;
}
.task-instruction {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
.task-instruction h2 {
  font-size: 22px;
}
.task-feedback {
  margin: 16px 0;
  color: var(--brand);
  padding: 12px 16px;
  background: var(--soft);
  border-radius: 6px;
}
.task-columns {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 24px;
}
.task-list {
  padding: 20px;
  background: var(--soft);
  border-radius: 6px;
  align-self: start;
}
.task-list ul {
  list-style: none;
  padding: 0;
  margin-top: 16px;
}
.task-list li {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  gap: 12px;
}
.task-shelf h3 {
  margin-bottom: 16px;
}
.object-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(168px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.object-grid article,
.money-list article {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 6px;
  gap: 8px;
}
.object-grid :deep(.product-art) {
  width: 80px;
  height: 80px;
  object-fit: contain;
}
.object-quantity {
  display: flex;
  align-items: center;
  gap: 12px;
}
.object-quantity button {
  min-width: 44px;
  min-height: 44px;
  border: 1px solid var(--line);
  background: white;
  color: var(--brand);
  border-radius: 6px;
  font-size: 20px;
}
.object-quantity output {
  min-width: 20px;
  text-align: center;
}
.task-answer {
  max-width: 680px;
}
.task-answer label {
  display: grid;
  gap: 8px;
  margin: 24px 0;
  max-width: 260px;
}
.task-answer input {
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-size: 20px;
  width: 100%;
}
.receipt {
  display: grid;
  gap: 12px;
  max-width: 400px;
}
.receipt > span {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}
.money-list {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin: 24px 0;
}
.choice-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  max-width: 760px;
}
.choice-list button {
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: white;
  padding: 20px;
  font-size: 17px;
  text-align: left;
  min-height: 80px;
}
.choice-list :deep(.product-art) {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
}
.task-complete {
  padding: 20px 0;
}
.task-complete h2 {
  font-size: 22px;
}
.task-complete p {
  color: var(--muted);
  margin-top: 8px;
}
button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
button:focus-visible,
input:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 3px;
}
button:not(:disabled):hover {
  border-color: var(--brand);
}
@media (max-width: 800px) {
  .task-columns {
    grid-template-columns: 1fr;
  }
  .task-list ul {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 24px;
  }
  .task-list li {
    gap: 16px;
  }
}
@media (max-width: 540px) {
  .choice-list {
    grid-template-columns: 1fr;
  }
  .task-instruction h2 {
    font-size: 19px;
  }
  .task-progress {
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>

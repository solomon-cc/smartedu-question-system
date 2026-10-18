<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { ApiError, request } from '../lib/api';
import { messageOf } from '../lib/types';
import { auth } from '../stores/auth';
import {
  centsFrom,
  yuan,
  type GameAction,
  type GameResult,
  type GameSession,
} from '../lib/lifeGames';
import { useSceneDrag, type SceneToken } from '../lib/sceneDrag';
import ProductArt from './ProductArt.vue';
const props = defineProps<{ initial: GameSession }>(),
  emit = defineEmits<{ close: []; updated: [GameSession] }>();
const session = ref(props.initial),
  busy = ref(false),
  error = ref(''),
  feedback = ref(''),
  amount = ref(''),
  paused = ref(false),
  hint = ref(''),
  selected = ref<SceneToken | null>(null),
  calculator = ref(false);
const previewActions = ref<GameAction[]>([]),
  pending = ref<GameAction | null>(null);
const level = computed(
  () => session.value.definition.levels.find((l) => l.id === session.value.levelId)!,
);
const step = computed(() => level.value.steps[session.value.state.step]);
const environment = computed(() => session.value.definition.environment),
  bag = computed(() => environment.value === 'schoolbag');
const cart = computed(() => session.value.items.filter((i) => session.value.state.cart[i.id] > 0));
const readOnly = computed(
  () =>
    session.value.status !== 'ongoing' ||
    (session.value.mode !== 'preview' &&
      session.value.actorId !== auth.user?.id &&
      auth.user?.role !== 'ADMIN'),
);
const locked = computed(() => busy.value || paused.value || readOnly.value || !!pending.value);
const paid = computed(() =>
  level.value.wallet.reduce((n, m) => n + m.cents * (session.value.state.money[m.cents] || 0), 0),
);
const targets = computed(() =>
  level.value.targets.map((t) => ({
    ...t,
    item: session.value.items.find((i) => i.id === t.itemId)!,
  })),
);
const collectedCount = computed(
  () =>
    targets.value.filter((target) => session.value.state.cart[target.itemId] === target.quantity)
      .length,
);
const matches = computed(
  () =>
    level.value.targets.every((t) => session.value.state.cart[t.itemId] === t.quantity) &&
    cart.value.every((i) => level.value.targets.some((t) => t.itemId === i.id)),
);
const shopping = computed(() => ['shop', 'pack'].includes(step.value?.kind || ''));
const calculating = computed(() => ['total', 'change'].includes(step.value?.kind || ''));
const paying = computed(() => step.value?.kind === 'pay');
const basketName = computed(() =>
  bag.value ? '书包' : environment.value === 'cafe' ? '托盘' : '购物篮',
);
const prompt = computed(() =>
  shopping.value
    ? `把清单上的物品拖进${basketName.value}。`
    : step.value?.prompt || '本次任务完成了。',
);
const canSpeak = 'speechSynthesis' in window;
async function act(action: GameAction, retry = false): Promise<boolean> {
  if (busy.value || readOnly.value || paused.value || (!retry && pending.value)) return false;
  const send = retry ? pending.value! : { ...action, requestId: crypto.randomUUID() };
  if (!send) return false;
  pending.value = send;
  busy.value = true;
  error.value = '';
  let ok = false;
  try {
    const before = session.value.state.step;
    const result =
      session.value.mode === 'preview'
        ? await request<GameResult>(`/scenarios/${session.value.scenarioId}/preview`, 'POST', {
            levelId: session.value.levelId,
            actions: [...previewActions.value, send],
          })
        : await request<GameResult>(`/scenario-sessions/${session.value.id}/actions`, 'POST', send);
    if (session.value.mode === 'preview') previewActions.value.push(send);
    session.value = result.session;
    selected.value = null;
    pending.value = null;
    ok = true;
    feedback.value = result.correct
      ? result.session.state.finished
        ? '任务完成！'
        : send.kind === 'add'
          ? `已经放进${basketName.value}。`
          : send.kind === 'money-add'
            ? '钱已交到收银台。'
            : ''
      : result.feedback;
    if (send.kind === 'hint') hint.value = result.feedback;
    if (before !== session.value.state.step) {
      amount.value = '';
      hint.value = '';
      calculator.value = false;
    }
    emit('updated', session.value);
  } catch (e) {
    error.value = messageOf(e);
    if (e instanceof ApiError && [200, 400, 403, 404].includes(e.status)) pending.value = null;
  } finally {
    busy.value = false;
  }
  if (ok && !readOnly.value) {
    if (step.value?.kind === 'ack') await act({ kind: 'check' });
    else if (bag.value && step.value?.kind === 'pack' && matches.value && send.kind === 'add')
      await act({ kind: 'check' });
    else if (
      paying.value &&
      send.kind === 'money-add' &&
      paid.value >= session.value.state.totalCents &&
      paid.value <= level.value.budgetCents
    )
      await act({ kind: 'check' });
  }
  return ok;
}
async function drop(token: SceneToken, zone: string) {
  if (locked.value) return;
  if (token.kind === 'item' && shopping.value) {
    if (token.from === 'shelf' && zone === 'basket') {
      await act({ kind: 'add', itemId: token.id });
      return;
    }
    if (token.from === 'basket' && zone === 'shelf') {
      await act({ kind: 'remove', itemId: token.id });
      return;
    }
  }
  if (token.kind === 'basket' && zone === 'checkout' && shopping.value) {
    await act({ kind: 'check' });
    return;
  }
  if (token.kind === 'money' && paying.value) {
    if (token.from === 'wallet' && zone === 'checkout') {
      await act({ kind: 'money-add', value: token.cents });
      return;
    }
    if (token.from === 'paid' && zone === 'wallet') {
      await act({ kind: 'money-remove', value: token.cents });
      return;
    }
  }
  feedback.value = zone ? '把物品放到亮起的位置。' : '还没有放入，拖到目标位置再松手。';
  selected.value = null;
}
const drag = useSceneDrag(
  (token, zone) => {
    void drop(token, zone);
  },
  () => !locked.value,
);
function choose(token: SceneToken) {
  if (drag.consumeClick() || locked.value) return;
  if (bag.value && token.kind === 'basket') {
    feedback.value = '把清单物品拖进书包，装齐以后一起检查。';
    return;
  }
  if (token.kind === 'item' && token.from === 'shelf' && selected.value?.from === 'basket') {
    void drop(selected.value, 'shelf');
    return;
  }
  selected.value = token;
  feedback.value =
    token.kind === 'basket'
      ? '再点收银台，把购物篮送过去。'
      : token.kind === 'money'
        ? token.from === 'paid'
          ? '再点钱包，把这张钱取回来。'
          : '再点收银台交钱，或把钱拖过去。'
        : token.from === 'basket'
          ? '再点货架，把这件物品取出来。'
          : `再点${basketName.value}放入，也可以直接拖过去。`;
}
function destination(zone: string) {
  if (drag.consumeClick() || locked.value) return;
  if (selected.value) {
    void drop(selected.value, zone);
    return;
  }
  if (zone === 'checkout' && calculating.value) calculator.value = true;
  else if (zone === 'checkout' && shopping.value)
    feedback.value = `先把清单物品放进${basketName.value}，再把${basketName.value}拖过来。`;
}
function key(value: string) {
  if (locked.value) return;
  if (value === '←') {
    amount.value = amount.value.slice(0, -1);
    return;
  }
  if (value === '.' && (amount.value.includes('.') || !amount.value)) return;
  if (
    amount.value.length < 8 &&
    (!amount.value.includes('.') || amount.value.split('.')[1].length < 2)
  )
    amount.value += value;
}
async function answer() {
  const value = centsFrom(amount.value);
  if (value === null) {
    feedback.value = '先输入金额，再交给收银员。';
    return;
  }
  await act({ kind: 'answer', value });
}
function speak() {
  if (!canSpeak) return;
  window.speechSynthesis.cancel();
  const s = new SpeechSynthesisUtterance(prompt.value);
  s.lang = 'zh-CN';
  s.rate = 0.85;
  window.speechSynthesis.speak(s);
}
function pause() {
  drag.cancel();
  paused.value = true;
  window.speechSynthesis?.cancel();
}
function itemOf(id?: string) {
  return session.value.items.find((i) => i.id === id);
}
const activeToken = computed(() =>
  drag.dragging.value?.moved ? drag.dragging.value.token : selected.value,
);
function lit(zone: string) {
  return (
    drag.hover.value === zone ||
    (activeToken.value?.kind === 'item' &&
      (activeToken.value.from === 'shelf' ? zone === 'basket' : zone === 'shelf')) ||
    (activeToken.value?.kind === 'basket' && zone === 'checkout') ||
    (activeToken.value?.kind === 'money' &&
      (activeToken.value.from === 'wallet' ? zone === 'checkout' : zone === 'wallet'))
  );
}
function settle() {
  if (readOnly.value) return;
  if (
    step.value?.kind === 'ack' ||
    (bag.value && step.value?.kind === 'pack' && matches.value) ||
    (paying.value &&
      paid.value >= session.value.state.totalCents &&
      paid.value <= level.value.budgetCents)
  )
    void act({ kind: 'check' });
}
function resume() {
  paused.value = false;
  settle();
}
onMounted(settle);
onBeforeUnmount(() => window.speechSynthesis?.cancel());
</script>
<template>
  <div class="life-player" :class="{ preview: session.mode === 'preview' }">
    <header class="game-hud">
      <button class="hud-back" :disabled="busy" @click="emit('close')">
        <v-icon icon="mdi-arrow-left" />
        <span>{{ session.mode === 'preview' ? '退出预览' : '保存退出' }}</span>
      </button>
      <div>
        <strong>{{ session.scenarioName }}</strong>
        <small>{{ session.mode === 'preview' ? '老师预览 · 不保存记录' : level.name }}</small>
      </div>
      <button class="hud-icon" aria-label="暂停练习" @click="pause">
        <v-icon icon="mdi-pause" />
      </button>
    </header>
    <main
      class="play-world"
      :class="environment"
      :style="{ '--scene-image': `url(${session.definition.background})` }"
      aria-label="生活游戏场景"
    >
      <div class="world-light" aria-hidden="true" />
      <aside class="mission-note" aria-label="图片任务清单">
        <div class="mission-heading">
          <strong>
            {{ bag ? '今天带上' : environment === 'cafe' ? '今天想点' : '今天买这些' }}
          </strong>
          <span>{{ collectedCount }} / {{ targets.length }} 已备齐</span>
        </div>
        <div class="mission-items">
          <div
            v-for="target in targets"
            :key="target.itemId"
            :class="{ collected: session.state.cart[target.itemId] === target.quantity }"
          >
            <ProductArt :art="target.item.art" :image="target.item.image" />
            <span>{{ target.item.name }} × {{ target.quantity }}</span>
            <b v-if="session.state.cart[target.itemId] === target.quantity" aria-label="已放齐">
              <v-icon icon="mdi-check" size="14" />
            </b>
          </div>
        </div>
        <div v-if="!session.state.finished" class="scene-caption" role="status">
          {{ feedback || prompt }}
        </div>
      </aside>
      <div class="world-tools">
        <button class="hud-icon" :disabled="!canSpeak" aria-label="读出任务" @click="speak">
          <v-icon icon="mdi-volume-high" />
        </button>
        <button
          class="hud-icon"
          :disabled="locked"
          aria-label="请求提示"
          @click="act({ kind: 'hint' })"
        >
          <v-icon icon="mdi-lightbulb-outline" />
        </button>
      </div>
      <section
        v-if="shopping"
        class="shelves"
        data-dropzone="shelf"
        :class="{ 'drop-lit': lit('shelf') }"
        aria-label="货架，点选可将篮中物品取回"
        tabindex="0"
        role="button"
        @click.self="destination('shelf')"
        @keydown.enter.self="destination('shelf')"
        @keydown.space.prevent.self="destination('shelf')"
      >
        <button
          v-for="item in session.items"
          :key="item.id"
          class="scene-product draggable"
          :class="{ picked: selected?.id === item.id && selected.from === 'shelf' }"
          :disabled="locked"
          :aria-label="`拖动${item.name}${!bag ? '，' + item.price + '元' : ''}到${basketName}`"
          @pointerdown="drag.start($event, { kind: 'item', id: item.id, from: 'shelf' })"
          @pointermove="drag.move"
          @pointerup="drag.end"
          @pointercancel="drag.cancel"
          @lostpointercapture="drag.cancel"
          @click.stop="choose({ kind: 'item', id: item.id, from: 'shelf' })"
        >
          <ProductArt :art="item.art" :image="item.image" />
          <span>
            {{ item.name }}
            <small v-if="!bag">¥{{ yuan(Math.round(item.price * 100)) }}</small>
          </span>
        </button>
      </section>
      <div
        v-if="!session.state.finished"
        class="basket-area"
        :class="{ 'drop-lit': lit('basket'), ready: matches, many: cart.length > 3 }"
        data-dropzone="basket"
      >
        <button
          class="basket-object draggable"
          :disabled="locked || !shopping"
          :aria-label="bag ? '书包，点选可放入清单物品' : `将${basketName}拖到收银台`"
          @pointerdown="drag.start($event, { kind: 'basket' })"
          @pointermove="drag.move"
          @pointerup="drag.end"
          @pointercancel="drag.cancel"
          @click="selected?.kind === 'item' ? destination('basket') : choose({ kind: 'basket' })"
        >
          <svg v-if="!bag" viewBox="0 0 210 130" aria-hidden="true">
            <path
              d="M31 54L63 15M179 54L147 15"
              fill="none"
              stroke="#537466"
              stroke-width="11"
              stroke-linecap="round"
            />
            <path
              d="M12 50H198L181 116Q105 131 30 116Z"
              fill="#dcaf71"
              stroke="#94724d"
              stroke-width="5"
            />
            <path
              d="M18 56H191M51 65L58 105M88 65L91 111M126 65L123 111M165 65L156 105"
              stroke="#b88b52"
              stroke-width="7"
              stroke-linecap="round"
            />
          </svg>
          <svg v-else viewBox="0 0 160 180" aria-hidden="true">
            <path d="M53 32V19Q80 3 106 19V32" fill="none" stroke="#55796b" stroke-width="9" />
            <rect
              x="21"
              y="34"
              width="119"
              height="136"
              rx="30"
              fill="#789f8f"
              stroke="#466e5e"
              stroke-width="5"
            />
            <rect x="37" y="108" width="85" height="46" rx="12" fill="#c5d3b5" />
            <path d="M39 79H119" stroke="#f1dfb1" stroke-width="5" />
          </svg>
          <strong>{{ basketName }}</strong>
          <small>
            {{
              shopping
                ? matches
                  ? bag
                    ? '清单齐了'
                    : '拖到收银台结账'
                  : '把物品拖进来'
                : '本次已选物品'
            }}
          </small>
        </button>
        <div class="basket-contents" :class="{ many: cart.length > 3 }">
          <button
            v-for="item in cart"
            :key="item.id"
            class="basket-item draggable"
            :disabled="locked || !shopping"
            :aria-label="`把${item.name}从${basketName}拖回货架`"
            @pointerdown="drag.start($event, { kind: 'item', id: item.id, from: 'basket' })"
            @pointermove="drag.move"
            @pointerup="drag.end"
            @pointercancel="drag.cancel"
            @click="choose({ kind: 'item', id: item.id, from: 'basket' })"
          >
            <ProductArt :art="item.art" :image="item.image" />
            <b>× {{ session.state.cart[item.id] }}</b>
          </button>
        </div>
      </div>
      <button
        v-if="!bag && !session.state.finished"
        class="checkout-zone"
        :class="{ 'drop-lit': lit('checkout'), inviting: matches && shopping }"
        data-dropzone="checkout"
        :disabled="locked"
        :aria-label="calculating ? '打开收银台计算金额' : '收银台，放入购物篮或钱币'"
        @click="destination('checkout')"
      >
        <div class="cash-register">
          <svg viewBox="0 0 140 100" aria-hidden="true">
            <path d="M18 32H109L130 92H7Z" fill="#6a8271" stroke="#425d4e" stroke-width="4" />
            <rect
              x="31"
              y="7"
              width="70"
              height="43"
              rx="5"
              fill="#395449"
              stroke="#93aa8d"
              stroke-width="4"
            />
            <path
              d="M32 60H104M38 72H112"
              stroke="#e8ddba"
              stroke-width="8"
              stroke-dasharray="9 6"
            />
          </svg>
          <strong>{{ calculating ? '点收银机算一算' : paying ? '把钱拖到这里' : '收银台' }}</strong>
          <div v-if="paying" class="checkout-amounts">
            <span>应付 ¥{{ yuan(session.state.totalCents) }}</span>
            <span>已交 ¥{{ yuan(paid) }}</span>
          </div>
        </div>
      </button>
      <div
        v-if="paying"
        class="wallet-area"
        :class="{ 'drop-lit': lit('wallet') }"
        data-dropzone="wallet"
        role="button"
        tabindex="0"
        aria-label="钱包，可放回已交钱币"
        @click.self="destination('wallet')"
        @keydown.enter.self="destination('wallet')"
      >
        <strong>
          我的钱包
          <small>预算 ¥{{ yuan(level.budgetCents) }}</small>
        </strong>
        <div class="banknotes">
          <button
            v-for="money in level.wallet"
            :key="money.cents"
            class="banknote draggable"
            :class="{ coin: money.cents < 100 }"
            :disabled="locked || (session.state.money[money.cents] || 0) >= money.count"
            :aria-label="`拖动${yuan(money.cents)}元到收银台`"
            @pointerdown="drag.start($event, { kind: 'money', cents: money.cents, from: 'wallet' })"
            @pointermove="drag.move"
            @pointerup="drag.end"
            @pointercancel="drag.cancel"
            @click="choose({ kind: 'money', cents: money.cents, from: 'wallet' })"
          >
            <strong>¥{{ yuan(money.cents) }}</strong>
            <small>剩 {{ money.count - (session.state.money[money.cents] || 0) }}</small>
          </button>
        </div>
        <div class="paid-money">
          <button
            v-for="money in level.wallet.filter((m) => session.state.money[m.cents] > 0)"
            :key="money.cents"
            class="draggable"
            :disabled="locked"
            :aria-label="`将${yuan(money.cents)}元退回钱包`"
            @pointerdown="drag.start($event, { kind: 'money', cents: money.cents, from: 'paid' })"
            @pointermove="drag.move"
            @pointerup="drag.end"
            @pointercancel="drag.cancel"
            @click="choose({ kind: 'money', cents: money.cents, from: 'paid' })"
          >
            已交 ¥{{ yuan(money.cents) }} × {{ session.state.money[money.cents] }}
          </button>
        </div>
      </div>
      <div v-if="step?.kind === 'choice' && !session.state.finished" class="speech-panel">
        <div class="speech-label">
          <ProductArt art="cashier" />
          <strong>{{ step.prompt }}</strong>
        </div>
        <div class="speech-options">
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
      </div>
      <section
        v-if="calculator && calculating"
        class="counter-calculator"
        aria-label="收银台金额计算"
      >
        <div class="calculator-heading">
          <strong>{{ step?.kind === 'change' ? '核对找零' : '算一算总价' }}</strong>
          <button class="hud-icon" aria-label="暂时收起计算器" @click="calculator = false">
            <v-icon icon="mdi-close" />
          </button>
        </div>
        <div class="calculator-layout">
          <div class="game-receipt">
            <p v-if="step?.kind === 'change'">
              付出 ¥{{ yuan(session.state.paidCents) }} − 总价 ¥{{ yuan(session.state.totalCents) }}
            </p>
            <p v-else v-for="item in cart" :key="item.id">
              {{ item.name }}
              <span>
                ¥{{ yuan(Math.round(item.price * 100)) }} × {{ session.state.cart[item.id] }}
              </span>
            </p>
            <output aria-live="polite">¥ {{ amount || '?' }}</output>
            <p v-if="feedback" role="status">{{ feedback }}</p>
          </div>
          <div class="money-keypad">
            <button
              v-for="k in ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '←']"
              :key="k"
              :disabled="locked"
              :aria-label="k === '←' ? '删除一位' : k"
              @click="key(k)"
            >
              {{ k }}
            </button>
            <button class="amount-submit" :disabled="locked || !amount" @click="answer">
              {{ step?.kind === 'change' ? '核对找零' : '告诉收银员' }}
            </button>
          </div>
        </div>
      </section>
      <div v-if="error" class="scene-error" role="alert">
        <p>{{ error }}</p>
        <button v-if="pending" :disabled="busy" @click="act({ kind: 'retry' }, true)">
          重试这次操作
        </button>
        <button v-else @click="error = ''">知道了</button>
      </div>
      <div v-if="busy" class="saving-indicator" role="status">
        {{ session.mode === 'preview' ? '正在核对…' : '正在保存…' }}
      </div>
      <div v-if="session.state.finished" class="game-complete">
        <ProductArt art="checklist" />
        <h1>生活任务完成了！</h1>
        <p v-if="!bag">
          本次总价 ¥{{ yuan(session.state.totalCents) }} · 付款 ¥{{ yuan(session.state.paidCents) }}
        </p>
        <p>下次带着同样的图片清单，在生活中试试。</p>
        <button class="complete-button" @click="emit('close')">收好物品，完成</button>
        <details>
          <summary>真实场景练习建议</summary>
          <p v-for="text in session.definition.transfer" :key="text">{{ text }}</p>
        </details>
      </div>
    </main>
    <Teleport to="body">
      <div
        v-if="drag.dragging.value?.moved"
        class="drag-ghost"
        :style="{ left: drag.dragging.value.x + 'px', top: drag.dragging.value.y + 'px' }"
      >
        <ProductArt
          v-if="drag.dragging.value.token.kind === 'item'"
          :art="itemOf(drag.dragging.value.token.id)?.art"
          :image="itemOf(drag.dragging.value.token.id)?.image"
        />
        <div v-else-if="drag.dragging.value.token.kind === 'money'" class="ghost-money">
          ¥{{ yuan(drag.dragging.value.token.cents!) }}
        </div>
        <svg v-else viewBox="0 0 210 130" aria-hidden="true">
          <path d="M31 54L63 15M179 54L147 15" fill="none" stroke="#537466" stroke-width="11" />
          <path
            d="M12 50H198L181 116Q105 131 30 116Z"
            fill="#dcaf71"
            stroke="#94724d"
            stroke-width="5"
          />
        </svg>
      </div>
    </Teleport>
    <v-dialog :model-value="!!hint" max-width="440" @update:model-value="hint = ''">
      <v-card class="game-dialog pa-6" theme="light">
        <h2>一起看看</h2>
        <p class="my-5">{{ hint }}</p>
        <v-btn color="primary" @click="hint = ''">回到场景</v-btn>
      </v-card>
    </v-dialog>
    <v-dialog v-model="paused" persistent max-width="400">
      <v-card class="game-dialog pa-6" theme="light">
        <h2>休息一下</h2>
        <p class="my-5">进度会保留。准备好再回来。</p>
        <v-btn color="primary" @click="resume">继续游戏</v-btn>
        <v-btn variant="text" :disabled="busy" @click="emit('close')">
          {{ session.mode === 'preview' ? '退出预览' : '保存退出' }}
        </v-btn>
      </v-card>
    </v-dialog>
  </div>
</template>
<style scoped>
/* Adapted from animal-island-ui's MIT tokens; see public/licenses/animal-island-ui.txt.
   Retain product icons and accessible dialogs. The primary follows our brand for contrast. */
.life-player,
.game-dialog,
.drag-ghost {
  --animal-font: Nunito, 'Noto Sans SC', -apple-system, 'PingFang SC', sans-serif;
  --animal-primary: #315e4c;
  --animal-primary-hover: #3d725b;
  --animal-primary-bg: #e6f9f6;
  --animal-text: #315e4c;
  --animal-text-body: #34483e;
  --animal-text-muted: #536b5d;
  --animal-bg: #ffffff;
  --animal-bg-content: #eef5f1;
  --animal-border: #ccddd3;
  --animal-radius-sm: 12px;
  --animal-radius: 18px;
  --animal-radius-lg: 24px;
  --animal-radius-pill: 50px;
  --animal-shadow-btn: #a6bfb1;
  --animal-ease: cubic-bezier(0.4, 0, 0.2, 1);
  --animal-duration: 0.25s;
  color: var(--animal-text-body);
  font-family: var(--animal-font);
  font-weight: 500;
}
/* Reset browser chrome on native pointer/keyboard drag surfaces. */
button {
  appearance: none;
  -webkit-appearance: none;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: 1.5;
}

.life-player {
  height: 100dvh;
  height: 100svh;
  max-height: 100dvh;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  background: var(--animal-bg-content);
  color: var(--animal-text-body);
  padding-top: env(safe-area-inset-top);
}
@supports (height: 100dvh) {
  .life-player {
    height: 100dvh;
  }
}
.game-hud {
  min-height: 56px;
  padding: 4px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: var(--animal-bg);
  border-bottom: 1px solid var(--animal-border);
  z-index: 4;
}
.game-hud > div {
  text-align: center;
  display: grid;
  gap: 2px;
  min-width: 0;
}
.game-hud strong {
  font-size: 16px;
}
.game-hud small {
  font-size: 12px;
  color: var(--animal-text-muted);
}
.hud-back,
.hud-icon {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--animal-primary);
  cursor: pointer;
}
.hud-icon {
  min-width: 44px;
  border-radius: 50%;
}
.hud-back {
  font-weight: 600;
  font-size: 14px;
}
.hud-icon:hover {
  background: var(--animal-primary-bg);
}
.play-world {
  position: relative;
  min-height: 0;
  overflow: hidden;
  isolation: isolate;
  background: #eef5f1 var(--scene-image) center/cover no-repeat;
  padding-bottom: env(safe-area-inset-bottom);
}
.world-light {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #ffffff30 0%, transparent 40%, #315e4c08 100%);
  pointer-events: none;
  z-index: -1;
}
.mission-note {
  position: absolute;
  top: 16px;
  left: 24px;
  max-width: 400px;
  width: 38%;
  padding: 12px 16px;
  background: var(--animal-bg);
  border: 1px solid var(--animal-border);
  border-radius: var(--animal-radius-sm);
  box-shadow: none;
  z-index: 3;
}
.mission-heading strong {
  font-size: 14px;
}
.mission-items {
  display: flex;
  gap: 12px;
  margin-top: 6px;
}
.mission-items > div {
  display: grid;
  grid-template-columns: 38px 1fr;
  align-items: center;
  gap: 2px 6px;
  position: relative;
  font-size: 12px;
  min-width: 0;
}
.mission-items .product-art {
  width: 38px;
  height: 42px;
}
.mission-items b {
  position: absolute;
  right: -8px;
  top: 0;
  background: var(--animal-primary);
  color: #fff;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  text-align: center;
}
.world-tools {
  position: absolute;
  right: 16px;
  top: 16px;
  z-index: 8;
  display: flex;
  gap: 8px;
}
.world-tools button {
  background: var(--animal-bg);
  border: 1px solid var(--animal-border);
}

.scene-caption {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: var(--animal-radius-sm);
  background: var(--animal-bg-content);
  color: var(--animal-text-body);
  font-size: 14px;
  line-height: 1.5;
  text-align: left;
  pointer-events: none;
}
.shelves {
  position: absolute;
  top: max(24%, 194px);
  left: 19%;
  width: 55%;
  height: 37%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 8% 12%;
  border-radius: var(--animal-radius);
  z-index: 5;
}
.scene-product {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: end;
  min-width: 0;
  border-radius: var(--animal-radius-sm);
  position: relative;
  transition:
    filter var(--animal-duration) var(--animal-ease),
    background var(--animal-duration) var(--animal-ease);
}
.scene-product .product-art {
  width: 88%;
  height: calc(100% - 28px);
  max-height: 115px;
  filter: drop-shadow(0 4px 2px #60442d30);
  pointer-events: none;
}
.scene-product > span {
  font-weight: 600;
  font-size: 14px;
  background: var(--animal-bg-content);
  border: 1px solid var(--animal-border);
  border-radius: var(--animal-radius-pill);
  padding: 3px 8px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  pointer-events: none;
}
.scene-product small {
  font-size: 12px;
}
.draggable {
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  cursor: grab;
}
.draggable:active {
  cursor: grabbing;
  filter: brightness(1.05);
}
.picked {
  background: #e6f9f6b3;
  outline: 3px dashed #3c7256;
  outline-offset: 3px;
}
.drop-lit {
  outline: 4px dashed #437c5d !important;
  outline-offset: 4px;
  background-color: #e6f9f680 !important;
}
.basket-area {
  position: absolute;
  bottom: max(16px, env(safe-area-inset-bottom));
  left: 12%;
  width: 35%;
  height: 26%;
  border-radius: var(--animal-radius-lg);
  z-index: 3;
}
.basket-object {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: end;
  flex-direction: column;
  padding: 0 8px 4px;
  width: 100%;
  color: var(--animal-text);
}
.basket-object svg {
  position: absolute;
  width: 100%;
  height: 90%;
  top: -3%;
  left: 0;
  pointer-events: none;
}
.basket-object strong,
.basket-object small {
  z-index: 2;
  position: relative;
  background: var(--animal-bg-content);
  padding: 2px 8px;
  border-radius: var(--animal-radius-pill);
  font-size: 14px;
}
.basket-object small {
  font-size: 12px;
  margin-top: 3px;
}
.basket-contents {
  position: absolute;
  top: 6%;
  left: 10%;
  right: 10%;
  display: flex;
  justify-content: center;
  gap: 6px;
  z-index: 4;
  pointer-events: none;
}
.basket-contents.many {
  display: grid;
  grid-template-columns: repeat(3, minmax(44px, 1fr));
  gap: 4px;
}
.basket-contents.many .basket-item {
  width: 100%;
  height: 44px;
}
.basket-contents.many .product-art {
  height: 34px;
}
.basket-area.many .basket-object small {
  display: none;
}
.basket-item {
  position: relative;
  width: 60px;
  height: 80px;
  pointer-events: auto;
  flex-shrink: 1;
  min-width: 44px;
}
.basket-item .product-art {
  height: 65px;
  width: 100%;
  pointer-events: none;
}
.basket-item b {
  position: absolute;
  right: 0;
  bottom: 2px;
  font-size: 12px;
  padding: 1px 5px;
  background: var(--animal-bg);
  border-radius: var(--animal-radius-pill);
  pointer-events: none;
}
.checkout-zone {
  position: absolute;
  right: 4%;
  bottom: 8%;
  width: 21%;
  height: 48%;
  z-index: 2;
  display: grid;
  align-content: end;
  justify-items: center;
  border-radius: var(--animal-radius);
  cursor: pointer;
}

.cash-register {
  background: #ccaf7b;
  border: 5px solid #9b7c50;
  border-radius: var(--animal-radius-sm);
  padding: 10px 16px 14px;
  display: grid;
  place-items: center;
  width: 100%;
  pointer-events: none;
}
.cash-register svg {
  width: 110px;
  height: 86px;
}
.cash-register strong {
  font-size: 14px;
  background: var(--animal-bg-content);
  padding: 4px 8px;
  border-radius: var(--animal-radius-pill);
  text-align: center;
}
.cash-register span {
  font-size: 12px;
  padding-top: 6px;
  background: var(--animal-bg-content);
  text-align: center;
  width: 100%;
}
.inviting .cash-register {
  border-color: var(--animal-primary);
}
.wallet-area {
  position: absolute;
  left: 12%;
  right: 38%;
  top: 28%;
  padding: 20px;
  border: 4px solid var(--animal-border);
  background: var(--animal-bg-content);
  border-radius: var(--animal-radius-lg);
  z-index: 4;
  max-height: 51%;
  overflow: auto;
}
.wallet-area > strong {
  display: flex;
  justify-content: space-between;
  font-size: 16px;
  margin-bottom: 16px;
}
.wallet-area small {
  font-size: 12px;
}
.banknotes {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.banknote {
  min-width: 100px;
  min-height: 76px;
  background: #dce3bd;
  border: 3px double #7f9260;
  border-radius: var(--animal-radius-sm);
  padding: 12px;
  display: grid;
  place-items: center;
  color: #385342;
}
.banknote strong {
  font-size: 24px;
}
.banknote small {
  font-size: 12px;
}
.coin {
  background: #edd39b;
  border-radius: 50%;
  min-width: 76px;
}
.banknote:disabled {
  opacity: 0.45;
  cursor: default;
}
.paid-money {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 12px;
}
.paid-money button {
  min-height: 44px;
  padding: 8px;
  background: var(--animal-bg-content);
  border-radius: var(--animal-radius-sm);
  font-size: 12px;
}
.speech-panel {
  position: absolute;
  top: 24%;
  left: 16%;
  right: 30%;
  max-height: 64%;
  overflow: auto;
  background: var(--animal-bg);
  border: 2px solid var(--animal-border);
  border-radius: var(--animal-radius-lg);
  padding: 16px;
  z-index: 7;
}
.speech-label {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.speech-label .product-art {
  width: 64px;
  height: 64px;
}
.speech-label strong {
  font-size: 18px;
}
.speech-options {
  display: flex;
  gap: 12px;
}
.speech-options button {
  display: grid;
  justify-items: center;
  gap: 8px;
  min-height: 100px;
  flex: 1;
  padding: 12px;
  background: var(--animal-bg-content);
  border: 1px solid var(--animal-border);
  border-radius: var(--animal-radius-sm);
  font-size: 14px;
  cursor: pointer;
}
.speech-options .product-art {
  width: 60px;
  height: 60px;
}
.counter-calculator {
  position: absolute;
  left: 16%;
  right: 30%;
  top: 24%;
  max-height: 70%;
  overflow: auto;
  background: var(--animal-bg);
  border: 3px solid var(--animal-border);
  border-radius: var(--animal-radius-lg);
  padding: 16px;
  z-index: 8;
}
.calculator-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 18px;
  margin-bottom: 8px;
}
.calculator-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.game-receipt p {
  font-size: 14px;
  display: flex;
  gap: 8px;
  justify-content: space-between;
  margin: 8px 0;
}
.game-receipt output {
  display: block;
  border-top: 1px dashed var(--animal-border);
  margin-top: 12px;
  padding: 12px 0;
  font-size: 30px;
  font-weight: 700;
  color: var(--animal-primary);
}
.money-keypad {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.money-keypad button {
  min-height: 44px;
  border: 1px solid var(--animal-border);
  background: var(--animal-bg-content);
  border-radius: var(--animal-radius-sm);
  font-size: 22px;
  cursor: pointer;
}
.money-keypad .amount-submit {
  grid-column: 1/-1;
  background: var(--animal-primary);
  color: #fff;
  font-size: 14px;
  min-height: 48px;
}
.scene-error {
  position: absolute;
  top: 18%;
  left: 12px;
  right: 12px;
  padding: 16px;
  border-radius: var(--animal-radius-sm);
  border: 1px solid #aa3939;
  background: #fff0f2;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
  font-size: 14px;
}
.scene-error button {
  padding: 8px;
  min-height: 44px;
  border-radius: var(--animal-radius-sm);
  background: #f8dce2;
  white-space: nowrap;
}
.saving-indicator {
  position: absolute;
  bottom: 8px;
  left: 8px;
  font-size: 12px;
  color: #4d624c;
  background: var(--animal-bg);
  padding: 4px 8px;
  border-radius: var(--animal-radius-sm);
  z-index: 9;
}
.game-complete {
  position: absolute;
  inset: 14% 24%;
  padding: 24px;
  background: #fffffff5;
  border: 2px solid var(--animal-border);
  border-radius: var(--animal-radius-lg);
  text-align: center;
  overflow: auto;
  z-index: 10;
}
.game-complete > .product-art {
  width: 100px;
  height: 100px;
  margin: auto;
}
.game-complete h1 {
  font-size: 26px;
  margin: 16px 0;
}
.game-complete p {
  font-size: 14px;
  line-height: 1.7;
  margin-top: 12px;
}
.complete-button {
  min-height: 48px;
  padding: 12px 24px;
  border-radius: var(--animal-radius-pill);
  background: var(--animal-primary);
  color: #fff;
  margin-top: 24px;
  cursor: pointer;
}
.game-complete details {
  text-align: left;
  font-size: 12px;
  margin-top: 20px;
}
.game-complete summary {
  min-height: 44px;
  display: flex;
  align-items: center;
  cursor: pointer;
}
.cafe .shelves {
  top: 24%;
  left: 25%;
  width: 48%;
  height: 38%;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 8% 14%;
}
.schoolbag .shelves {
  top: 36%;
  left: 17%;
  width: 58%;
  height: 25%;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  grid-template-rows: 1fr;
  gap: 8px;
}
.schoolbag .scene-product > span {
  font-size: 12px;
  white-space: nowrap;
}
.schoolbag .basket-area {
  left: auto;
  right: 8%;
  width: 27%;
  height: 30%;
}
button:focus-visible,
[role='button']:focus-visible {
  outline: 3px solid var(--animal-primary);
  outline-offset: 3px;
}
button:disabled {
  cursor: default;
}
.drag-ghost {
  position: fixed;
  width: 90px;
  height: 105px;
  transform: translate(-50%, -80%);
  pointer-events: none;
  z-index: 10000;
  filter: drop-shadow(0 8px 5px #433c3a45);
}
.drag-ghost .product-art {
  width: 100%;
  height: 100%;
}
.drag-ghost svg {
  width: 100%;
  height: 100%;
}
.ghost-money {
  padding: 18px;
  background: #dce3bd;
  border: 3px double #7f9260;
  font-size: 26px;
  border-radius: var(--animal-radius-sm);
  color: #385342;
  text-align: center;
}
@media (max-width: 650px) {
  .game-hud {
    min-height: 52px;
    padding: 4px 8px;
  }
  .hud-back {
    font-size: 12px;
  }
  .hud-back .v-icon {
    font-size: 20px;
  }
  .game-hud strong {
    font-size: 14px;
  }
  .game-hud small {
    font-size: 12px;
  }
  .play-world {
    background-size: cover;
    background-position: 48% center;
  }
  .mission-note {
    top: 12px;
    left: 12px;
    width: calc(100% - 120px);
    max-width: none;
    padding: 8px 10px;
  }
  .mission-heading strong {
    font-size: 12px;
  }
  .mission-items {
    gap: 8px;
    margin-top: 3px;
  }
  .mission-items > div {
    grid-template-columns: 28px 1fr;
    font-size: 12px;
    gap: 3px;
  }
  .mission-items .product-art {
    width: 28px;
    height: 32px;
  }
  .mission-items b {
    right: -4px;
    width: 15px;
    height: 15px;
    font-size: 12px;
  }
  .world-tools {
    top: 12px;
    right: 8px;
    gap: 4px;
  }

  .shelves {
    top: 28%;
    left: 8%;
    width: 65%;
    height: 37%;
    gap: 8% 6%;
  }
  .scene-product .product-art {
    height: calc(100% - 25px);
    max-height: 92px;
    width: 100%;
  }
  .scene-product > span {
    font-size: 12px;
    gap: 5px;
    padding: 2px 5px;
    white-space: nowrap;
  }
  .scene-product small {
    font-size: 12px;
  }
  .basket-area {
    left: 6%;
    width: 52%;
    height: 27%;
    min-height: 140px;
    bottom: max(12px, env(safe-area-inset-bottom));
  }
  .basket-object strong {
    font-size: 13px;
  }
  .basket-object small {
    font-size: 12px;
  }
  .basket-item {
    width: 48px;
    height: 64px;
  }
  .basket-item .product-art {
    height: 50px;
  }
  .basket-contents {
    top: 8%;
    left: 12%;
    right: 12%;
    gap: 4px;
  }
  .checkout-zone {
    right: 4%;
    width: 32%;
    height: 30%;
    bottom: 4%;
  }

  .cash-register {
    padding: 8px 5px 10px;
    border-width: 3px;
  }
  .cash-register svg {
    width: 76px;
    height: 61px;
  }
  .cash-register strong {
    font-size: 12px;
    padding: 4px;
  }
  .cash-register span {
    font-size: 12px;
    line-height: 1.5;
  }
  .wallet-area {
    top: 30%;
    left: 4%;
    right: 38%;
    max-height: 43%;
    padding: 12px;
    border-width: 3px;
    border-radius: var(--animal-radius);
  }
  .wallet-area > strong {
    display: grid;
    gap: 4px;
    font-size: 14px;
    margin-bottom: 8px;
  }
  .banknotes {
    gap: 8px;
  }
  .banknote {
    min-width: 66px;
    min-height: 64px;
    padding: 6px;
    flex: 1;
  }
  .banknote strong {
    font-size: 20px;
  }
  .coin {
    min-width: 56px;
  }
  .speech-panel {
    top: auto;
    bottom: max(16px, env(safe-area-inset-bottom));
    left: 12px;
    right: 12px;
    max-height: 58%;
    padding: 12px;
    border-radius: var(--animal-radius);
  }
  .speech-label {
    gap: 8px;
    margin-bottom: 12px;
  }
  .speech-label .product-art {
    width: 46px;
    height: 46px;
  }
  .speech-label strong {
    font-size: 15px;
  }
  .speech-options {
    display: grid;
    gap: 8px;
  }
  .speech-options button {
    display: flex;
    align-items: center;
    justify-content: start;
    gap: 12px;
    min-height: 56px;
    padding: 8px 12px;
    font-size: 14px;
    text-align: left;
  }
  .speech-options .product-art {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
  }
  .counter-calculator {
    top: auto;
    bottom: max(12px, env(safe-area-inset-bottom));
    left: 12px;
    right: 12px;
    max-height: 72%;
    padding: 12px;
    border-radius: var(--animal-radius);
  }
  .calculator-heading {
    font-size: 16px;
    margin: 0;
  }
  .calculator-layout {
    gap: 12px;
    grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  }
  .game-receipt p {
    font-size: 12px;
    flex-wrap: wrap;
    gap: 4px;
  }
  .game-receipt output {
    font-size: 25px;
  }
  .money-keypad {
    gap: 8px;
  }
  .money-keypad button {
    font-size: 20px;
    min-height: 44px;
  }
  .money-keypad .amount-submit {
    font-size: 12px;
  }
  .cafe .shelves {
    top: 28%;
    left: 10%;
    width: 62%;
    height: 33%;
    gap: 8% 18%;
  }
  .schoolbag .shelves {
    top: 29%;
    left: 8%;
    width: 70%;
    height: 35%;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: repeat(2, minmax(0, 1fr));
    gap: 8% 10%;
  }
  .schoolbag .basket-area {
    right: 7%;
    width: 43%;
    height: 27%;
    bottom: 4%;
  }
  .game-complete {
    inset: 16% 12px 5%;
    padding: 20px;
  }
  .game-complete h1 {
    font-size: 23px;
  }
}
@media (max-height: 540px) and (min-width: 651px) {
  .game-hud {
    min-height: 44px;
  }
  .mission-note {
    top: 8px;
    padding: 6px 12px;
  }

  .shelves {
    top: 24%;
    height: 40%;
  }
  .scene-product .product-art {
    max-height: 76px;
  }
  .basket-area {
    height: 28%;
    bottom: 4px;
  }
  .checkout-zone {
    bottom: 4%;
    height: 52%;
  }

  .cash-register svg {
    height: 55px;
    width: 76px;
  }
  .cash-register {
    padding: 5px;
  }
  .counter-calculator {
    top: 20%;
    max-height: 76%;
    padding: 8px;
  }
  .money-keypad {
    gap: 4px;
  }
  .money-keypad button {
    min-height: 44px;
  }
  .game-complete {
    inset: 5% 20%;
    padding: 12px;
  }
  .game-complete > .product-art {
    width: 60px;
    height: 60px;
  }
  .game-complete h1 {
    margin: 8px 0;
  }
  .complete-button {
    margin-top: 12px;
  }
}
@media (max-width: 370px) {
  .mission-items > div {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .mission-items .product-art {
    height: 24px;
  }
  .mission-note {
    width: calc(100% - 112px);
  }
  .shelves {
    width: 69%;
    left: 5%;
  }
  .scene-product > span {
    gap: 4px;
    padding: 2px 3px;
  }
  .basket-object small {
    font-size: 12px;
  }
}

.game-hud .hud-back {
  border-radius: var(--animal-radius-pill);
  padding: 8px 12px;
}
.game-hud .hud-icon {
  background: var(--animal-bg-content);
  color: var(--animal-primary);
}
.mission-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px 12px;
}
.mission-heading span {
  font-size: 12px;
  color: var(--animal-text-body);
  white-space: nowrap;
}
.mission-items {
  flex-wrap: wrap;
  gap: 8px;
}
.mission-items > div {
  border: 1px solid var(--animal-border);
  border-radius: var(--animal-radius-sm);
  padding: 4px 8px 4px 4px;
  background: var(--animal-bg-content);
}
.mission-items .collected {
  border-color: var(--animal-primary);
  background: var(--animal-primary-bg);
}
.mission-items b {
  display: grid;
  place-items: center;
  right: -4px;
  top: -4px;
}
.scene-product,
.basket-object,
.basket-item,
.checkout-zone {
  border: 0;
  background: transparent;
}
.scene-product > span {
  min-height: 28px;
  align-items: center;
}
.basket-object {
  border-radius: var(--animal-radius-lg);
}
.basket-object strong,
.basket-object small,
.cash-register strong {
  padding-inline: 12px;
}
.picked {
  background: var(--animal-primary-bg);
  outline-color: var(--animal-primary);
}
.drop-lit {
  outline-color: var(--animal-primary) !important;
}
.hud-back,
.hud-icon,
.speech-options button,
.money-keypad button,
.complete-button {
  transition:
    background var(--animal-duration) var(--animal-ease),
    transform var(--animal-duration) var(--animal-ease);
}
.money-keypad .amount-submit,
.complete-button {
  border-radius: var(--animal-radius-pill);
  border: 0;
  box-shadow: 0 4px 0 var(--animal-shadow-btn);
  margin-bottom: 4px;
}
.money-keypad .amount-submit:active:not(:disabled),
.complete-button:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow: 0 1px 0 var(--animal-shadow-btn);
}
.hud-back:disabled,
.hud-icon:disabled,
.money-keypad button:disabled,
.speech-options button:disabled {
  opacity: 0.5;
}
.game-dialog {
  border: 1px solid var(--animal-border);
  background: var(--animal-bg);
  border-radius: var(--animal-radius-lg);
  box-shadow: none;
  line-height: 1.6;
}
.game-dialog :deep(.v-btn) {
  border-radius: var(--animal-radius-pill);
  min-height: 44px;
}
.checkout-amounts {
  display: grid;
  gap: 2px;
  padding-top: 6px;
  width: 100%;
}
.cash-register .checkout-amounts span {
  padding: 0;
  background: transparent;
  white-space: nowrap;
}
@media (min-width: 651px) and (max-width: 1100px) {
  .mission-note {
    width: 43%;
    max-width: 380px;
  }
}
@media (hover: hover) and (pointer: fine) {
  .game-hud .hud-back:hover {
    background: var(--animal-bg-content);
  }
  .scene-product:hover:not(:disabled) {
    filter: brightness(1.08);
  }
  .money-keypad button:hover:not(:disabled) {
    background: var(--animal-primary-bg);
  }
  .money-keypad .amount-submit:hover:not(:disabled),
  .complete-button:hover:not(:disabled) {
    background: var(--animal-primary-hover);
  }
}
@media (max-width: 650px) {
  .mission-note {
    width: calc(100% - 24px);
    padding: 8px 10px;
  }
  .mission-heading {
    min-height: 40px;
    margin-right: 104px;
    align-content: center;
    gap: 0 8px;
  }
  .mission-items {
    gap: 8px;
    margin-top: 4px;
  }
  .mission-items > div {
    grid-template-columns: 28px 1fr;
    padding: 3px 6px 3px 3px;
  }
  .mission-items span {
    white-space: nowrap;
  }
  .world-tools {
    gap: 8px;
    right: 22px;
    top: 20px;
  }

  .shelves,
  .cafe .shelves,
  .schoolbag .shelves {
    top: max(28%, 188px);
    height: min(34%, calc(100% - 348px));
  }
  .scene-product {
    min-height: 44px;
  }
  .cash-register strong {
    padding-inline: 6px;
  }
}

/* On short landscape screens, reserve a guidance lane instead of covering the shelves. */
@media (max-height: 540px) and (min-width: 651px) {
  .mission-note {
    left: 12px;
    width: 27%;
    max-width: none;
    padding: 8px;
  }
  .mission-heading strong {
    font-size: 12px;
  }
  .mission-items > div {
    grid-template-columns: 24px 1fr;
    padding: 3px;
  }
  .mission-items .product-art {
    width: 24px;
    height: 28px;
  }
  .scene-caption {
    font-size: 12px;
    padding: 8px;
  }
  .shelves,
  .cafe .shelves,
  .schoolbag .shelves {
    left: 32%;
    width: 42%;
    top: 20%;
    height: 45%;
    gap: 8% 8%;
  }
  .schoolbag .shelves {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: repeat(2, minmax(0, 1fr));
  }
  .basket-area,
  .schoolbag .basket-area {
    left: 34%;
    right: auto;
    width: 28%;
    height: 28%;
    bottom: 4px;
  }
}
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
  }
}
</style>

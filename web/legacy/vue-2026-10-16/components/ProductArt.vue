<script setup lang="ts">
defineProps<{ art?: string; image?: string }>();
</script>
<template>
  <img v-if="image" :src="image" alt="" class="product-art" />
  <svg v-else class="product-art" viewBox="0 0 100 100" aria-hidden="true">
    <ellipse cx="50" cy="91" rx="29" ry="5" fill="#3f4e45" opacity=".12" />
    <g v-if="art === 'apple'">
      <path
        d="M50 31Q13 11 14 53Q16 94 47 83Q77 97 87 59Q93 18 56 30"
        fill="#cf6457"
        stroke="#88483f"
        stroke-width="2"
      />
      <path d="M49 31Q47 18 53 10" fill="none" stroke="#76513c" stroke-width="5" />
      <path d="M54 21Q65 1 82 14Q70 29 54 21" fill="#648663" />
      <path
        d="M27 39Q19 51 24 65"
        fill="none"
        stroke="#e6a494"
        stroke-width="6"
        stroke-linecap="round"
      />
    </g>
    <g v-else-if="art === 'milk'">
      <path d="M27 28L37 11H63L74 28V88H27Z" fill="#fdf8e8" stroke="#82998e" stroke-width="2" />
      <path d="M27 28H74V40H27Z" fill="#719fa5" />
      <path d="M37 11L48 28H74M48 28V88" fill="none" stroke="#bfcfc6" stroke-width="2" />
      <path d="M31 54H69V76H31Z" fill="#72949a" />
      <circle cx="51" cy="65" r="8" fill="#f6f0da" />
    </g>
    <g v-else-if="art === 'bread'">
      <path
        d="M15 83V37Q9 15 29 17Q50 4 70 17Q92 16 85 37V83Z"
        fill="#cb8d51"
        stroke="#98683d"
        stroke-width="3"
      />
      <path d="M25 76V38Q21 24 34 26Q50 17 64 26Q79 24 75 38V76Z" fill="#f3d595" />
      <path d="M32 39H66" stroke="#e3b976" stroke-width="4" />
    </g>
    <g v-else-if="art === 'water' || art === 'juice'">
      <path
        d="M36 24V16H64V24Q76 30 76 43V86Q50 95 24 86V43Q24 30 36 24Z"
        :fill="art === 'juice' ? '#f0b75c' : '#c2e0e4'"
        stroke="#648c91"
        stroke-width="2"
      />
      <rect x="35" y="10" width="30" height="13" rx="3" fill="#4d7e80" />
      <path d="M25 48H75V72H25Z" fill="#fbf4da" />
      <circle cx="50" cy="59" r="10" :fill="art === 'juice' ? '#da9347' : '#6a9ea4'" />
      <path d="M33 31V42" stroke="#fff" stroke-width="5" stroke-linecap="round" />
    </g>
    <g v-else-if="art === 'banana'">
      <path
        d="M19 20Q22 84 82 55L86 67Q19 117 8 26Z"
        fill="#edc761"
        stroke="#a08739"
        stroke-width="3"
      />
      <path
        d="M27 22Q37 65 82 46L89 54Q45 90 20 37Z"
        fill="#f7df87"
        stroke="#b49a48"
        stroke-width="2"
      />
    </g>
    <g v-else-if="art === 'sandwich'">
      <path d="M12 77L51 18L91 77Z" fill="#e7bd79" stroke="#ae8150" stroke-width="3" />
      <path d="M18 73L51 28L84 73Z" fill="#f8e6bd" />
      <path d="M12 80H90" stroke="#829559" stroke-width="7" />
      <path d="M17 87H85" stroke="#cb7661" stroke-width="5" />
    </g>
    <g v-else-if="art === 'book'">
      <path
        d="M22 12H76Q81 12 81 19V85H25Q16 85 16 75V22Q16 12 22 12Z"
        fill="#739397"
        stroke="#4e7074"
        stroke-width="3"
      />
      <path d="M25 12V76M23 81H76" stroke="#e7eedb" stroke-width="5" />
      <rect x="37" y="30" width="29" height="25" rx="3" fill="#f1e6c4" />
    </g>
    <g v-else-if="art === 'pencil'">
      <rect
        x="10"
        y="36"
        width="81"
        height="45"
        rx="15"
        fill="#bc8471"
        stroke="#896b5c"
        stroke-width="3"
      />
      <path d="M16 47H83" stroke="#f1d5af" stroke-width="3" />
      <path d="M71 45V54" stroke="#694f43" stroke-width="3" />
    </g>
    <g v-else-if="art === 'toy'">
      <path d="M15 38L47 23L82 39L49 55Z" fill="#c5a572" />
      <path d="M15 38V77L49 91V55Z" fill="#a97d58" />
      <path d="M49 55V91L82 74V39Z" fill="#79948a" />
      <circle cx="32" cy="63" r="7" fill="#e9d7ab" />
    </g>
    <g v-else-if="art === 'lunchbox'">
      <rect
        x="10"
        y="31"
        width="80"
        height="54"
        rx="14"
        fill="#8daa83"
        stroke="#5d7c5f"
        stroke-width="3"
      />
      <rect x="10" y="28" width="80" height="19" rx="8" fill="#c2d0aa" />
      <rect x="39" y="40" width="22" height="12" rx="3" fill="#f3e7c6" />
    </g>
    <g v-else-if="art === 'towel'">
      <path d="M15 29H82L91 80H24Z" fill="#f0d8b1" stroke="#b89573" stroke-width="2" />
      <path d="M15 29L24 80H42L35 29Z" fill="#dbb899" />
      <path d="M40 66H81M40 72H83" stroke="#ab8067" stroke-width="3" />
    </g>
    <g v-else-if="art === 'rice'">
      <path
        d="M25 19Q48 9 72 19L80 82Q48 95 18 82Z"
        fill="#e7d4a7"
        stroke="#b59969"
        stroke-width="3"
      />
      <path d="M25 19H72" stroke="#886f4b" stroke-width="5" />
      <circle cx="49" cy="55" r="19" fill="#799376" />
      <path d="M40 64L57 45M41 48L53 61" stroke="#f6e7bf" stroke-width="3" />
    </g>
    <g v-else-if="art === 'checklist'">
      <rect
        x="21"
        y="13"
        width="61"
        height="77"
        rx="7"
        fill="#faf2d9"
        stroke="#79948a"
        stroke-width="3"
      />
      <path
        d="M32 37L38 43L50 30M32 62L38 68L50 55"
        fill="none"
        stroke="#588571"
        stroke-width="5"
      />
      <path d="M58 38H73M58 63H73" stroke="#b4bdad" stroke-width="4" />
    </g>
    <g v-else-if="art === 'clock'">
      <circle cx="50" cy="50" r="35" fill="#f6e5c7" stroke="#789188" stroke-width="5" />
      <path
        d="M50 27V51L66 64"
        fill="none"
        stroke="#52756a"
        stroke-width="5"
        stroke-linecap="round"
      />
    </g>
    <g v-else>
      <circle cx="50" cy="27" r="16" fill="#e4b895" />
      <path d="M24 86V64Q24 45 50 45Q77 45 77 64V86Z" fill="#779c87" />
      <path d="M29 64L13 55M71 64L86 53" stroke="#e4b895" stroke-width="9" stroke-linecap="round" />
      <path d="M45 31Q50 37 56 31" fill="none" stroke="#886552" stroke-width="2" />
      <circle cx="43" cy="25" r="2" fill="#715a4b" />
      <circle cx="57" cy="25" r="2" fill="#715a4b" />
    </g>
  </svg>
</template>
<style scoped>
.product-art {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
</style>

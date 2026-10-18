<script setup lang="ts">
import { IconArrowRight, IconUserGroup, IconHeart, IconBook } from '@arco-design/web-vue/es/icon';
import FacultyProfiles from './FacultyProfiles.vue';
function scrollToSection(id: string) {
  const section = document.getElementById(id);
  section?.scrollIntoView({ behavior: 'instant', block: 'start' });
  section?.focus({ preventScroll: true });
}
const services = [
  {
    icon: IconBook,
    title: '早期干预',
    text: '以应用行为分析（ABA）为理论基础，结合发展性评估与数据追踪，制定个别化干预计划，支持语言、认知、社交与日常适应。',
    label: '个别化训练',
  },
  {
    icon: IconHeart,
    title: '家庭指导',
    text: '把家庭指导纳入儿童支持方案，与家长一起理解孩子在沟通、行为和情绪方面的需要，将支持延伸到日常生活。',
    label: '日常支持',
  },
  {
    icon: IconUserGroup,
    title: '融合支持',
    text: '提供社交、学业技能训练与学校影子老师支持。与班级教师协作，按需要提供辅助并逐步撤出，支持孩子独立参与校园生活。',
    label: '学校适应',
  },
];
</script>
<template>
  <section class="company-hero">
    <div class="container company-hero-grid">
      <div class="company-hero-copy">
        <span class="company-label">儿童发展 · 融合支持</span>
        <h1>
          看见每一份不同，
          <br />
          陪伴每一步成长。
        </h1>
        <p>
          专注于广泛性发育障碍儿童的发展，
          <br class="desktop-break" />
          以科学评估与循证干预，支持孩子走向自主与融合。
        </p>
        <div class="company-hero-actions">
          <button type="button" @click="scrollToSection('company-about')" class="button primary">
            了解我们
            <IconArrowRight />
          </button>
          <button
            type="button"
            @click="scrollToSection('company-team')"
            class="company-secondary-link"
          >
            认识我们的老师
            <IconArrowRight />
          </button>
        </div>
      </div>
      <div
        class="company-art"
        role="img"
        aria-label="以孩子为中心，家庭与老师共同支持成长的抽象插画"
      >
        <div class="company-art-top">
          <span>每个孩子，都有自己的生长节奏。</span>
          <i />
        </div>
        <svg viewBox="0 0 520 340" aria-hidden="true">
          <path d="M70 296V174a82 82 0 0 1 164 0v122" fill="#b7c9ae" />
          <path d="M286 296V141a82 82 0 0 1 164 0v155" fill="#e6bb8d" />
          <path d="M178 296V209a82 82 0 0 1 164 0v87" fill="#346b59" />
          <circle cx="151" cy="126" r="29" fill="#faf7ee" />
          <circle cx="368" cy="95" r="29" fill="#faf7ee" />
          <circle cx="260" cy="165" r="25" fill="#faf7ee" />
          <path
            d="M260 275v-40m0 11c-22 0-29-12-29-24 18 0 29 9 29 24zm0-8c22 0 29-12 29-24-18 0-29 9-29 24z"
            fill="#dce6ba"
          />
          <path d="M36 297h448" stroke="#264d3f" stroke-width="1" />
          <circle cx="470" cy="44" r="21" fill="#efce7d" />
          <path d="M44 57h38m-19-19v38" stroke="#7a9679" stroke-width="2" />
        </svg>
        <div class="company-art-caption">
          <span>家庭</span>
          <span>孩子</span>
          <span>老师</span>
        </div>
      </div>
    </div>
  </section>
  <section id="company-about" tabindex="-1" class="container company-about company-section">
    <div>
      <span class="company-label">我们是谁</span>
      <h2>
        以专业支持发展，
        <br />
        以融合连接生活。
      </h2>
    </div>
    <div class="company-about-copy">
      <p>
        一粒麦子是一家专注于广泛性发育障碍儿童发展的专业机构。我们基于科学评估与循证干预，为儿童提供个别化训练与融合教育支持。
      </p>
      <p>
        服务涵盖语言沟通、行为管理、情绪调节、社交能力、学校适应与家庭指导。通过系统化、多维度的干预方案，支持儿童提升功能，发展自主能力，参与家庭、学校与社会生活。
      </p>
    </div>
  </section>
  <section id="company-services" tabindex="-1" class="company-services-band">
    <div class="container company-section">
      <div class="company-section-heading">
        <div>
          <span class="company-label">我们做什么</span>
          <h2>从早期发展，到校园融合。</h2>
        </div>
        <p>围绕孩子的需要，连接训练、家庭与学校。</p>
      </div>
      <div class="company-services">
        <article v-for="(service, i) in services" :key="service.label">
          <div class="company-service-top">
            <component :is="service.icon" />
            <span>0{{ i + 1 }} / {{ service.label }}</span>
          </div>
          <h3>{{ service.title }}</h3>
          <p>{{ service.text }}</p>
        </article>
      </div>
    </div>
  </section>
  <section class="container company-section company-approach">
    <div>
      <span class="company-label">我们的支持方式</span>
      <h2>
        科学评估，
        <br />
        持续追踪，个别化支持。
      </h2>
      <p>以专业与实践并重的方式，关注孩子在真实情境中的发展。</p>
    </div>
    <ol>
      <li>
        <span>01</span>
        <div>
          <h3>科学评估发展需要</h3>
          <p>结合 VB-MAPP、PEAK 等发展性评估工具，了解孩子的能力与支持需要，为干预计划提供依据。</p>
        </div>
      </li>
      <li>
        <span>02</span>
        <div>
          <h3>制定个别化干预计划</h3>
          <p>
            基于评估结果，围绕语言沟通、认知学习、社交互动和日常适应等领域，制定具体的训练目标。
          </p>
        </div>
      </li>
      <li>
        <span>03</span>
        <div>
          <h3>追踪变化，支持独立参与</h3>
          <p>
            通过数据追踪持续调整支持方式；在校园情境中与班级教师协作，逐步减少辅助，促进孩子独立参与。
          </p>
        </div>
      </li>
    </ol>
  </section>
  <FacultyProfiles />
</template>

<script setup lang="ts">
const teachers = [
  {
    name: 'Sharon Noble',
    role: '督导',
    photo: '/team/sharon-noble.jpg',
    credentials: ['特殊教育硕士', 'BCBA 认证行为分析师'],
    details: [
      '曾在加州公立学校工作 20 年，先后担任自闭症项目教师及行为分析师。',
      '拥有逾 20 年支持教师与家庭理解特殊学习需要学生的经验。',
      '自 2005 年起从事大学教学，在 University of Massachusetts Global 与 Cairn University 的 ABA 项目任教。',
    ],
    note: '重视鼓励与并肩支持，帮助家长和老师理解孩子、应对行为挑战。',
  },
  {
    name: '黄伟合',
    role: '督导',
    photo: '/team/huang-weihe-source.jpg',
    crop: 'huang',
    credentials: ['康复学博士', 'BCBA-D 博士级认证行为分析师'],
    details: [
      '美国南伊利诺州大学康复学院行为心理学硕士、康复学博士。',
      '曾任美国佛罗里达州理工学院行为心理学系兼职教授等。',
      '积极推动行为分析在中国的传播，出版多部相关著作。',
    ],
  },
  {
    name: '周潇怡',
    role: '督导',
    photo: '/team/zhou-xiaoyi-source.jpg',
    crop: 'xiaoyi',
    credentials: ['BCBA 认证行为分析师', '北京星光童心联合创始人'],
    details: [
      '坚持一线教学和督导，并通过 More Than ABA 公众号分享与传播知识。',
      '擅长组合使用多种评估工具，开展自然发展行为干预（NDBIs）及儿童问题行为处理。',
      '坚持一线课程设计，将教学与督导相结合。',
    ],
  },
  {
    name: '周叶星',
    role: '负责人',
    photo: '/team/zhou-yexing.jpg',
    credentials: ['Columbia International University', '教育学硕士'],
    details: [
      '北京大学医学继续学院硕士水平应用行为分析课程结业。',
      '参加 PRT 关键反应训练认证培训。',
      '从事一线教学 9 年，持续投入儿童个别化支持与教学实践。',
    ],
    note: '相信不放弃终能成就每个个案，他们也将成为夜空中最亮的星。',
  },
];
</script>
<template>
  <section id="company-team" tabindex="-1" class="company-team-band">
    <div class="container company-section faculty-section">
      <div class="faculty-heading">
        <div>
          <span class="company-label">师资团队</span>
          <h2>认识陪伴孩子的人。</h2>
        </div>
        <p>从专业督导到一线教学，为孩子提供持续的支持。</p>
      </div>
      <div class="faculty-grid">
        <article
          v-for="teacher in teachers"
          :key="teacher.name"
          class="faculty-card"
          :aria-label="teacher.name"
        >
          <header class="faculty-profile">
            <div class="faculty-portrait" :class="teacher.crop">
              <img :src="teacher.photo" :alt="teacher.role + teacher.name" loading="lazy" />
            </div>
            <div>
              <span class="faculty-role">{{ teacher.role }}</span>
              <h3>{{ teacher.name }}</h3>
              <p v-for="credential in teacher.credentials" :key="credential">{{ credential }}</p>
            </div>
          </header>
          <div class="faculty-details">
            <h4>专业背景与经历</h4>
            <ul>
              <li v-for="detail in teacher.details" :key="detail">{{ detail }}</li>
            </ul>
          </div>
          <p v-if="teacher.note" class="faculty-note">{{ teacher.note }}</p>
        </article>
      </div>
    </div>
  </section>
</template>
<style scoped>
.faculty-portrait {
  width: 148px;
  height: 148px;
  position: relative;
  overflow: hidden;
  background: #f1f2ec;
  border-radius: 5px;
}
.faculty-portrait img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.faculty-portrait.huang img {
  position: absolute;
  width: 350%;
  height: auto;
  max-width: none;
  left: -125%;
  top: -20%;
}
.faculty-portrait.xiaoyi img {
  position: absolute;
  width: 430%;
  height: auto;
  max-width: none;
  left: -165%;
  top: -60%;
}
@media (min-width: 801px) and (max-width: 1100px) {
  .faculty-portrait {
    width: 112px;
    height: 112px;
  }
}
@media (max-width: 540px) {
  .faculty-portrait {
    width: 104px;
    height: 104px;
  }
}
</style>

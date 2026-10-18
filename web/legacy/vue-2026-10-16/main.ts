import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import { zhHans } from 'vuetify/locale';
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import '@fontsource/nunito/latin-500.css';
import '@fontsource/nunito/latin-700.css';
import './style.css';
import './student-island.css';
import { NaiveIcon, StudentIcon } from './components/island/NaiveIcon';
import App from './App.vue';
import { router } from './router';
import { dataTableDefaults } from './lib/uiDefaults';
const vuetify = createVuetify({
  icons: {
    defaultSet: 'mdi',
    sets: { mdi: { component: StudentIcon }, naive: { component: NaiveIcon } },
  },
  locale: { locale: 'zhHans', messages: { zhHans } },
  theme: {
    defaultTheme: localStorage.getItem('smartedu.theme') === 'dark' ? 'dark' : 'light',
    themes: {
      studentIsland: {
        dark: false,
        colors: {
          primary: '#315E4C',
          secondary: '#315E4C',
          background: '#F4F8F6',
          surface: '#FFFFFF',
          'surface-variant': '#EEF5F1',
          'on-surface': '#34483E',
          'on-background': '#34483E',
          'on-surface-variant': '#315E4C',
          success: '#34745A',
          error: '#AA3939',
          warning: '#875516',
          info: '#476987',
        },
      },
      studentIslandDark: {
        dark: true,
        colors: {
          primary: '#A6DFCA',
          secondary: '#BDD0C3',
          background: '#18231E',
          surface: '#24342B',
          'surface-variant': '#30473A',
          'on-surface': '#E9F2EC',
          'on-background': '#E9F2EC',
          'on-surface-variant': '#BDD0C3',
          success: '#A6DFCA',
          error: '#FFB1AA',
          warning: '#F7CD67',
          info: '#A5C9E9',
        },
      },
      light: {
        dark: false,
        colors: {
          primary: '#315E4C',
          secondary: '#527866',
          background: '#F5F6F3',
          surface: '#FFFFFF',
          'surface-variant': '#E8EDE7',
          'on-surface': '#28352E',
          'on-background': '#28352E',
          'on-surface-variant': '#45564C',
          success: '#34745A',
          error: '#B74242',
          info: '#476987',
          warning: '#A76A1C',
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: '#9DCCAF',
          secondary: '#AFCBBE',
          background: '#151D19',
          surface: '#1F2923',
          'surface-variant': '#35443B',
          'on-surface': '#E8F0E9',
          'on-background': '#E8F0E9',
          'on-surface-variant': '#C4D1C8',
        },
      },
    },
  },
  defaults: {
    VBtn: { rounded: 'lg', elevation: 0 },
    VCard: { rounded: 'xl', elevation: 0, border: true },
    VTextField: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VSelect: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VAutocomplete: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VTextarea: { variant: 'outlined', color: 'primary' },
    VDataTable: dataTableDefaults,
    VDataTableServer: dataTableDefaults,
    VDialog: { maxWidth: 680 },
    VTooltip: { location: 'top' },
  },
});
createApp(App).use(router).use(vuetify).mount('#app');

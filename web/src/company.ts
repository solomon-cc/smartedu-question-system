import { createApp } from 'vue';
import './style.css';
import './catalog.css';
import CompanyApp from './CompanyApp.vue';
import { companyRouter } from './companyRouter';
import { companyHashDestination } from './lib/sites';
const destination = companyHashDestination(window.location.hash);
if (destination.startsWith('https://')) window.location.replace(destination);
else {
  if (destination !== window.location.hash)
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search + destination,
    );
  createApp(CompanyApp).use(companyRouter).mount('#app');
}

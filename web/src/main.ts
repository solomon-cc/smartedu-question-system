import { createApp } from 'vue';
import {
  Button,
  Dropdown,
  Doption,
  Form,
  FormItem,
  Input,
  InputPassword,
  InputSearch,
  InputNumber,
  Textarea,
  Select,
  Radio,
  RadioGroup,
  Checkbox,
  CheckboxGroup,
  Modal,
  Alert,
  Tag,
  Progress,
  Pagination,
  Spin,
  Tabs,
  TabPane,
} from '@arco-design/web-vue';
import '@arco-design/web-vue/dist/arco.css';
import './style.css';
import './catalog.css';
import App from './App.vue';
import { router } from './router';
const app = createApp(App);
const components = {
  'a-button': Button,
  'a-dropdown': Dropdown,
  'a-doption': Doption,
  'a-form': Form,
  'a-form-item': FormItem,
  'a-input': Input,
  'a-input-password': InputPassword,
  'a-input-search': InputSearch,
  'a-input-number': InputNumber,
  'a-textarea': Textarea,
  'a-select': Select,
  'a-radio': Radio,
  'a-radio-group': RadioGroup,
  'a-checkbox': Checkbox,
  'a-checkbox-group': CheckboxGroup,
  'a-modal': Modal,
  'a-alert': Alert,
  'a-tag': Tag,
  'a-progress': Progress,
  'a-pagination': Pagination,
  'a-spin': Spin,
  'a-tabs': Tabs,
  'a-tab-pane': TabPane,
};
Object.entries(components).forEach(([name, component]) => app.component(name, component));
app.use(router).mount('#app');

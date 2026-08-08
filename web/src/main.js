import { createApp } from 'vue';
import { createPinia } from 'pinia';
import './styles/theme.css';
import './styles/vant-override.css';   // 必须在最后：要盖过按需引入的 Vant 组件 CSS
import './styles/auth.css';
import App from './App.vue';
import { registerSW } from './pwa';
import { initTrack } from './api/track';
import { setToken } from './api';
import router from './router';

// OAuth Worker 用 URL 片段回传 token；消费后立即清掉地址栏，避免 token 留在历史记录。
const oauth = location.hash.match(/^#acct_token=([a-f0-9]+)$/);
if (oauth) {
  setToken(oauth[1]);
  history.replaceState(null, '', location.pathname + location.search);
}

createApp(App).use(createPinia()).use(router).mount('#app');
registerSW();
initTrack(router);

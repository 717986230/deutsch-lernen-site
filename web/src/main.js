import { createApp } from 'vue';
import { createPinia } from 'pinia';
import './styles/theme.css';
import './styles/vant-override.css';   // 必须在最后：要盖过按需引入的 Vant 组件 CSS
import './styles/auth.css';
import App from './App.vue';
import { registerSW } from './pwa';
import { initTrack } from './api/track';
import router from './router';

createApp(App).use(createPinia()).use(router).mount('#app');
registerSW();
initTrack(router);

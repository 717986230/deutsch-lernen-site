import { createApp } from 'vue';
import { createPinia } from 'pinia';
import './styles/theme.css';
import './styles/auth.css';
import App from './App.vue';
import { registerSW } from './pwa';
import { initTrack } from './api/track';
import router from './router';

createApp(App).use(createPinia()).use(router).mount('#app');
registerSW();
initTrack(router);

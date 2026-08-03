import { createRouter, createWebHashHistory } from 'vue-router';
export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: '数据概览' } },
    { path: '/events', component: () => import('../views/Events.vue'), meta: { title: '事件明细' } },
  ],
});

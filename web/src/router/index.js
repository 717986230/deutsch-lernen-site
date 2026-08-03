import { createRouter, createWebHashHistory } from 'vue-router';
// hash 路由：GitHub Pages / 任意静态托管都不用配 rewrite，微信内分享链接也稳
const routes = [
  { path: '/', component: () => import('../views/Home.vue'), meta: { title: '首页', tab: true } },
  { path: '/phrases', component: () => import('../views/Phrases.vue'), meta: { title: '短语', tab: true } },
  { path: '/reading', component: () => import('../views/Reading.vue'), meta: { title: '短文', tab: true } },
  { path: '/rank', component: () => import('../views/Rank.vue'), meta: { title: '排行', tab: true } },
  { path: '/me', component: () => import('../views/Me.vue'), meta: { title: '我的', tab: true } },
  { path: '/login', component: () => import('../views/Login.vue'), meta: { title: '登录' } },
];
export default createRouter({ history: createWebHashHistory(), routes });

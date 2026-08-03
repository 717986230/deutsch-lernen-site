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
const router = createRouter({ history: createWebHashHistory(), routes });

// 全站登录墙：与旧站行为一致。放行 /login 本身，避免自跳循环。
// 注意别在守卫里预载词库——旧站正是靠「登录页不初始化」把 FCP 减半的。
router.beforeEach((to) => {
  const open = to.path === '/login';
  let tk = '';
  try { tk = localStorage.getItem('acct_token') || ''; } catch {}
  if (!tk && !open) return { path: '/login', replace: true };
  if (tk && open) return { path: '/', replace: true };
  return true;
});

export default router;

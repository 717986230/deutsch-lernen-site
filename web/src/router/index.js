import { createRouter, createWebHashHistory } from 'vue-router';
// hash 路由：GitHub Pages / 任意静态托管都不用配 rewrite，微信内分享链接也稳
const routes = [
  { path: '/', component: () => import('../views/Home.vue'), meta: { title: '首页', tab: true } },
  { path: '/phrases', component: () => import('../views/Phrases.vue'), meta: { title: '短语', tab: true } },
  { path: '/reading', component: () => import('../views/Reading.vue'), meta: { title: '短文', tab: true } },
  { path: '/rank', component: () => import('../views/Rank.vue'), meta: { title: '排行', tab: true } },
  { path: '/spell', component: () => import('../views/Spell.vue'), meta: { title: '练习', tab: true } },
  { path: '/quiz', component: () => import('../views/Quiz.vue'), meta: { title: '测验' } },
  { path: '/legal', component: () => import('../views/Legal.vue'), meta: { title: '隐私政策' } },
  { path: '/support', component: () => import('../views/Support.vue'), meta: { title: '支持作者' } },
  { path: '/me', component: () => import('../views/Me.vue'), meta: { title: '我的', tab: true } },
  // 账号相关三页各自独立：一页一件事，互相之间只用文字链跳转
  { path: '/login', component: () => import('../views/Login.vue'), meta: { title: '登录', open: true } },
  { path: '/register', component: () => import('../views/Register.vue'), meta: { title: '注册', open: true } },
  { path: '/reset', component: () => import('../views/Reset.vue'), meta: { title: '重置密码', open: true } },
];
const router = createRouter({ history: createWebHashHistory(), routes });

// 全站登录墙：与旧站行为一致。放行 meta.open 的页面（登录/注册/重置），
// 否则未登录用户根本进不去注册和重置。注意别在守卫里预载词库——
// 旧站正是靠「登录页不初始化」把 FCP 减半的。
router.beforeEach((to) => {
  const open = !!to.meta.open;
  let tk = '';
  try { tk = localStorage.getItem('acct_token') || ''; } catch {}
  if (!tk && !open) return { path: '/login', replace: true };
  if (tk && open) return { path: '/', replace: true };
  return true;
});

export default router;

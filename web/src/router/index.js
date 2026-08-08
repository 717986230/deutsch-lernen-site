import { createRouter, createWebHashHistory } from 'vue-router';
// hash 路由：GitHub Pages / 任意静态托管都不用配 rewrite，微信内分享链接也稳
const routes = [
  { path: '/', component: () => import('../views/Home.vue'), meta: { title: '首页', tab: true } },
  { path: '/phrases', component: () => import('../views/Phrases.vue'), meta: { title: '短语', tab: true } },
  { path: '/reading', component: () => import('../views/Reading.vue'), meta: { title: '短文', tab: true } },
  { path: '/rank', component: () => import('../views/Rank.vue'), meta: { title: '排行', tab: true } },
  { path: '/spell', component: () => import('../views/Spell.vue'), meta: { title: '练习', tab: true } },
  { path: '/quiz', component: () => import('../views/Quiz.vue'), meta: { title: '测验' } },
  { path: '/dialog', component: () => import('../views/Dialog.vue'), meta: { title: '情景对话' } },
  { path: '/series', component: () => import('../views/Series.vue'), meta: { title: '留学连载' } },
  { path: '/ref/:topic', component: () => import('../views/Reference.vue'), meta: { title: '参考' } },
  { path: '/u/:name', component: () => import('../views/Profile.vue'), meta: { title: '用户主页' } },
  { path: '/feed', component: () => import('../views/Feed.vue'), meta: { title: '动态' } },
  { path: '/following', component: () => import('../views/Following.vue'), meta: { title: '我的关注' } },
  { path: '/boards', component: () => import('../views/Boards.vue'), meta: { title: '图解词典' } },
  // public:true —— 隐私政策**任何时候**都要能打开：注册前要读到才谈得上「同意」，
  // 注册后也得随时能翻。以前它标的是 open:true，而 open 的语义是「只给未登录用户」，
  // 于是登录用户点隐私政策会被弹回首页 —— 整个协议对已注册用户不可达。
  { path: '/legal', component: () => import('../views/Legal.vue'), meta: { title: '隐私政策', public: true } },
  { path: '/support', component: () => import('../views/Support.vue'), meta: { title: '支持作者' } },
  { path: '/me', component: () => import('../views/Me.vue'), meta: { title: '我的', tab: true } },
  // guest:true —— 只对未登录用户有意义的三页，已登录再进去没内容可做，弹回首页
  { path: '/login', component: () => import('../views/Login.vue'), meta: { title: '登录', guest: true } },
  { path: '/register', component: () => import('../views/Register.vue'), meta: { title: '注册', guest: true } },
  { path: '/reset', component: () => import('../views/Reset.vue'), meta: { title: '重置密码', guest: true } },
];
const router = createRouter({ history: createWebHashHistory(), routes });

// 全站登录墙：与旧站行为一致。两个标记不是一回事，别再合并——
//   guest  = 只给未登录用户（登录/注册/重置），已登录访问弹回首页
//   public = 谁都能进（隐私政策），登录与否都不拦
// 注意别在守卫里预载词库——旧站正是靠「登录页不初始化」把 FCP 减半的。
router.beforeEach((to) => {
  let tk = '';
  try { tk = localStorage.getItem('acct_token') || ''; } catch {}
  if (to.meta.public) return true;
  if (!tk && !to.meta.guest) return { path: '/login', replace: true };
  if (tk && to.meta.guest) return { path: '/', replace: true };
  return true;
});

export default router;

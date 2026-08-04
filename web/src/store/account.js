import { defineStore } from 'pinia';
import { api, getToken, setToken } from '../api';
import { collectStats, freshBadges } from '../api/study';
import { getKnown } from '../api/practice';

export const useAccount = defineStore('account', {
  state: () => ({ token: getToken(), user: null, rank: 0, loading: false, offline: false, celebrate: [] }),
  getters: { logged: (s) => !!s.token },
  actions: {
    async fetchMe() {
      if (!this.token) return;
      this.loading = true;
      const r = await api.me();
      this.loading = false;
      this.offline = !!r.offline;
      if (r.ok) { this.user = r.data.user; this.rank = r.data.rank; }
      else if (r.status === 401) this.signOut(true);
    },
    setAuth(token, user) { this.token = token; setToken(token); this.user = user; this.sync(); },
    /** 把本地学习数据推给服务端；服务端回判定好的徽章，新点亮的排队庆祝。 */
    async sync() {
      if (!this.token) return;
      const r = await api.sync(collectStats(Object.keys(getKnown()).length));
      if (r.ok && r.data.badges) {
        const fresh = freshBadges(r.data.badges);
        if (fresh.length) this.celebrate = this.celebrate.concat(fresh);
      } else if (r.status === 401) this.signOut(true);
    },
    /** 节流：学习动作很密集，攒 4 秒再推一次，避免每答一题打一次接口 */
    syncSoon() {
      if (this._t) clearTimeout(this._t);
      this._t = setTimeout(() => this.sync(), 4000);
    },
    popCelebrate() { return this.celebrate.shift(); },
    signOut(silent) { if (!silent) api.logout(); this.token = ''; setToken(''); this.user = null; },
  },
});

import { defineStore } from 'pinia';
import { api, getToken, setToken } from '../api';

export const useAccount = defineStore('account', {
  state: () => ({ token: getToken(), user: null, rank: 0, loading: false, offline: false }),
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
    setAuth(token, user) { this.token = token; setToken(token); this.user = user; },
    signOut(silent) { if (!silent) api.logout(); this.token = ''; setToken(''); this.user = null; },
  },
});

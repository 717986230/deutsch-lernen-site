# 回退：把 www.uuoo.site 切回旧站

新端出问题时，**不用改代码、不用碰 DNS**，两条命令：

```bash
cp legacy.html index.html
cp sw-legacy.js sw.js
git add -A && git commit -m "rollback: 切回旧站" && git push
```

GitHub Pages 一两分钟内生效。旧站的词库切片（`*.dat`）一直在仓库里，没删过。

## 为什么这样就够

切换的做法是「**Vue 产物写到仓库根**」，旧站产物改名保留：

| 文件 | 谁 |
|---|---|
| `index.html` + `assets/` + `data/` | Vue 新端（GitHub Pages 服务的就是它）|
| `legacy.html` + `*.dat` | 旧站，完整可用 |
| `sw.js` / `sw-legacy.js` | 各自的 Service Worker |

回退就是把 `legacy.html` 复制回 `index.html`。两套产物始终并存，互不覆盖。

## 用户会不会丢数据

不会。两端**共用同一批 localStorage 键**（`study` / `knownWords` / `badges_seen` /
`acct_token`），且是**同域名**，所以来回切换进度都在。

## 恢复到新端

```bash
cd web && npm run build     # 重新生成根目录的 index.html / sw.js
git add -A && git commit -m "restore: 切回新端" && git push
```

## 注意 Service Worker 缓存

用户浏览器里可能缓存着旧的 `sw.js`。切换后新的 SW 会在下次访问时接管，
但**已打开的页面要刷新一次**。急的话可以让用户强制刷新（微信：右上「⋯」→ 刷新）。

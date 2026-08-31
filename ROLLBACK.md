# 切换与回退：www.uuoo.site 在旧站 / Vue 新端之间来回

## 现状（2026-08）

**生产是旧站。** Vue 新端保留在 `web/`，等待再次发布。

| 文件 | 谁 | 状态 |
|---|---|---|
| `index.html` + `*.dat` | 旧站 | **当前生产** |
| `sw.js` | 旧站 Service Worker | 当前生产 |
| `web/dist/` | Vue 构建产物 | 未上线，`.gitignore` 中 |
| `legacy.html` / `sw-legacy.js` | 旧站回退快照 | **仅在 Vue 上线期间存在**，回退时删掉 |

> Vue 产物**不再直接写进仓库根**。以前 `outDir:'..'` 每构建一次就在根目录留一批
> 带哈希的孤儿文件（一度堆了 300 多个没人引用的 `assets/*.js`），现在输出到
> `web/dist` 并每次自清，上线时再整份拷到根。

## 切到 Vue 新端

```bash
cd web && npm run build          # 产物在 web/dist
cd .. && cp index.html legacy.html && cp sw.js sw-legacy.js
cp -r web/dist/. .               # 新端产物覆盖到根
git add -A && git commit -m "切到 Vue 新端" && git push
```

推 main 后 GitHub Pages 一两分钟生效。旧站由 `legacy.html` 与 `sw-legacy.js` 保留作回退。

## 回退到旧站

**不用改代码、不用碰 DNS**：

```bash
cp legacy.html index.html
cp sw-legacy.js sw.js
git rm legacy.html sw-legacy.js                    # 快照的活干完了，必须删（见下）
git rm -r --cached assets && git clean -f assets   # 清掉新端产物，它们已无人引用
git add -A && git commit -m "rollback: 切回旧站" && git push
```

**回退后一定要删掉 `legacy.html` / `sw-legacy.js`。** 它们只是「Vue 上线期间的旧站备份」，
回退后旧站已经回到 `index.html`，快照再留着就是一份会过期的复制品 —— 2026-08 就吃过一次亏：
回退时没删，`tools/verify-build-artifacts.mjs` 当时按「挑第一个存在的入口」的写法，
被排在前面的 `legacy.html` 接管，连着两天校验的都是那份死文件，真正部署的 `index.html`
一次都没验过。校验脚本已改成把存在的入口全扫一遍，但**快照该删还是要删**。

旧站的词库切片（`*.dat`）一直在仓库里，没删过 —— 给缓存了旧 `sw.js` 的浏览器兜底。
`npm run verify` 第一项会报出当前有几个「无人引用的历史切片」，涨到离谱时再清。

## 用户会不会丢数据

不会。两端**共用同一批 localStorage 键**（`study` / `knownWords` / `badges_seen` /
`acct_token`），且是**同域名**，所以来回切换进度都在。

## 注意 Service Worker 缓存

用户浏览器里可能缓存着旧的 `sw.js`。切换后新的 SW 会在下次访问时接管，
但**已打开的页面要刷新一次**。

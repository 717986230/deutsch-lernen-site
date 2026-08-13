# 切换与回退：www.uuoo.site 在旧站 / Vue 新端之间来回

## 现状（2026-08）

**生产是 Vue 新端。** 旧站已在仓库根目录保留为同域回退文件。

| 文件 | 谁 | 状态 |
|---|---|---|
| `index.html` + `assets/` + `data/` | Vue 新端 | **当前生产** |
| `sw.js` | Vue Service Worker | 当前生产 |
| `legacy.html` + `sw-legacy.js` + `*.dat` | 旧站 | 回退来源 |
| `web/dist/` | Vue 构建产物 | 构建中间产物，`.gitignore` 中 |

> Vue 产物**不再直接写进仓库根**。以前 `outDir:'..'` 每构建一次就在根目录留一批
> 带哈希的孤儿文件（一度堆了 300 多个没人引用的 `assets/*.js`），现在输出到
> `web/dist` 并每次自清，上线时再整份拷到根。

## 更新 Vue 新端

```bash
cd web && npm run build          # 产物在 web/dist
cd .. && cp -r web/dist/. .      # 新端产物覆盖到根
git add -A && git commit -m "发布 Vue 用户端" && git push
```

推 main 后 GitHub Pages 一两分钟生效。旧站文件只用于回退，不作为日常入口。

## 回退到旧站

**不用改代码、不用碰 DNS**：

```bash
cp legacy.html index.html
cp sw-legacy.js sw.js
git rm -r --cached assets && git clean -f assets   # 清掉新端产物，它们已无人引用
git add -A && git commit -m "rollback: 切回旧站" && git push
```

旧站的词库切片（`*.dat`）一直在仓库里，没删过。

## 用户会不会丢数据

不会。两端**共用同一批 localStorage 键**（`study` / `knownWords` / `badges_seen` /
`acct_token`），且是**同域名**，所以来回切换进度都在。

## 注意 Service Worker 缓存

用户浏览器里可能缓存着旧的 `sw.js`。切换后新的 SW 会在下次访问时接管，
但**已打开的页面要刷新一次**。

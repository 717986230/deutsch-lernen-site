// 浏览器体检工具的共用入口：解析 Playwright 与 Chromium 的位置。
//
// 起因：verify-boot / verify-tap-targets / verify-board-quiz 原来直接写死了
// `/opt/node22/lib/node_modules/playwright/index.js` —— 那是**开发容器里**的路径。
// 站长自己的 Mac 上没有，于是 npm run verify 直接 ERR_MODULE_NOT_FOUND，
// 而 deploy.sh 会先跑 verify，结果是**后端根本部署不了**。
//
// 现在按顺序找：先走正常的 node 解析（本机装了 playwright 就用本机的），
// 找不到再试容器里那条绝对路径；两边都没有就**跳过**而不是让整条校验失败 ——
// 缺一个开发依赖不该挡住部署，但得把话说清楚，别让人以为跑过了。
import { existsSync } from 'node:fs';

const CANDIDATES = ['playwright', '/opt/node22/lib/node_modules/playwright/index.js'];
const CONTAINER_CHROMIUM = '/opt/pw-browsers/chromium';

export async function getChromium() {
  for (const spec of CANDIDATES) {
    let mod;
    try { mod = await import(spec); } catch { continue; }
    const pw = mod.default || mod;
    if (!pw || !pw.chromium) continue;
    // 容器里浏览器装在固定位置；本机装了 playwright 的话让它自己找
    const launch = existsSync(CONTAINER_CHROMIUM) ? { executablePath: CONTAINER_CHROMIUM } : {};
    return { chromium: pw.chromium, launch };
  }
  return null;
}

/** 拿不到浏览器就打印说明并以 0 退出 —— 跳过，不是通过 */
export function skipNoBrowser(name) {
  console.log(`SKIP ${name}：本机没有 Playwright，浏览器体检这一项跳过了（不等于通过）。`);
  console.log('     想在本机也跑：npm i -D playwright && npx playwright install chromium');
}

---
name: ship
description: 全流程自动交付一个需求：PM出PRD → 前端/后端并行开发 → QA门禁 → 提交部署。用法：/ship 需求描述
---

# /ship 全流程交付流水线

收到 `/ship <需求>` 后，按以下流水线执行。你是流程总控（技术负责人），
各阶段用 Agent 工具派给对应角色（subagent_type: pm / frontend / backend / qa），
给每个角色的 prompt 里带上它需要的上下文（PRD 全文、改动摘要等——子代理看不到对话历史）。

## 流水线

**① PM 阶段**：派 `pm` 出迷你 PRD。拿到后自查一遍：若 PRD 与硬约束冲突
（UGC红线/运维复杂度），退回重出一次。把 PRD 关键内容展示给用户。

**② 开发阶段**：按 PRD 的改动面派工——
- 只涉及前端 → 派 `frontend`
- 只涉及后端 → 派 `backend`
- 都涉及 → **同一批并行派出**（互不依赖：接口契约以 PRD 为准）
- prompt 必须包含：PRD 全文 + 相关铁律提醒 + 「完成后报告改动文件清单与自验结果」

**③ QA 门禁**：派 `qa`，prompt 带上 PRD 验收标准 + 开发报告的改动清单。
- **打回** → 把 QA 报告的问题清单派回对应开发角色修复，修完重过 QA（最多 2 轮，
  仍不过则停下向用户汇报卡点）
- **放行** → 进入 ④

**④ 提交部署**（总控亲自做，不派子代理）：
- `git add -A` + 规范提交信息（说明做了什么，末尾带 Co-Authored-By 与 Claude-Session 行）
- 快进合并 main：`git checkout main && git merge --ff-only claude/chinese-text-addition-opule2 && git push -u origin main`，再切回开发分支同步推送
- 后端有改动时，在最终汇报里给出站长部署命令：
  `cd ~/uuoo-analytics && curl -fsSL https://raw.githubusercontent.com/717986230/deutsch-lernen-site/main/analytics/deploy.sh -o deploy.sh && bash deploy.sh`

## 最终汇报格式
需求 → PRD 要点 → 各角色产出摘要 → QA 结论（引用关键验证证据）→
已部署内容 / 待站长操作。全程用中文，简洁。

## 原则
- QA 不放行绝不提交——这是硬门禁，用户催也不越过
- 子代理产出要审：总控对最终质量负全责，发现子代理糊弄就重派
- 小需求（一行文案/改个色值）允许总控直接做+QA 快验，跳过 PM，但要说明

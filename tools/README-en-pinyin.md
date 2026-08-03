# 英语谐音重建（已应用）

## 原来的问题

`data/en_categories.json` 的英语谐音是**按字母机械音译**的，不是按发音，会教错读音：

```
attack  →「特诶克」   实读 [əˈtæk]，整个第一音节丢了
limb    →「尔伊姆」   实读 [lɪm]
ability →「布伊尔伊特伊」 实读 [əˈbɪləti]
```

抽查 14 个常见词 **14/14 全错**；`-tion` 结尾 280/287 条拼成「什恩」。

## 现在的做法

`en_pinyin.py`：用 CMU 发音词典（ARPABET 音标，12.6 万词）按音节生成谐音。
三步，不打补丁：

1. **以元音为核心切音节**，辅音按「最大声母原则」分配——两元音之间的最后一个
   辅音归下一音节做声母（money = mo-ney「马尼」，不是 mon-ey「门伊」）
2. 每个音节按「声母+韵母」查表映射到一个汉字
3. **韵尾归并**：R 卷舌化并入前字（morning→莫宁）；N/NG/M 作鼻韵尾
   （accent→厄克森特，不是「厄克塞恩特」；number→南伯，不是「那姆伯」）

**重音是关键**：CMU 的 `AH0` 是弱读 schwa [ə]→「厄」，`AH1/AH2` 是重读 [ʌ]→「阿」系。
不区分会把 money 拼成「么尼」。

## 效果

| | 修前 | 修后 |
|---|---|---|
| 30 个常见词人工核对 | — | **25/30 完全一致**（未命中的 5 个是可接受变体）|
| 原 14/14 全错的抽查词 | 0 正确 | 8 完全一致 + 6 可接受变体 |
| `-tion` 拼成「什恩」 | 280 | **2** |
| `-ble` 拼成「布尔」 | 106 | **1** |
| `-ity` 拼成「伊特伊」 | 82 | **0** |

## 应用范围

重写 **6765 条**。刻意跳过：

- **多词短语 149 条** —— 逐词拼接易错，需整句韵律，留待人工
- **CMU 未收录 81 条** —— 含英式拼写（favourable）与生僻词，保留旧值

剩余未清零的 3 条（preposition / lamentation / favourable）正是 CMU 未收录的。

## 回滚

旧值全量备份在 `tools/en_pinyin_backup.json`（6765 条）：

```python
import json
bak = json.load(open('tools/en_pinyin_backup.json'))
data = json.load(open('data/en_categories.json'))
for c in data:
    for p in c['phrases']:
        if p['de'] in bak: p['py'] = bak[p['de']]
```

## 重跑

```bash
pip install cmudict
python3 -c "
import sys; sys.path.insert(0,'tools')
import cmudict; from en_pinyin import word_to_hanzi
print(word_to_hanzi('ability', cmudict.dict()))"
```

## 仍可改进

- 多词短语（149 条）需要整句韵律，逐词拼接会丢连读
- 少数音节映射可再打磨：company「康珀尼」、beautiful「布尤特佛尔」
- `npm run verify:data` 会校验谐音字符集，改动后务必跑一次

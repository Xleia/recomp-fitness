# 训练计划 JSON v1

配置文件为 UTF-8 JSON。可从训练页下载 `plans/default-plan.json` 作为模板，在网页外修改后导入。JSON Schema 位于 `plans/training-plan.schema.json`，浏览器运行时还检查跨字段约束（重复星期、ID、动作顺序、范围 min ≤ max、周次上下界）。未知字段、非法数值或不支持的 schema_version 会拒绝，避免静默忽略配置。

基本字段：`format: "recomp-training-plan"`、`schema_version: 1`、`plan_id`、`plan_version`、`name`、`goal`、`duration_weeks`。可选 `description` 和逐周 `week_advice`。支持 1–104 周，文件上限 512 KiB。

`days` 必须完整包含七天（0=周日、1=周一…6=周六），每个星期只能出现一次。每一天包括：

- `weekday`、唯一 `day_id`、`name`、`type`（strength / basketball / cardio / rest）。
- `muscle_groups` 文本数组、可选 `description`、`home_description`、`duration_minutes`。
- `exercises` 动作数组。力量日必须有动作，休息日为空。

每个动作包括：

- `exercise_id`、`name`、`order`（1–40，不重复）、`sets`（1–20）。动作 ID 在该周七天安排内唯一。
- `reps`：正整数或 `{ "min": 8, "max": 12 }`；每侧次数可加 `"per_side": true`。
- `rest_seconds`：0–3600 的整数或 `{ "min": 120, "max": 180 }`，单位秒。
- 可选 `planned_weight_kg`、`rir`、`rpe`、`description`、`alternatives`。RIR 为 0–20，RPE 为 1–10，可用单值或 min/max 范围。

计划建议重量不会填入实际训练记录，实际完成状态也不会自动勾选。

未来周次差异使用可选的 `weeks`，例如 `{ "week": 5, "days": [完整的周一配置] }`；仅覆盖指定周的指定星期，未指定的日期沿用 `days`。覆盖后的整周仍须通过相同校验，不维护另一套格式。

不支持日期字符串形式的排程；星期须为 0–6 的数字，周次为 1–duration_weeks。私有计划不要提交到公开仓库，默认配置与 JSON Schema 仅为公共模板。

# 计划与实际记录

计划定义未来模板；历史记录的 `items[].name` 和 `sets` 永远是实际记录来源。日期已有记录时按原动作和原组数回显，手动保存只更新实际输入并保留原有附加字段。旧记录不补造计划名或版本；新记录增加 `plan_id`、`plan_version`、`plan_snapshot`，快照只用于保存当时的计划关联，不能替代实际重量/次数/完成情况。

默认 JSON 加载失败时显示错误与重试按钮，不使用第二份嵌入计划；历史记录仍可读取。计划文件纳入 Service Worker 缓存，已成功加载的 PWA 可离线使用。

# 本地导入与版本（F03）

训练页提供文件选择 → 只读预览 → “仅保存” / “保存并启用”。文件校验前、预览时及取消导入均不写入保险库。相同 plan_id + plan_version 再次导入要额外确认，保存成新的本地 entry_id，保留原版本。每个条目含原始计划快照与 imported_at；启用状态统一由 active_entry_id 表示，避免出现两个启用版本。

新增状态字段为 `state.plan_library`：

```json
{
  "schema_version": 1,
  "versions": [
    {"entry_id": "本地唯一ID", "imported_at": "2026-10-21T02:30:00.000Z", "plan": "完整训练计划对象"}
  ],
  "active_entry_id": "本地唯一ID或null"
}
```

此段只解释结构，不是可导入的训练计划文件。默认计划的启用 ID 为 null；缺少整个字段的旧状态不迁移、不补写，直接使用默认 JSON。最多 50 个本地版本，计划库总计 2 MiB；整个加密保险库需低于原 8 MiB 可恢复备份限制，超限时拒绝本次变更。没有删除/编辑/合并版本功能。

新增字段随整个 state 经原 PBKDF2/AES-GCM 流程保存，原加密封套格式保持 v2。完整加密备份会自然包含版本库；旧备份缺少字段仍可恢复。库数据异常或启用指针失效时尝试回退默认计划并提示，不删除异常库或训练、饮食数据；此时可以先导出完整加密备份再排查。无默认缓存且默认文件无法加载时，仍可显示旧记录；有效的已导入启用计划无需默认文件即可使用。

计划切换不修改计划开始日期，周期仍按个人设置计算。切换重新渲染前有确认，明确未保存的页面输入会丢弃；已保存日期仍显示自身实际记录。保存一个尚未启用的版本不会重新渲染训练输入表单。

写入使用事务式的候选状态：校验 → 加密 → 再检查解锁身份/并发更改/取消标志 → 写入成功 → 提交内存。存储空间不足、锁定、并发状态改变或加密完成前取消都不会提交候选状态。关闭/切后台会清空私有计划预览及临时引用；重新解锁从保险库恢复。

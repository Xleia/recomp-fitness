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

# 14 — core 其余（工具层与异常层）

审计范围：`core/common-util.xl.md`、`core/extensions/list-extension.xl.md`、`core/exceptions/source-exception.xl.md`、`core/exceptions/syntax-exception.xl.md`、`core/syntax/messages/reload-message.xl.md` 共 5 个文件。
判据见 [`01-rules.md`](01-rules.md)。

**本层总评**：这 5 个文件都不碰 possible/end，本身不构成对 IMPORTANCE 的违反。但 `list-extension` 提供的「向后查找」工具、`reload-message` 提供的消息骨架，是上层偏离的**使能条件**——审计里值得点名，不该当成纯工具放过。

---

### core/common-util.xl.md（893B / 48 行；`CommonUtil`）
- 结构：一个静态转义工具 `XmlDecode`，把控制字符转成 `\r`/`\n`/`\t` 形式给 AST 文本用。
- 偏离：无。
- 符合项：纯函数，无状态、无 possible 交互；`switch` 覆盖 `\r\n\t\a\b\f\v`、引号与 `<>&`，`common-util.xl.md:7-55`。
- 结论：符合（不涉及 possible）。

### core/extensions/list-extension.xl.md（3041B / 0 行；`Array<T>` 扩展方法）
- 结构：数组扩展——替换、跳读、前后查找、切片取出（`ReplaceAt`/`SkipNext`/`FindNext`/`SearchBack`/`TakeOut`…）。
- 偏离：
  - `[X1]` ○ 这套扩展里有一半是**向后**操作：`NextAt`（`index + 1`，`:103-107`）、`SearchBack`（从 `index + 1` 往后扫，`:120-129`）、`SearchBackIndexed`（`:131-140`）。它们本身只是工具，但正是上层「越过当前格去看后面」的便利入口（R22 禁止这种看法的动机是「后面的数据不一定就绪」）。证据 `list-extension.xl.md:103-140`。
  - `[X1]` ○ `TakeOut` 边遍历边 `splice`（`:142-152`），`TakeRange` 用 `self[startIndex + i]` 不做越界检查（`:154-161`）——越界时静默产出 `undefined`，是 `[B1]` 的又一来源。
- 结论：符合（2 条外挂，均疑似；不计为 IMPORTANCE 直接违反）。

### core/exceptions/source-exception.xl.md（989B / 0 行；`SourceException`）
- 结构：源码层错误的六个静态实例（范围未设/重复设置/越界）。
- 偏离：
  - `[B1]` ○ `SourceRangeIndexOutOfRange` 的存在说明「越界」在本层被建模成**异常**（`:23`），而 R25 要求 possible 层越界返回 `Nothing`。异常实例本身没错，但它是 `[B1]` 的上游。证据 `source-exception.xl.md:23`。
- 符合项：无状态、无 possible 交互。
- 结论：符合（1 条外挂，疑似）。

### core/exceptions/syntax-exception.xl.md（1224B / 12 行；`SyntaxException`）
- 结构：语法错误，携带 `Message`（含源码摘录）与 `InnerException`。
- 偏离：无。
- 符合项：`FromInner` 保留 `InnerException`（`:37-43`），也就是**没有吞掉**原始异常对象——与 R23 同向。真正的问题是调用方（`unit-token.xl.md:128-135`）把它当兜底把 possible 的抛错也套了进来，那是调用方的账，不是这个类的。
- 结论：符合。

### core/syntax/messages/reload-message.xl.md（920B / 10 行；`ReloadMessage`）
- 结构：R17④ 的 `Reload Message` 载体——`StartIndex`/`EndIndex`/`Target`，两个静态工厂。
- 偏离：
  - `[X1]` ○ `Type` 返回 `MessageTypes.None`（`:40-46`），而 `MessageTypes` 只定义了 `None`（`message.xl.md:9-11`）——消息类型系统是空转的，「这是不是 Reload」只能靠 `instanceof`（`syntax-context.xl.md:122`）判断。
  - `[X1]` ○ `EndIndex` 缺省 `-1` 表示「只重放一格」（`syntax-context.xl.md:127`），而 `FromRange` 传的是**开区间右端**（`:32-38`）——同一个字段两种含义，全靠 `-1` 哨兵区分。
- 符合项：这个文件正是 R17④ 的落地物，`WithoutProcessOwner` / `FromRange` 两个工厂覆盖了「重放一格」与「重放一段」两种用法（`:24-38`）。
- 结论：符合（2 条外挂，均疑似）。

---

## 本批统计

- 文件数：5；有偏离：4（均疑似）；完全符合：2（`common-util`、`syntax-exception`）。
- 按编号计数：`X1:3`、`B1:1`。
- 本批最严重 3 条：
  1. `[X1]` `list-extension` 的向后查找族（`NextAt`/`SearchBack`）是 R22 的使能工具。
  2. `[X1]` `ReloadMessage` 的类型系统空转（`MessageTypes` 只有 `None`）。
  3. `[B1]` 越界在本层被建模为异常（`SourceRangeIndexOutOfRange`），与 R25 的 `Nothing` 相反。

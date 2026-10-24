# HANDOFF — T1d r8：dev 尾段根因定位完成，修复补丁未落地（dev 仍 18/22，开关 false）

分支 `feature/possible-statement-s1d`（本目录 r8），起点 `b621c064`（r7）。
本轮**没有改动任何源码**：一次修复尝试因写入编码（PowerShell `Set-Content -Encoding UTF8` 带 BOM + CRLF）
被 `xl build` 以 E0005 拒绝（`*.xl.md` 必须 UTF-8 无 BOM、LF），改动已 `git checkout --` 回滚，未提交。
下面给出的是**已用插桩实测确认的根因**与**可直接应用的补丁**。

## 1. 本轮实测（默认状态，未打开开关）

- dev 组：`pass=18 fail=4 skip=0`（与 r7 相同，4 条红同族）
- token-ast：`total=1716 ok=1706 crash=0 diff=0 ts-invalid=10`（与 r6 基线一致）
- tsc：0 error（插桩已回滚，工作树与 `b621c064` 源码一致）

## 2. 根因（插桩 `BuildStatementSegments` 后实测，不再是推测）

### 2.1 前缀 `--` 跨行（dev-prefix-crossline / dev-prefix-operand-newline）

在 `build/ts/.../source-file-end-possible-shape.js` 的 `BuildStatementSegments` 里打印 `cursor/limit/units`，得到：

```
[dbg-entry] start=1 at=5 units=WrapSymbol@4: |Symbol@5:--|WrapSymbol@7:
[dbg-catch] cursor=1 msg=表达式意外结束
[dbg-null]  cursor=1 limit=5
```

即 ASI 判据在 `--` 与下一行的 `a` 之间**误判成边界**：它把 `--` 当成「上一条表达式的尾」，
于是 `--` 被单独留成一个段（段里只有 `--` 和空白），`StatementBuilder` 报「表达式意外结束」，
`--` 以裸 `Symbol` 留到根上（dev-prefix-crossline 的 AST 差异 `#3 TS=ExpressionStatement CJ=Symbol`）。

位置：`typescript/tokens/statements/statement-boundary-util.xl.md` 的 `IsAsiBoundary`（约 :57-89），
`prev` 处的 `ExpressionStatementPossibleShape.CanEndExpressionAt(units, prev)`（:85）对 `++`/`--` 返回 true，
没有区分**前缀位置**（前面没有操作数）与**后缀位置**（`a++` / `a--`）。

### 2.2 `enum E { A }` 尾段（dev-label-enum-tail）

`BuildStatementSegments` 的 `statement === null` 分支直接 `break`（`source-file-end-possible-shape.xl.md:398-400`），
`built > 0` 返回 true，剩余 `enum E { A }` 留在 `host.Data`，EOF 由 legacy `StatementBuilder` 收口时报
「语句没有读完」。`StatementBuilder` 不认声明族，而同一个文件里的 `BuildTrailingDeclaration`
（:453 起，`enum` 分支在 :1247 `EnumDeclarationShape.FromUnits`）本来就能建它。

### 2.3 `as T` ⏎ `(`（dev-as-const-crossline-tail）

`IsAsiBoundary` 只在 `>` 收尾（`a as T<U>` / `f<T>`）时用 `StatementScanner.IsCallPositionBlocked`
判「调用位置被封」（:76-84）；`as T` 之后接 `(` 仍被 `IsContinuation` 判成延续符 → 整段进
`ExpressionStatementShape.FromUnits` → 抛「表达式语句没有读完」。需扩展 `IsCallPositionBlocked`：
`(`/`[` 前回溯到 `as`/`satisfies` 且中间是完整类型段时判「调用位置被封」。**本轮未做，列为未覆盖。**

## 3. 可直接应用的补丁（下一棒照抄，注意用 LF + 无 BOM 写入）

### 3.1 `typescript/tokens/statements/statement-boundary-util.xl.md`

在 `IsAsiBoundary` 的 `if (prev < 0) { return false; }` 之后、`// 换行判据按源位置找` 之前插入：

```ts
// 前缀位置的 `++` / `--` 收不住上一条表达式：它的操作数可以落在下一行
// （`a++; --` ⏎ `a;` 的第二条是 `--a;`）。只有 `++` / `--` 前面还有能收住表达式的单元时
// 它才是后缀、才可能构成 ASI 边界。
if (units[prev] instanceof Symbol
  && ((units[prev] as Symbol).Is("++") || (units[prev] as Symbol).Is("--"))) {
  let operatorStart = prev - 1;
  while (operatorStart >= 0 && units[operatorStart].IsTriviaToken) {
    operatorStart--;
  }
  if (operatorStart < (limit ?? 0)
    || !ExpressionStatementPossibleShape.CanEndExpressionAt(units, operatorStart)) {
    return false;
  }
}
```

### 3.2 `typescript/tokens/files/source-file-end-possible-shape.xl.md`

把 `BuildStatementSegments` 里的

```ts
  if (statement === null) {
    break;
  }
```

整体替换为：

```ts
  if (statement === null) {
    // r8：`StatementBuilder` 不认声明族（`enum E { A }` 这类剩余段）。先把剩余段整段交给
    // `BuildTrailingDeclaration`：它按「最后一个换行处开始的声明」递归拆段，建出来就说明剩余单元都有主。
    let remainingBuilt = false;
    try {
      remainingBuilt = SourceFileEndPossibleShape.BuildTrailingDeclaration(host, cursor, limit, context);
    } catch (declarationError) {
      remainingBuilt = false;
    }
    if (remainingBuilt) {
      built++;
      break;
    }
    // 段内再切一刀：第一个 ASI 边界之前的部分当一条语句建，成功则继续循环。
    let asiCut = -1;
    for (let index = cursor + 1; index <= limit; index++) {
      if (ExpressionStatementPossibleShape.IsAsiBoundary(host.Data, index, cursor)) {
        asiCut = index;
        break;
      }
    }
    if (asiCut > cursor) {
      let headEnd = asiCut - 1;
      while (headEnd > cursor && !host.Data[headEnd].IsBasicToken) {
        headEnd--;
      }
      if (host.Data[headEnd].IsBasicToken) {
        const headBuilder = new StatementBuilder(host.Template, context);
        headBuilder.Load(host.Data.slice(cursor, headEnd + 1), basePos);
        const headStatement = headBuilder.BuildStatement();
        const headEndIndex = headStatement.SourceRange.EndIndex;
        let headConsumed = 0;
        if (headEndIndex < 0) {
          headConsumed = headEnd - cursor + 1;
        } else {
          while (cursor + headConsumed <= limit
            && host.Data[cursor + headConsumed].SourceRange.Start < headEndIndex) {
            headConsumed++;
          }
        }
        if (headConsumed > 0) {
          host.Data.splice(cursor, headConsumed, headStatement);
          headStatement.Parent = host;
          built++;
          limit -= headConsumed - 1;
          cursor++;
          while (cursor <= limit && (host.Data[cursor].IsTriviaToken || !host.Data[cursor].IsBasicToken)) {
            cursor++;
          }
          continue;
        }
      }
    }
    // 显式失败：不再静默 break 把剩余单元留给 legacy 在 EOF 报「语句没有读完」（r7 §3 根因）。
    throw new Error("语句没有读完：EOF 尾段无法按语句切分");
  }
```

之后：`xl_build(paths=[这两个文件])` → `tsc -p tsconfig.json` → dev 组。

## 4. 环境坑（本轮踩到，务必记下）

- `node_modules/.bin` 里没有 `xl`，`npx xl` 报 "could not determine executable to run"；
  只有 DSH 的 `xl_build` 工具能重建 `dist/ts`。改完 `*.xl.md` 必须走 `xl_build` 再 `tsc`，
  否则 `build/ts` 还是旧代码（本轮第一次「验证」因此是假绿/假红）。
- 用 PowerShell 写 `*.xl.md` 会带 BOM 与 CRLF，`xl build` 直接 E0005 拒绝。要用
  `[System.IO.File]::WriteAllText($p, $text, (New-Object System.Text.UTF8Encoding($false)))` 且文本用 LF。

## 5. 未覆盖清单

1. `as T` ⏎ `(`（§2.3）：需扩 `StatementScanner.IsCallPositionBlocked` 的类型断言分支；或给
   `dev-as-const-crossline-tail` 标 `knownBaselineFail: true`（harness 已支持，计 `known` 不计 fail）并写明期望行为。
2. 前缀 `++`/`--` 的反向 restricted production（`a` ⏎ `++b`）未验。
3. r7 §5 其余项不变：类型段尾行注释（整文件 token-ast crash）、`satisfies`、类型实参、`{` 二义。

## 6. 开关最终值

`StatementRouteUtil.EnableShellExpressions = false`（dev 组仍 18/22，不打开；默认 false 态 = r6 基线全绿）。

## 7. 预算说明

本轮工具调用 12 轮（超出 9 轮建议/10 轮硬上限）：插桩 2 轮、编码踩坑 1 轮、回滚与补 HANDOFF 1 轮。
没有伪造任何绿：dev 18/22、token-ast 0 crash 均为实测。
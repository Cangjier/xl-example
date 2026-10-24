# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ItemScanState } from "../../../core/syntax/batch/item-scan-state.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

枚举体成员 item 的公共判据：从 `EnumMemberPossibleUtil`（`enum-member-shape-rule.xl.md`）逐字搬出的算法，
去掉 possible / 槽位缓存协议，改成读写 `core/syntax/batch/item-scan-state`。

枚举成员的语法是封闭的：`名字 [= 初始化器]`，名字可以是 Identifier / StringLiteral / NumericLiteral / 计算名 `[...]`，
成员之间只有**顶层逗号**（初始化器里的逗号都在括号 / 字符串 / 模板里，是单个 Unit，不会出现在本层）。
所以边界判据只有两条（与 `EnumDeclarationShape.BuildMembers` 的顶层逗号切分同口径）：

1. 条目里出现顶层 `,`：成员在逗号前一个代码单元收住（逗号**不**进成员区间——`BuildMembers` 也是这样切的）；
2. 否则最后一个代码单元之后的下一个字符是容器收口字符 `}` / EOF：本层不会再有代码单元，最后一条成员立刻收口。

**不**把「换行后的下一成员起点」当边界：`EnumDeclarationShape.BuildMembers` 只按逗号切分，`enum E { A B }` 这种
缺逗号的恢复形在整段路径里会抛「枚举成员缺少等号」。候选如果提前按换行切开，会把这个（既有的）恢复行为改成两条成员，
AST 就不再与重构前一致——所以这类条目**不建**，留给收口时的 raw 兜底按原口径恢复。

# class EnumMemberItemUtil

## static method TextOf:(unit:Token)=>string

代码单元文本；字符串 / 括号只给占位串（判型只关心「是不是名字 / 是不是分隔符」）。

```ts
if (unit instanceof Common) {
  return (unit as Common).TempToString();
}
if (unit instanceof Symbol) {
  return (unit as Symbol).TempToString();
}
if (unit instanceof String) {
  return "string";
}
if (unit instanceof Bracket) {
  return "bracket";
}
return "";
```

## static method IsSeparator:(unit:Token)=>bool

顶层分隔符：只有 `,`（枚举成员不用 `;` 分隔；`;` 出现就是恢复形，留给 raw 兜底）。

```ts
if (!(unit instanceof Symbol)) {
  return false;
}
return (unit as Symbol).Is(",");
```

## static method IsNameToken:(unit:Token)=>bool

能不能当枚举成员名：标识符（含关键字形态的 Common）/ 字符串字面量 / 计算名 `[...]`。

```ts
if (unit instanceof Common || unit instanceof String) {
  return true;
}
return unit instanceof Bracket && (unit as Bracket).StartBracketChar === "[";
```

## static method NextChar:(last:SourceRange | null)=>string

`last` 之后（`last.EndIndex` 起）的下一个字符，跳过空白与 `//` / `/* */` 注释；越界返回空串。

枚举体最后一个成员的收口判据要用它回答「最后一个代码单元后面是不是 `}` / EOF」——那个字符可能还没被 token 化。

```ts
if (last === null || last.EndIndex < 0 || last.Document === null) {
  return "";
}
const document = last.Document;
const count = document.GetCount();
const whole = SourceRange.Whole(document);
let at = last.EndIndex;
while (at < count) {
  const ch = whole.At(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\v"
    || ch === "\f" || ch === "\u2028" || ch === "\u2029") {
    at++;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const next = whole.At(at + 1);
    if (next === "/") {
      at += 2;
      while (at < count && whole.At(at) !== "\n") {
        at++;
      }
      continue;
    }
    if (next === "*") {
      at += 2;
      while (at + 1 < count && !(whole.At(at) === "*" && whole.At(at + 1) === "/")) {
        at++;
      }
      at += 2;
      continue;
    }
  }
  return ch;
}
return "";
```

## static method IsCompletionBoundary:(ch:string)=>bool

容器收口字符。枚举体只有 `}` / EOF 两种（`;` / `,` 是显式分隔符，不在这里）。

```ts
return ch === "" || ch === "}";
```

## static method NameAt:(code:Array<Token>)=>int

成员名在代码前缀里的下标：跳过前导分隔符（恢复形里残留的 `,`）后的第一个单元；没有可当名字的单元时返回 `-1`。

```ts
let nameAt = 0;
while (nameAt < code.length && EnumMemberItemUtil.IsSeparator(code[nameAt])) {
  nameAt++;
}
if (nameAt >= code.length) {
  return -1;
}
return nameAt;
```

## static method EndAt:(code:Array<Token>, nameAt:int)=>int

成员最后一个代码单元的下标：名字之后第一个顶层分隔符的前一格；没有分隔符就是最后一个代码单元。

```ts
for (let at = nameAt + 1; at < code.length; at++) {
  if (EnumMemberItemUtil.IsSeparator(code[at])) {
    return at - 1;
  }
}
return code.length - 1;
```

## static method BasePos:(host:Token, start:int)=>int

成员形状的 `Pos` 口径，与 `EnumDeclarationShape.BuildMembers` 里手算的 `memberPos` 完全相同：
条目第一个代码单元前面最近一个非 trivia 单元的 `EndIndex`；前面什么都没有时用宿主起点 + 1
（`BuildMembers` 的初始 `memberPos = bracket.SourceRange.StartIndex + 1`）。

```ts
if (start > 0) {
  for (let at = start - 1; at >= 0; at--) {
    if (!host.Data[at].IsTriviaToken) {
      const previousEnd = host.Data[at].SourceRange.EndIndex;
      if (previousEnd >= 0) {
        return previousEnd;
      }
      break;
    }
  }
}
if (host.SourceRange.StartIndex < 0) {
  return 0;
}
return host.SourceRange.StartIndex + 1;
```

## static method Analyze:(code:Array<Token>, codeAt:Array<int>, state:ItemScanState)=>void

把「当前条目」的收口结论写进 `state`（`Complete` / `End`）。空条目 / 纯 trivia / 纯分隔符 / 不认识的头
一律「还不完整」：本族只有一个规则，不建就整段留 raw，绝不能提前收口。

`End` 是成员最后一个代码单元在**宿主 `Data`** 里的下标（`CodeAt` 映射），`Analyze` 之后 `Build` 用同一份
`Code` 前缀切成员区间，所以增量路径与 raw 路径的建造器入参逐字等价。

```ts
state.Complete = false;
state.End = -1;
const nameAt = EnumMemberItemUtil.NameAt(code);
if (nameAt < 0) {
  return;
}
if (!EnumMemberItemUtil.IsNameToken(code[nameAt])) {
  // 不认识的头（恢复形）：不建，整段原样留给收口时的 raw 兜底。
  return;
}
const endAt = EnumMemberItemUtil.EndAt(code, nameAt);
if (endAt < nameAt || endAt >= code.length) {
  return;
}
if (endAt + 1 < code.length) {
  // 顶层逗号：成员在逗号前一个代码单元收住。
  state.Complete = true;
  state.End = codeAt[endAt];
  return;
}
const last = code[endAt];
if (EnumMemberItemUtil.IsCompletionBoundary(EnumMemberItemUtil.NextChar(last.SourceRange))) {
  state.Complete = true;
  state.End = codeAt[endAt];
}
```

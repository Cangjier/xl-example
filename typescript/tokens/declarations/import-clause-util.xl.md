# dependencies
```xl
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class ImportClauseUtil

`import` 子句的**词法判据**（相位修饰符与会话）：这些判据只看关键字后面的原始字符，
不依赖任何 possible 候选、缓存或目录向导。原先住在子句候选壳的静态方法里，
切壳后搬到本文件，直接建造入口（`ImportDeclarationShape.FromUnits`）与子句壳共用同一份口径。

## static method IsDeferPhaseModifier:(unit:Token)=>bool

Raw lookahead after `defer`: `import defer from "m"` is a default import named `defer`, every other
continuation (`*`, `{`, or a name) makes `defer` a phase modifier (TS 6.0.3: ImportClause.phaseModifier).

```ts
const range = unit.SourceRange;
const document = range.Document;
if (document === null || range.End < 0) {
  return false;
}
const count = document.GetCount();
const whole = SourceRange.Whole(document);
let at = range.EndIndex;
while (at < count) {
  const ch = whole.At(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\v" || ch === "\f") {
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
  break;
}
if (at >= count) {
  return false;
}
let word = "";
while (at < count) {
  const ch = whole.At(at);
  if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || (ch >= "0" && ch <= "9") || ch === "_" || ch === "$") {
    word += ch;
    at++;
    continue;
  }
  break;
}
return !(word === "from");
```

## static method IsTypePhaseModifier:(unit:Token)=>bool

`import type …` 里的 `type` 是**类型相位修饰符**还是默认导入名，取决于它后面那一格
（TS 的 `parseImportDeclarationOrImportEqualsDeclaration` 对 `type` 的 lookahead）：

- 后面是 `{` / `*` → 修饰符（`import type { A }` / `import type * as ns`）；
- 后面是标识符 → 修饰符（`import type A from "m"`）；
- 后面是 `from` → **只有** `from` 之后还是 `from` 或 `=` 时才是修饰符
  （`import type from from "m"` / `import type from = require(…)`）；
  否则 `type` 就是默认导入名（`import type from "m"` = ImportClause.name "type"）；
- 其它（`,` / 字符串 / `;` / 到头）→ 默认导入名（`import type, { A } from "m"`）。

与 TS 同口径；`defer` 的同款判据见 `IsDeferPhaseModifier`。

```ts
const range = unit.SourceRange;
const document = range.Document;
if (document === null || range.End < 0) {
  return false;
}
const count = document.GetCount();
const whole = SourceRange.Whole(document);
let at = range.EndIndex;
while (at < count) {
  const ch = whole.At(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\v" || ch === "\f") {
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
  break;
}
if (at >= count) {
  return false;
}
const first = whole.At(at);
if (first === "{" || first === "*") {
  return true;
}
if (!((first >= "a" && first <= "z") || (first >= "A" && first <= "Z") || first === "_" || first === "$")) {
  return false;
}
let word = "";
while (at < count) {
  const ch = whole.At(at);
  if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || (ch >= "0" && ch <= "9") || ch === "_" || ch === "$") {
    word += ch;
    at++;
    continue;
  }
  break;
}
if (word !== "from") {
  return true;
}
// `type from …`：还要看 `from` 之后是不是 `from` / `=`。
while (at < count) {
  const ch = whole.At(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\v" || ch === "\f") {
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
  break;
}
if (at >= count) {
  return false;
}
if (whole.At(at) === "=") {
  return true;
}
let after = "";
while (at < count) {
  const ch = whole.At(at);
  if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || (ch >= "0" && ch <= "9") || ch === "_" || ch === "$") {
    after += ch;
    at++;
    continue;
  }
  break;
}
return after === "from";
```

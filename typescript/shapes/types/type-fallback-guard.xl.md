# dependencies
```xl
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TypeBodyUtil } from "./type-body-util.xl.md"
import { TypeRouteUtil } from "./type-route-util.xl.md"
```


# namespace cangjie

# class TypeFallbackGuard

## static method Hit:(phase:string, form:string)=>void

```ts
// 「Close 全量兜底」的收口点。开关关（默认）→ 立即返回，调用点照旧走 TypeParserApi.ParseAlias，
// 行为与 T0 之前完全一致（回退开关 = type-route-util 的 EnableIncrementalTypes）。
// 开关开 → 说明还有形态没被逐字增量覆盖，此时全量解析会把问题静默吞掉，所以直接报错。
if (!TypeRouteUtil.IsIncrementalTypesEnabled()) {
  return;
}
const label = form.length > 0 ? form : phase;
throw new Error("增量变量形状未支持：type " + label);
```

## static method Describe:(units:Array<Token>)=>string

```ts
// 兜底点的形态名：只看别名体（顶层 `=` 之后）的第一个代码单元。
// 仅供报错文案使用，不参与任何构建判定。
const body = TypeFallbackGuard.BodyIndex(units);
if (body < 0) {
  return "空体";
}
const unit = units[body];
if (unit instanceof Symbol) {
  const text = unit.TempToString();
  if (text === "{") {
    return TypeFallbackGuard.IsMappedBody(units, body) ? "映射类型" : "对象字面量";
  }
  if (text === "[") {
    return "元组类型";
  }
  if (text === "(") {
    return "函数类型";
  }
  return "符号 " + text;
}
if (unit instanceof String) {
  return unit.IsSupportInterpolation ? "模板字面量类型" : "字符串字面量类型";
}
if (unit instanceof Common) {
  const text = unit.TempToString();
  if (text === "keyof" || text === "readonly" || text === "unique") {
    return "类型运算符 " + text;
  }
  if (TypeBodyUtil.IsKeywordTypeText(text)) {
    return "关键字类型 " + text;
  }
  return "类型引用 " + text;
}
return "未识别形态";
```

## private static method BodyIndex:(units:Array<Token>)=>int

```ts
// 顶层 `=` 之后第一个非 trivia 单元的下标；找不到返回 -1。
// 取「最后一个」顶层 `=`，这样 `type A<T = string> = ...` 的默认值不会把别名体认错。
let depth = 0;
let body = -1;
for (let at = 0; at < units.length; at++) {
  const unit = units[at];
  if (!(unit instanceof Symbol)) {
    continue;
  }
  const text = unit.TempToString();
  if (text === "(" || text === "[" || text === "{") {
    depth++;
    continue;
  }
  if (text === ")" || text === "]" || text === "}") {
    depth--;
    continue;
  }
  if (text === "=" && depth === 0) {
    body = at + 1;
  }
}
if (body < 0) {
  return -1;
}
for (let at = body; at < units.length; at++) {
  if (!units[at].IsTriviaToken) {
    return at;
  }
}
return -1;
```

## private static method IsMappedBody:(units:Array<Token>, bodyIndex:int)=>bool

```ts
// `{ [K in T]: ... }` / `{ readonly [K in T]: ... }` / `{ +readonly [K in T]: ... }`。
let at = TypeFallbackGuard.NextCode(units, bodyIndex + 1);
if (at < 0) {
  return false;
}
const first = units[at];
if (first instanceof Common && first.TempToString() === "readonly") {
  at = TypeFallbackGuard.NextCode(units, at + 1);
} else if (first instanceof Symbol && (first.Is("+") || first.Is("-"))) {
  at = TypeFallbackGuard.NextCode(units, at + 1);
  if (at >= 0) {
    const readonly = units[at];
    if (readonly instanceof Common && readonly.TempToString() === "readonly") {
      at = TypeFallbackGuard.NextCode(units, at + 1);
    }
  }
}
if (at < 0) {
  return false;
}
const open = units[at];
if (!(open instanceof Symbol) || !open.Is("[")) {
  return false;
}
at = TypeFallbackGuard.NextCode(units, at + 1);
if (at < 0) {
  return false;
}
const name = units[at];
if (!(name instanceof Common)) {
  return false;
}
at = TypeFallbackGuard.NextCode(units, at + 1);
if (at < 0) {
  return false;
}
const inUnit = units[at];
return inUnit instanceof Common && inUnit.TempToString() === "in";
```

## private static method NextCode:(units:Array<Token>, from:int)=>int

```ts
let at = from;
while (at >= 0 && at < units.length && units[at].IsTriviaToken) {
  at++;
}
return at < 0 || at >= units.length ? -1 : at;
```

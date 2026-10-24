# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class VariableDeclarationScan

Stage 5c 三层 possible 的**声明级**累积状态（独立 util：不继承 `PossibleShape`、不读 `CatalogGuide`、不建树）。

一条声明 = `名字` + 可选 `!` + 可选 `: 类型` + 可选 `= 初始化器`，在顶层 `,` / `;` / 段末收口。

解构 `{a}` / `[a, b]` 在这棵树里是**一个** `Bracket` 单元（内部单元是它的孩子），所以名字判定只需认
`Common` 或 `Bracket` 两种起点，不需要进括号里数逗号。

## field Stage:int = 0

`0` 等名字，`1` 名字之后，`2` `!` 之后，`3` 类型注解里，`4` 初始化器里。

## field AngleDepth:int = 0

类型 / 初始化器里 `<…>` 的深度：浅层 `,` 是下一条声明，深层 `,` 是泛型实参。

## field NameSeen:bool = false

## field TypeStarted:bool = false

## field InitializerStarted:bool = false

## field Rejected:bool = false

## field Done:bool = false

## field DoneAt:int = -1

收口它的那个单元的下标（`Done` 为真时有效）：顶层 `,` 或 `;`。

# class VariableDeclarationUtil

## static method Advance:(state:VariableDeclarationScan, units:Array<Token>, at:int)=>void

把一个代码单元喂给声明状态机。**只判不建**：不调用 `StatementBuilder`、不写 `Parent`、不改任何 token 字段；
例外是 `state` 自己的字段。列表级与语句级复用同一份实现，判型只有这一处。

```ts
if (at < 0 || at >= units.length) {
  return;
}
const unit = units[at];
if (unit.IsTriviaToken || state.Rejected || state.Done) {
  return;
}
if (state.Stage === 0) {
  if (unit instanceof Common) {
    state.NameSeen = true;
    state.Stage = 1;
    return;
  }
  if (unit instanceof Bracket) {
    const startChar = (unit as Bracket).StartBracketChar;
    if (startChar === "[" || startChar === "{") {
      state.NameSeen = true;
      state.Stage = 1;
      return;
    }
  }
  state.Rejected = true;
  return;
}
if (state.Stage === 1 || state.Stage === 2) {
  if (unit instanceof Symbol) {
    const text = (unit as Symbol).TempToString();
    if (text === "!" && state.Stage === 1) {
      state.Stage = 2;
      return;
    }
    if (text === ":") {
      state.Stage = 3;
      state.TypeStarted = true;
      return;
    }
    if (text === "=") {
      state.Stage = 4;
      state.InitializerStarted = true;
      return;
    }
    if (text === "," || text === ";") {
      state.Done = true;
      state.DoneAt = at;
      return;
    }
  }
  state.Rejected = true;
  return;
}
const text = unit instanceof Symbol ? (unit as Symbol).TempToString() : "";
if (text === "<") {
  state.AngleDepth = state.AngleDepth + 1;
  return;
}
if (text === ">" || text === ">>" || text === ">>>") {
  const close = text === ">" ? 1 : (text === ">>" ? 2 : 3);
  state.AngleDepth = state.AngleDepth - close;
  if (state.AngleDepth < 0) {
    state.AngleDepth = 0;
  }
  return;
}
if (state.AngleDepth === 0) {
  if (state.Stage === 3 && text === "=") {
    state.Stage = 4;
    state.InitializerStarted = true;
    return;
  }
  if (text === "," || text === ";") {
    state.Done = true;
    state.DoneAt = at;
  }
}
```

## static method VerifyItems:(units:Array<Token>)=>int

声明级自己把这一串切条并逐条判：返回**成立的条目数**，任何一条不成立返回 `-1`。
入参是「关键字之后」的单元（列表级已经吃掉关键字并判过族）。

与列表级的条数交叉核对：两层不一致时不接管（宁可回退，不建可疑树）。

```ts
if (units.length <= 0) {
  return -1;
}
let items = 0;
let state = new VariableDeclarationScan();
for (let at = 0; at < units.length; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  VariableDeclarationUtil.Advance(state, units, at);
  if (state.Rejected) {
    return -1;
  }
  if (!state.Done) {
    continue;
  }
  let comma = false;
  if (state.DoneAt >= 0 && state.DoneAt < units.length && units[state.DoneAt] instanceof Symbol) {
    comma = (units[state.DoneAt] as Symbol).TempToString() === ",";
  }
  if (!comma) {
    return state.NameSeen ? items + 1 : -1;
  }
  items = items + 1;
  state = new VariableDeclarationScan();
}
if (state.Rejected) {
  return -1;
}
if (state.NameSeen) {
  items = items + 1;
}
return items > 0 ? items : -1;
```

# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class VariableDeclarationScan

## field Stage:int = 0

## field AngleDepth:int = 0

## field NameSeen:bool = false

## field TypeStarted:bool = false

## field InitializerStarted:bool = false

## field Rejected:bool = false

## field Done:bool = false

## field DoneAt:int = -1

# class VariableDeclarationUtil

## static method Advance:(state:VariableDeclarationScan, units:Array<Token>, at:int)=>void

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

# dependencies
```xl
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { StatementBoundaryUtil } from "./statement-boundary-util.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class IncrementalStuckShellRecovery

## static field RecoveryCells:int = 2

```ts
2
```

## static field ForceClose:bool = false

```ts
false
```

## static method IsStatementStartWord:(text:string)=>bool

```ts
if (text.length === 0) {
  return false;
}
return text === "for" || text === "if" || text === "switch" || text === "while"
  || text === "do" || text === "try" || text === "function" || text === "class"
  || text === "const" || text === "let" || text === "var" || text === "return"
  || text === "throw" || text === "break" || text === "continue" || text === "debugger"
  || text === "import" || text === "export" || text === "interface" || text === "enum"
  || text === "type" || text === "namespace" || text === "declare" || text === "using";
```

## static method StartsStatement:(unit:Token)=>bool

```ts
if (unit === null || unit === undefined) {
  return false;
}
if (!(unit instanceof Common)) {
  return false;
}
return IncrementalStuckShellRecovery.IsStatementStartWord((unit as Common).TempToString());
```

## static method ShouldRecover:(units:Array<Token>, waitingCells:int)=>bool

```ts
if (!StatementRouteUtil.EnableStuckShellRecovery) {
  return false;
}
if (waitingCells < IncrementalStuckShellRecovery.RecoveryCells) {
  return false;
}
if (units.length === 0) {
  return false;
}
return StatementBoundaryUtil.IsDeclarationFollowBoundary(units, units.length - 1);
```

## static method NoteRecovery:()=>void

```ts
StatementRouteUtil.StuckShellRecoveryCount += 1;
```

## static method CanForceClose:()=>bool

```ts
return StatementRouteUtil.EnableStuckShellRecovery && IncrementalStuckShellRecovery.ForceClose;
```

## static method CountEofLeftover:(units:Array<Token>)=>bool

```ts
let firstBasic = -1;
for (let at = 0; at < units.length; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (!unit.IsBasicToken) {
    continue;
  }
  firstBasic = at;
  break;
}
if (firstBasic < 0) {
  return false;
}
if (!IncrementalStuckShellRecovery.StartsStatement(units[firstBasic])) {
  return false;
}
StatementRouteUtil.EofDiscardedStatementCount += 1;
return true;
```

## static method LeftoverText:(units:Array<Token>)=>string

```ts
const parts:Array<string> = [];
let count = 0;
for (const unit of units) {
  if (unit.IsTriviaToken) {
    continue;
  }
  if (!unit.IsBasicToken) {
    continue;
  }
  if (unit instanceof Common) {
    let text = (unit as Common).TempToString();
    if (text.length > 0) {
      parts.push(text);
    }
  }
  count += 1;
  if (count >= 24) {
    break;
  }
}
return parts.join(" ");
```

# dependencies
```xl
import { BlockToken } from "../block-token.xl.md"
import { Branch } from "../branch.xl.md"
import { BranchConditionResult } from "../branch-condition-result.xl.md"
import { CloseStates } from "../close-states.xl.md"
import { ReloadMessage } from "../messages/reload-message.xl.md"
import { Source } from "../source.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { Template } from "../templates/template.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

空白块：空格 / `\t` / `\r` / `\n` 的连续段收成一个单元。

**为什么空白也要有 token。** basic token 要能把源码文本完整表达出来——`Data` 里攒的就是那段源码的记号序列。空白不是语法结构，但它占字符；没有它，"`import` 后面跟了几个空格"这种事实在树里就丢了。

它是 **trivia**（`IsTriviaToken`）：判形状时一律跳过，收进形状后由形状 `Close` 提取字段时丢弃。所以"有 token"与"进 AST"是两件事——空白只进 `Data`，不进形状的字段。

它的 `Close` **不问父单元要不要重算候选**：空白永远不是任何一个形状的收尾，问了只会让候选目录在一个判不出东西的下标上打转。

`WrapSymbolBranch` 写在 `WrapSymbol` **之前**：`WrapSymbol.AppendIn` 这个静态字段会在类定义时立即 `new WrapSymbolBranch()`，写反了会命中 ts 的暂时性死区。

# class WrapSymbolBranch extends Branch

空白块的跳转规则：当前字符是空白就接手；上一个 `WrapSymbol` 没关闭就续进去，否则开新块。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

上一个单元是未关闭的 `WrapSymbol` 时按它的 `IsAppend` 决定追加（`Message = 1`）；否则看当前字符是不是空白，是就开新块（`Message = 0`）。

```ts
const last = unit.Last();
const result = new BranchConditionResult();
if (last instanceof WrapSymbol && !last.Closed) {
  result.Success = last.IsAppend(source);
  result.Message = 1;
  return result;
}
result.Success = unit.Template.SymbolTemplate.IsWhiteSpace(source.Value);
result.Message = 0;
return result;
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

`Message` 为 `0` 就开一个新 `WrapSymbol` 并签入；为 `1` 就追加到上一个。

新建时**先看关闭的结果**（`State`）：关闭上一个 token 的过程可能建出了形状，当前字符要 reload 给新形状重吃。`Created` 只是结果，不拿它当判据。

```ts
if (result.Message === 0) {
  const created = unit.AddAndCloseLast(new WrapSymbol(unit.Template));
  if (created.State === CloseStates.Built) {
    context.Messages.push(new ReloadMessage(unit, unit, source));
    return;
  }
  created.Created!.AppendAndSignOut(source).SignIn(source);
} else {
  (unit.Last() as WrapSymbol)!.AppendAndSignOut(source);
}
```

## method Failed:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

失败时把上一个 `WrapSymbol` 关闭——它是一整段空白，遇到非空白就该收尾。

```ts
const last = unit.Last();
if (last instanceof WrapSymbol) {
  last.TryToClose();
}
```

# class WrapSymbol extends BlockToken

空白块。

单元值类型是单字符的 `string`。

## field IsBasicToken:bool = true

basic 单元：由 `Template.BasicBranchQueue()` 收出来。

## field IsTriviaToken:bool = true

trivia 单元：判形状时跳过。

## static readonly field AppendIn:WrapSymbolBranch = new WrapSymbolBranch()

注册进通用跳转队列用的实例。

## constructor:(Template:Template)=>void

转调基类构造器。

```ts
super(Template);
```

## method IsAppend:(Src:Source)=>bool

能不能把 `Src` 并进本块：是空白就行——空白不像组合符号那样需要看前文。

```ts
return this.Template.SymbolTemplate.IsWhiteSpace(Src.Value);
```

## protected method Close:()=>CloseStates

关闭：只把自己标记为已关闭，返回 `Nothing`，**不问父单元**。

空白不参与形状判定，所以收尾时没有任何"候选可能定下来"的事要报告；它自己的关闭也不会触发形状建造。

```ts
this.Closed = true;
return CloseStates.Nothing;
```

## method Clone:()=>Token

克隆自身。顺序是 `Sign(this)` → 把 `Temp` 追加到自身 → `TryToClose()`。

```ts
const result = new WrapSymbol(this.Template);
result.Sign(this);
result.Temp.push(...this.Temp);
result.TryToClose();
return result;
```

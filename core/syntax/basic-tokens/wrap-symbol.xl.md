# dependencies
```xl
import { BlockToken } from "../block-token.xl.md"
import { BranchStates } from "../branch-states.xl.md"
import { CloseStates } from "../close-states.xl.md"
import { SourceRange } from "../source-range.xl.md"
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

# class WrapSymbol extends BlockToken

空白块。

单元值类型是单字符的 `string`。

## field IsBasicToken:bool = true

basic 单元：由 `Template.BasicBranchQueue()` 收出来。

## field IsTriviaToken:bool = true

trivia 单元：判形状时跳过。

## constructor:(Template:Template)=>void

转调基类构造器。

```ts
super(Template);
```

## method IsAppend:(buffer:SourceRange, index:int)=>bool

能不能把窗口里 `index` 处的字符并进本块：是空白就行——空白不像组合符号那样需要看前文。

```ts
return this.Template.SymbolTemplate.IsWhiteSpace(buffer.At(index));
```

## protected method Close:(context:SyntaxContext)=>CloseStates

关闭：只把自己标记为已关闭，返回 `Nothing`，**不问父单元**。

空白不参与形状判定，所以收尾时没有任何"候选可能定下来"的事要报告；它自己的关闭也不会触发形状建造。

```ts
this.Closed = true;
return CloseStates.Nothing;
```

## static method Transit:(context:SyntaxContext, unit:Token, buffer:SourceRange, index:int)=>BranchStates

当前字符是空白就接手；不是就先关掉还开着的上一个 `WrapSymbol`（它是一整段空白，遇到非空白就该收尾），再让路。

```ts
const last = unit.Last();
if (!unit.Template.SymbolTemplate.IsWhiteSpace(buffer.At(index))) {
  if (last instanceof WrapSymbol && !last.Closed && last.TryToClose(context) === CloseStates.Built) {
    return BranchStates.Reload;
  }
  return BranchStates.Undo;
}
if (last instanceof WrapSymbol && !last.Closed) {
  last.AppendAndSignOut(buffer.At(index), index);
  return BranchStates.Done;
}
if (last !== null && !last.Closed && last.TryToClose(context) === CloseStates.Built) {
  return BranchStates.Reload;
}
unit.Add(new WrapSymbol(unit.Template));
(unit.Last() as WrapSymbol)!.AppendAndSignOut(buffer.At(index), index).SignIn(index);
return BranchStates.Done;
```

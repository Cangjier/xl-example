# dependencies
```xl
import { IOwner } from "../../../owners/i-owner.xl.md"
import { BlockToken } from "../../../core/syntax/block-token.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

临时字符块。它比 `Common` / `Symbol` 更简单：一个 `Temp` 只收一个字符，
再来的字符由 `Symbol` 的分支重新判定归属（`Temp` 只管「先把这一个字符接住」）。

它**没有**覆写 `ToXmlString`，XML 由 `BlockToken` 产出：`<Temp>转义后的文本</Temp>`（标签名是运行时类名 `Temp`，M17）。

# class Temp extends BlockToken

临时字符块。

原 C# 侧是 `public class Temp : BlockToken<char>`。按 M31，`char` 在规范里写 `string`。

## constructor:(owner:IOwner, template:Template)=>void

原 C# 只是转调基类构造器。

```ts
super(owner, template);
```

## method IsAppend:(Src:Source)=>bool

能不能把 `Src` 并进本块——**永远可以**。

原 C# 是 `public override bool IsAppend(Source<char> Src) => true;`。这里照抄原实现的常量返回，
**不要**「顺手修正」成拒绝：`CommonBranch` / `SymbolBranch` 的判定依赖这个返回值（M30 的抽象成员必须给出真实体）。

```ts
return true;
```

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

```ts
this.Closed = true;
```

## method Clone:()=>Token

克隆自身。

原 C# 的顺序是 `Sign(this)` → `Temp.AddRange(Temp)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`。
批量 `Add` 按 M14(c) 改名 `AddRange`；`Temp.AddRange(Temp)` 在 ts 侧照抄成展开推入。

```ts
const result = new Temp(this.Owner, this.Template);
result.Sign(this);
result.Temp.push(...this.Temp);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```

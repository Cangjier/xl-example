# dependencies
```xl
import { BlockToken } from "../../../core/syntax/block-token.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

临时字符块。它比 `Common` / `Symbol` 更简单：一个 `Temp` 只收一个字符，
再来的字符由 `Symbol` 的分支重新判定归属（`Temp` 只管「先把这一个字符接住」）。

它**没有**覆写 `ToXmlString`，XML 由 `BlockToken` 产出：`<Temp>转义后的文本</Temp>`（标签名是运行时类名 `Temp`）。

# class Temp extends BlockToken

临时字符块。

单元值类型是单字符的 `string`。

## constructor:(template:Template)=>void

转调基类构造器。

```ts
super(template);
```

## method IsAppend:(Src:Source)=>bool

能不能把 `Src` 并进本块——**永远可以**。

这里就是常量返回 `true`，**不要**「顺手修正」成拒绝：`CommonBranch` / `SymbolBranch` 的判定依赖这个返回值（基类的抽象成员必须给出真实体）。

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

顺序是 `Sign(this)` → 把 `Temp` 展开推入自身 → 把 `Data` 里每个子单元克隆后整批加入 → `TryToClose()`；
批量加入用 `AddRange`。

```ts
const result = new Temp(this.Template);
result.Sign(this);
result.Temp.push(...this.Temp);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```

# dependencies
```xl
import { LanguageShapeToken } from "../../core/language-shape-token.xl.md"
import { Source } from "../../core/source.xl.md"
import { SyntaxContext } from "../../core/context.xl.md"
import { Template } from "../../core/template.xl.md"
import { Token } from "../../core/token.xl.md"
```

# namespace cangjie

**根容器**：一份源文件是一串单元。

它**不是收敛形态**（池是空的）：下一个单元是哪一个形状，由**第一个字符**与词法表定死，
没有池要收敛。它是 §3 的 C2 里那个「**挂它的那个 shape**」——
每一个形状的池都是它在这里声明出去的。

它接手每一次关闭并返回 `true`：对上面那一层来说，一份源文件就是一格。

# class SourceFileShape extends LanguageShapeToken

## constructor:(template:Template)=>void

根容器没有池（也没有括号那一对）。

```ts
super(template, []);
```

## method OnChildClosed:(child:Token, context:SyntaxContext, source:Source)=>bool

挂载单元关掉了：卸下它，然后接手这次关闭。

（它已经在 `Data` 里了——`Data` 就是这一份源文件的那一串单元。）

```ts
if (this.MountedUnit === child) this.Quit();
return true;
```

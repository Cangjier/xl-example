# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

泛型类型的**占位类型**。

原 C# 侧是 `Dawn/Text/Tokens/GenericType.cs`，整个文件只有一个四行的空类 `public class GenericType { }`。

它既没有基类、没有成员，在整个 C# 工程里也**没有任何一处引用**（`Dawn/Text` 的模板与重组链都只认 `Common` / `Symbol` / `Bracket` 这些真实的 token 类）。
按「一个 C# 文件 = 一个 `*.xl.md`」的规矩照实落成一个空类，不替它编造用途；
`GenericType` 这个名字与运行时类名一致（M17），所以将来若有调用点按名字引用它，不会对不上。

这个文件没有任何 `# dependencies`：空类不需要 import，多 import 一个名字会触发 ts 的 `noUnusedLocals`（§7.5）。

# class GenericType

泛型类型占位类。

原 C# 侧是 `public class GenericType`，无基类、无成员、无构造器——规范里照写一个空类，不写构造器（缺省构造器由打印器产出）。

它**不进**任何重组队列，也不进 `Data` / XML，因此不影响产物 XML。

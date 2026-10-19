# dependencies
```xl
import { Bracket } from "../basic-tokens/bracket.xl.md"
import { Common } from "../basic-tokens/common.xl.md"
import { RegexToken } from "../basic-tokens/regex-token.xl.md"
import { String } from "../basic-tokens/string/string.xl.md"
import { Symbol } from "../basic-tokens/symbol.xl.md"
import { Token } from "../token.xl.md"
```

# namespace cangjie

模板层：每个单元（token）的跳转规则都从 `Template` 上取。

正则模板：**这门语言的正则字面量长什么样**。它只放语言数据（flags 字符集、哪些关键字之后可以起表达式）与「这个 `/` 该不该起正则」的默认判据；字符层状态机（转义 / 字符类 / flags）在 `RegexToken` 里，与语言无关。

判据只看**词法层看得到的事实**：`/` 之前最后一个代码单元是什么。控制头 `)`、裸块 `}` 之后那种「语法上知道下一步是表达式、词法上看不出来」的位置，由语法形状在 `SyntaxContext.RegexStartAfter` 里登记下标，`RegexToken.Transit` 会先查那份登记再做默认判据。

# class RegexTemplate

正则模板。

## field Flags:Array<string> = ["g", "i", "m", "s", "u", "y"]

结尾 `/` 之后算作 flags 的字符。

语言配置可以把它换成自己的一套；ts 更进一步覆写了 `IsFlag`——TS 的词法按 Unicode identifier part 收 flags，`é` / `日` / astral 字母都算，用 `Flags` 数组只能做到 ASCII 近似。

## field ExpressionKeywords:Array<string> = []

后面可以直接跟一个表达式、因此也可以直接跟一个正则字面量的关键字：`typeof` / `void` / `new` / `return` 这类。

## method IsFlag:(value:string)=>bool

这个字符能不能接在结尾的 `/` 后面当 flag。

默认实现查 `Flags` 数组；语言模板可以覆写它来贴合自己词法的精确定义（ts 就是这么做的：按 Unicode identifier part 判定）。

```ts
return this.Flags.includes(value);
```

## method IsOperandEnd:(unit:Token | null)=>bool

这个代码单元是不是一个**已经结束的操作数**：操作数后面再出现 `/` 只可能是除号。

`Common` 里只有表达式关键字不是操作数（`typeof` / `void` / `new` 后面要的是操作数）；标识符、数字、`true` / `false` / `null` / `this` 都是操作数。

`!` / `++` / `--` 的「前缀还是后缀」判定要回看再前一个代码单元，用的就是本方法。

```ts
if (unit === null) {
  return false;
}
if (unit instanceof String || unit instanceof RegexToken || unit instanceof Bracket) {
  return true;
}
if (unit instanceof Common) {
  return !this.ExpressionKeywords.includes((unit as Common).TempToString());
}
return false;
```

## method CanStart:(lastCode:Token | null, previousCode:Token | null)=>bool

`lastCode` 是 `/` 之前最后一个代码单元（跳过 trivia），`previousCode` 是再往前一个。返回「这个位置允许起一个正则字面量」。

- `null`：本单元还没有代码单元（文件开头 / 括号内开头 / 重放后开头）——起正则；
- 不是 basic token（已经建出来的语句形状）：语句边界，下一格必然是新语句——起正则；
- `String` / `RegexToken`：操作数已结束——除号；
- `Bracket`：括号整体是操作数——除号（`{}` 作裸块的情况由 `RegexStartAfter` 的位置登记否决）；
- `Common`：是表达式关键字才起正则，其余都是操作数；
- `Symbol`：`!` / `++` / `--` 既可能是前缀也可能是后缀，看它前面是不是操作数；其余符号（`=` / `,` / `:` / `?` / `&&` / `=>` 等）后面都以操作数开头——起正则；
- 其余类型（理论上到不了）按除号处理。

```ts
if (lastCode === null) {
  return true;
}
if (!lastCode.IsBasicToken) {
  return true;
}
if (lastCode instanceof String || lastCode instanceof RegexToken || lastCode instanceof Bracket) {
  return false;
}
if (lastCode instanceof Common) {
  return this.ExpressionKeywords.includes((lastCode as Common).TempToString());
}
if (lastCode instanceof Symbol) {
  const text = (lastCode as Symbol).TempToString();
  if (text === "!" || text === "++" || text === "--") {
    return !this.IsOperandEnd(previousCode);
  }
  return true;
}
return false;
```

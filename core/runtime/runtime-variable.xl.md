# dependencies
```xl
import { RuntimeObject } from "./runtime-object.xl.md"
```

# namespace cangjie

运行时作用域里的一条变量绑定。

# class RuntimeVariable

运行时变量：名字加值。

## field Name:string = ""

变量名。原 C# 侧是 `string Name { get; set; } = string.Empty`。

## field Value:RuntimeObject

变量值。

原 C# 侧是无初始化器的 `RuntimeObject Value { get; set; }`，依赖 `default(RuntimeObject)`——两个字段都是 `null`。ts 的严格属性初始化不允许无初值的字段，因此这里显式写出等价的默认值。
```ts
new RuntimeObject(null, null)
```

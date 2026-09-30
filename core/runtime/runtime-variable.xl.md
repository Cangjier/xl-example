# dependencies
```xl
import { RuntimeObject } from "./runtime-object.xl.md"
```

# namespace cangjie

运行时作用域里的一条变量绑定。

# class RuntimeVariable

运行时变量：名字加值。

## field Name:string = ""

变量名。

## field Value:RuntimeObject

变量值。

ts 的严格属性初始化不允许无初值的字段，因此这里显式写出默认值：`Type` 与 `Value` 都是 `null`。
```ts
new RuntimeObject(null, null)
```

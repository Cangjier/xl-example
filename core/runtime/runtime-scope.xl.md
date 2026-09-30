# dependencies
```xl
import { RuntimeObject } from "./runtime-object.xl.md"
import { RuntimeScopeType } from "./runtime-scope-type.xl.md"
import { RuntimeVariable } from "./runtime-variable.xl.md"
```

# namespace cangjie

运行时作用域：一张变量表加一个控制流类型标记。执行器里每一层块、循环、函数返回点、`try` 都是一个 `RuntimeScope`。

# class RuntimeScope

运行时作用域。

xl 的 `implements` 只能列规范内声明的接口，BCL 接口写在正文；`Dispose` / `DisposeAsync` 本身仍是规范内成员。

## field Type:RuntimeScopeType = RuntimeScopeType.Common

作用域类型。默认值是首项 `Common`，这里显式写出。

## field Variables:Map<string,RuntimeVariable> = new Map()

变量表，键是变量名。xl 用中立容器名 `Map`，ts 侧直接暴露字段。

## method ContainsKey:(key:string)=>bool

是否已绑定 `key`。

```ts
return this.Variables.has(key);
```

## method TryGetValue:(key:string)=>RuntimeObject | null

按键取值；未绑定时返回 `null`。

xl 没有输出参数，规范统一改写成「返回可空值」的查询方法；调用方先 `ContainsKey` 再取值即可。

```ts
return this.Variables.get(key)?.Value ?? null;
```

## method Update:(key:string, value:RuntimeObject)=>bool

更新一个已存在的绑定；键不存在时返回 `false`，且不新建。

```ts
const variable = this.Variables.get(key);
if (variable === undefined) {
  return false;
}
variable.Value = value;
return true;
```

## method Register:(key:string, value:RuntimeObject)=>void

绑定或覆盖 `key`。

```ts
const variable = this.Variables.get(key);
if (variable === undefined) {
  const created = new RuntimeVariable();
  created.Name = key;
  created.Value = value;
  this.Variables.set(key, created);
  return;
}
variable.Value = value;
```

## method CopyTo:(scope:RuntimeScope)=>void

把本作用域的全部绑定复制进 `scope`，同键覆盖。

```ts
for (const [key, value] of this.Variables) {
  scope.Variables.set(key, value);
}
```

## method Dispose:()=>void

清空变量表。

```ts
this.Variables.clear();
```

## method DisposeAsync:async ()=>void

`IAsyncDisposable` 适配：转调 `Dispose`。

```ts
this.Dispose();
```

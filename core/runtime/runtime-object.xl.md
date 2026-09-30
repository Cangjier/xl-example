# namespace cangjie

运行时对象的统一装箱表示：一个值加上它的静态类型。执行器里所有值的传递都以 `RuntimeObject` 为单位。

# class RuntimeObject

运行时对象。

xl 的关键字表里只有 `class`，值语义的类型一律声明成 `# class`，目标语言的值类型形状写在正文里。

## field Type:any

对象的静态类型。

中立类型表里没有对应写法，这里记为 `any`（ts 侧同样是 `any`）。

## field Value:any

对象的实际值，可以为 `null`。

## constructor:(type:any, value:any)=>void

以显式类型构造。

xl 规定一个类至多一个构造器（`E1206`），所以只保留参数最全的这一个。

默认值（`Type` 与 `Value` 都是 `null`）的写法是 `new RuntimeObject(null, null)`。

```ts
this.Type = type;
this.Value = value;
```

## method ToString:()=>string

对象的调试字符串。

xl 不做重写标注：`override` 属于目标语言细节。

```ts
return `type=${this.Type},value=${this.Value}`;
```

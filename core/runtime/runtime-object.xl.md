# namespace cangjie

运行时对象的统一装箱表示：一个值加上它的静态类型。执行器里所有值的传递都以 `RuntimeObject` 为单位。

# class RuntimeObject

运行时对象。

原 C# 侧是 `struct RuntimeObject`（值类型）。xl 的关键字表里只有 `class`，值语义的类型一律声明成 `# class`，目标语言的值类型形状写在正文里。

## field Type:any

对象的静态类型。

原 C# 侧是 `System.Type`；中立类型表里没有对应写法，这里记为 `any`（ts 侧同样是 `any`）。

## field Value:any

对象的实际值，可以为 `null`。

## constructor:(type:any, value:any)=>void

以显式类型构造。

原 C# 侧还有一个单参重载 `RuntimeObject(object? value)`（类型取值的实际类型）。xl 规定一个类至多一个构造器（`E1206`），所以只保留参数最全的这一个；被省略的那个重载把原签名记在这段正文里。

原项目现有的调用点用的都是值类型 struct 的隐式无参默认值 `new RuntimeObject()`；ts 侧的等价写法是 `new RuntimeObject(null, null)`（`Type` 与 `Value` 都是 `null`）。

```ts
this.Type = type;
this.Value = value;
```

## method ToString:()=>string

对象的调试字符串。

原 C# 侧是 `public override string ToString()`；xl 不做重写标注，`override` 属于目标语言细节。

```ts
return `type=${this.Type},value=${this.Value}`;
```

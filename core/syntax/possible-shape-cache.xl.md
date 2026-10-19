# dependencies
```xl
import { SyntaxContext } from "./syntax-context.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

形状判定的缓存：**每个形状一个槽**——键是形状名，值是这个形状自己那一份判定状态。形状在自己名下读写，不必自己拼键名，形状之间也不会撞。

状态是每个形状自己立的**具名类**（各形状的 `…Scan`）。底层只能写 `any`：xl 的类型标注不接受 `{[key:string]:any}`（`E1204`），`Map<string, any>` 是这套规范里唯一能写的字符串键映射——明确性由取值那一侧的泛型补回来（与 `SyntaxContext.GetDefault` 同款）。

# type PossibleStateComputer = (units:Array<Token>, tokenIndex:number, context:SyntaxContext, state:any)=>void

「建状态」的委托：拿到缓存里那个状态对象，把扫描起点等初始字段写上去。返回值没有意义，写没写上看 `stateField` 在不在。

参数里的 `number` 不能写成 `int`：类型别名里的类型是**原文照抄**进产物的，`int` 只方法形参那一层才换成 `number`。

# class PossibleShapeCache

```txt
const state = cache.GetOrComputeState<ImportDeclarationScan>(name, "Start", units, tokenIndex, context, (units, tokenIndex, context, state) => {
  state.Start = ItemUtil.ItemStart(units);
  state.At = state.Start - 1;
  state.Stage = 0;
});
```

## field Values:Map<string, any> = new Map()

形状名 → 该形状的判定状态。

## method GetState:<Item>(possibleShapeName:string)=>Item | null

取这个形状的状态；还没写过给 `null`。类型由调用方点明：`cache.GetState<XxxScan>(name)`。

```ts
if (this.Values.has(possibleShapeName)) {
  return this.Values.get(possibleShapeName) as Item;
}
return null;
```

## method GetOrComputeState:<Item>(possibleShapeName:string, stateField:string, units:Array<Token>, tokenIndex:int, context:SyntaxContext, compute:PossibleStateComputer)=>Item | null

取这个形状的状态；**这份状态还没有时**建一个空对象，再让 `compute` 把初始字段写上去。

`stateField` 是**状态对象上的一个键**，用来标记「这份状态建好了」——一般取 `compute` 会写的那第一个字段（例如 `Start`）。判定顺序：

- 缓存里这个槽还是空的 → 建 `{}` 放进去；
- `stateField` 不在状态对象上 → 调 `compute(units, tokenIndex, context, state)`；
- 调完再查一次，`stateField` 还不在 → **抛错**：`compute` 漏写状态，静默放过去只会每轮都重算；
- 返回这份状态（整体交给调用方的 `Item`），调用方再在它上面做增量扫描。

`compute` **只在建状态那一轮跑**：状态建好之后每次判定直接返回同一份对象，扫描游标由形状自己在外面往后推——这样就不会每轮都从头遍历。

空对象**没有类字段的默认值**：`…Scan` 里每个字段（包括 `0` / `false` 这类默认值）都要在 `compute` 里补上，否则扫描读到的就是 `undefined`。

```ts
let state = this.Values.get(possibleShapeName);
if (state === undefined || state === null) {
  state = {};
  this.Values.set(possibleShapeName, state);
}
if (!(stateField in state)) {
  compute(units, tokenIndex, context, state);
  if (!(stateField in state)) {
    throw new Error(`PossibleShapeCache: ${possibleShapeName} 的 compute 没有写入 stateField "${stateField}"`);
  }
}
return state as Item;
```

## method SetState:<Item>(possibleShapeName:string, state:Item)=>void

写这个形状的状态。**只在第一次建状态时调**——状态对象建出来之后由形状就地改，缓存里握着的是同一个对象。

```ts
this.Values.set(possibleShapeName, state);
```

## method Clear:()=>void

清空全部缓存。形状建完之后由 `CatalogGuide` 调一次——下一条目的判定必须从零开始，留着上一条的状态会判错。

```ts
this.Values.clear();
```

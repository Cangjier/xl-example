# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

形状判定的缓存：**每个形状一个槽**——键是形状名，值是这个形状自己那一份判定状态。形状在自己名下读写，不必自己拼键名，形状之间也不会撞。

状态是每个形状自己立的**具名类**（各形状的 `…Scan`）。底层只能写 `any`：xl 的类型标注不接受 `{[key:string]:any}`（`E1204`），`Map<string, any>` 是这套规范里唯一能写的字符串键映射——明确性由取值那一侧的泛型补回来（与 `SyntaxContext.GetDefault` 同款）。

# class PossibleShapeCache

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

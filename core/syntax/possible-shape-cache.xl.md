# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

形状判定的缓存：**两层 `Map`**——外层键是形状名，内层键是形状自己的键。形状在自己名下读写，既不用自己拼键名，形状之间也不会撞键。

# class PossibleShapeCache

## field Values:Map<string, Map<string, any>> = new Map()

外层：形状名 → 该形状的键值对。内层那一张在第一次写值时才建。

## method Get:(possibleShapeName:string, key:string)=>any

按形状名取那一层，再按键取值；形状还没写过、或键不存在时给 `null`。

```ts
const inner = this.Values.get(possibleShapeName);
if (inner === undefined) {
  return null;
}
return inner.get(key) ?? null;
```

## method Set:(possibleShapeName:string, key:string, value:any)=>void

按形状名与键名写值；那一层还没有就地建出来。

```ts
let inner = this.Values.get(possibleShapeName);
if (inner === undefined) {
  inner = new Map<string, any>();
  this.Values.set(possibleShapeName, inner);
}
inner.set(key, value);
```

## method Clear:()=>void

清空全部缓存。形状建完之后由 `CatalogGuide` 调一次——下一条目的判定必须从零开始，留着上一条的状态会判错。

```ts
this.Values.clear();
```

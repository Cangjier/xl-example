# dependencies
```xl
import { Token } from "../../core/syntax/token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

条目（item）级的公共谓词：宿主的 `Data` 里「当前这一条」从哪一格开始、哪几格是 trivia。这一层每个形状都要用，所以留在语言层，不下 core。

# class ItemUtil

## static method ItemStart:(units:Array<Token>)=>int

当前这一条的起点：**最后一个非 basic 单元之后**。

宿主的 `Data` 里混着两样东西——已定型的条目（形状单元，`IsBasicToken` 为假）与当前这一条还没成形的 basic 单元。判定只看尾巴那一段。一次都没建过（全是 basic 单元）时返回 `0`。

```ts
for (let index = units.length - 1; index >= 0; index--) {
  if (!units[index].IsBasicToken) {
    return index + 1;
  }
}
return 0;
```

## static method NextCode:(units:Array<Token>, index:int)=>int

从 `index` 起往后找第一个**非 trivia**的单元，返回它的下标；一路都是注释（或已到末尾）时给 `units.length`。

```ts
for (let at = index; at < units.length; at++) {
  if (!units[at].IsAnnotationToken) {
    return at;
  }
}
return units.length;
```

## static method PreviousCode:(units:Array<Token>, index:int)=>int

从 `index` 起往前找第一个**非 trivia**的单元，返回它的下标；找不到给 `-1`。

```ts
for (let at = index; at >= 0; at--) {
  if (!units[at].IsAnnotationToken) {
    return at;
  }
}
return -1;
```

## static method LastCodeInItem:(units:Array<Token>)=>int

当前这一条里**最后一个非 trivia 单元**的下标；这一条里只有注释时给 `-1`。

只在当前这一条的范围里往回找——不越过 `ItemStart` 去碰上一个条目。

```ts
const start = ItemUtil.ItemStart(units);
for (let at = units.length - 1; at >= start; at--) {
  if (!units[at].IsAnnotationToken) {
    return at;
  }
}
return -1;
```

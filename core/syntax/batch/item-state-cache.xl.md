# namespace cangjie

item 引擎的判定缓存：替代旧 possible 层的槽位缓存，但**没有 `SlotOf`**——
键由规则自己给（字符串），引擎只负责「同一条目里读过的值复用一次」。

# class ItemStateCache

## field Values:Map<string, int> = new Map()

判定缓存：键 → 整型值（规则自定语义，比如「读到第几格 / 什么档位」）。

## field LastFrom:int = -1

当前批次在宿主 `Data` 中的起点。

## field LastTo:int = -1

当前批次已消费到的宿主下标（半开）。

## method Begin:(from:int)=>void

开始一批：记录批首。

```ts
this.LastFrom = from;
```

## method End:(to:int)=>void

记录本批已消费到的位置。

```ts
this.LastTo = to;
```

## method Get:(key:string, fallback:int)=>int

读缓存；不存在时返回 `fallback`。

```ts
if (this.Values.has(key)) {
  return this.Values.get(key) as number;
}
return fallback;
```

## method Set:(key:string, value:int)=>void

写缓存。

```ts
this.Values.set(key, value);
```

## method Clear:()=>void

只清判定值，保留批次游标。

```ts
this.Values.clear();
```

## method Reset:()=>void

全清：判定值与批次游标一起复位。

```ts
this.Values.clear();
this.LastFrom = -1;
this.LastTo = -1;
```

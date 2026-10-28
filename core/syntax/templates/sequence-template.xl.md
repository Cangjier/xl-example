# dependencies
```xl
import { Sequence } from "./sequence.xl.md"
```

# namespace cangjie

# type ItemModifier = (item:any)=>void

# type DefaultValueResolver = (value:any)=>any

# type SequenceTemplateInitializer = (template:any)=>void

# class SequenceTemplate<T>

## field DefaultValue:Sequence<T> | null = null

## field CoverData:Map<Function, Sequence<T> | null> = new Map()

## field BanedData:Array<T> = []

## field CompletedData:Map<Function, Sequence<T> | null> = new Map()

## field ModifyItem:Map<Function, ItemModifier> = new Map()

## method Get:(target:any, onDefaultValue?:DefaultValueResolver | null)=>Sequence<T> | null

```ts
if (!this.CompletedData.has(target)) {
  const twoArg = arguments.length >= 2;
  const isCovered = this.CoverData.has(target);
  const raw = isCovered ? (this.CoverData.get(target) ?? null) : this.DefaultValue;
  const base = isCovered || !twoArg ? raw : (onDefaultValue == null ? null : onDefaultValue(raw));
  this.CompletedData.set(
    target,
    this.BanedData.length === 0 ? base : (base == null ? null : base.Removed(this.BanedData)),
  );
  const cached = this.CompletedData.get(target) ?? null;
  if (cached != null) {
    for (const item of cached.Data) {
      const modify = this.ModifyItem.get((item as any).constructor);
      if (modify !== undefined) {
        modify(item);
      }
    }
  }
}
return this.CompletedData.get(target) ?? null;
```

## method Set:(target:any, value:Sequence<T> | null)=>void

```ts
this.CoverData.set(target, value);
```

## method Ban:(Items:Array<T>)=>void

```ts
this.BanedData.push(...Items);
```

## method AddModifyItem:(branchType:any, modify:ItemModifier)=>void

```ts
if (this.ModifyItem.has(branchType)) {
  throw new Error("AddModifyItem: the branch type is already registered");
}
this.ModifyItem.set(branchType, modify);
```

## method Initialize:(onInitialize:SequenceTemplateInitializer)=>SequenceTemplate<T>

```ts
onInitialize(this);
return this;
```

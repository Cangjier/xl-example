# namespace cangjie

# class PossibleShapeCache

## field Values:Array<unknown> = []

## field Share:Array<unknown> = []

## method GetState:<Item>(possibleShapeSlot:int)=>Item | null

```ts
const value = this.Values[possibleShapeSlot];
if (value === undefined) {
  return null;
}
return value as Item;
```

## method SetState:<Item>(possibleShapeSlot:int, state:Item)=>void

```ts
this.Values[possibleShapeSlot] = state;
```

## method GetShare:<Item>(possibleShapeSlot:int)=>Item | null

```ts
const value = this.Share[possibleShapeSlot];
if (value === undefined) {
  return null;
}
return value as Item;
```

## method SetShare:<Item>(possibleShapeSlot:int, value:Item)=>void

```ts
this.Share[possibleShapeSlot] = value;
```

## method ClearShare:()=>void

```ts
this.Share = [];
```

## field ItemStartValue:int = -1

## field ItemStartLength:int = -1

## method GetItemStart:(unitsLength:int)=>int

```ts
if (this.ItemStartValue < 0 || this.ItemStartLength !== unitsLength) {
  return -1;
}
return this.ItemStartValue;
```

## method SetItemStart:(value:int, unitsLength:int)=>void

```ts
this.ItemStartValue = value;
this.ItemStartLength = unitsLength;
```

## method Clear:()=>void

```ts
this.Values = [];
this.ItemStartValue = -1;
this.ItemStartLength = -1;
```

# namespace cangjie

# class PossibleShapeCache

## field Values:Map<string, unknown> = new Map()

## field Share:Map<string, unknown> = new Map()

## method GetState:<Item>(possibleShapeName:string)=>Item | null

```ts
const value = this.Values.get(possibleShapeName);
if (value === undefined) {
  return null;
}
return value as Item;
```

## method SetState:<Item>(possibleShapeName:string, state:Item)=>void

```ts
this.Values.set(possibleShapeName, state);
```

## method GetShare:<Item>(possibleShapeName:string)=>Item | null

```ts
const value = this.Share.get(possibleShapeName);
if (value === undefined) {
  return null;
}
return value as Item;
```

## method SetShare:<Item>(possibleShapeName:string, value:Item)=>void

```ts
this.Share.set(possibleShapeName, value);
```

## method ClearShare:()=>void

```ts
this.Share.clear();
```

## method Clear:()=>void

```ts
this.Values.clear();
```

# dependencies
```xl
import { Token } from "../../../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class ExpressionAtomRegistry

## static field Atoms:Set<any> = new Set()

## static field Members:Set<any> = new Set()

## static field Containers:Set<any> = new Set()

## static field Nodes:Set<any> = new Set()

## static method RegisterNode:(unit:Token)=>void

```ts
if (unit === null) {
  return;
}
ExpressionAtomRegistry.Nodes.add(unit);
```

## static method HasNode:(unit:Token)=>bool

```ts
if (unit === null) {
  return false;
}
return ExpressionAtomRegistry.Nodes.has(unit);
```

## static method Register:(unit:Token)=>void

```ts
if (unit === null) {
  return;
}
ExpressionAtomRegistry.Atoms.add(unit);
```

## static method RegisterMember:(unit:Token)=>void

```ts
if (unit === null) {
  return;
}
ExpressionAtomRegistry.Members.add(unit);
```

## static method Has:(unit:Token)=>bool

```ts
if (unit === null) {
  return false;
}
return ExpressionAtomRegistry.Atoms.has(unit);
```

## static method HasMember:(unit:Token)=>bool

```ts
if (unit === null) {
  return false;
}
return ExpressionAtomRegistry.Members.has(unit);
```

## static method RegisterContainer:(unit:Token)=>void

```ts
if (unit === null) {
  return;
}
ExpressionAtomRegistry.Containers.add(unit);
```

## static method HasContainer:(unit:Token)=>bool

```ts
if (unit === null) {
  return false;
}
return ExpressionAtomRegistry.Containers.has(unit);
```

## static method Reset:()=>void

```ts
ExpressionAtomRegistry.Atoms = new Set();
ExpressionAtomRegistry.Members = new Set();
ExpressionAtomRegistry.Containers = new Set();
ExpressionAtomRegistry.Nodes = new Set();
```

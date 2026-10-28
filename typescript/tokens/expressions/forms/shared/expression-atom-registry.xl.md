# dependencies
```xl
import { Token } from "../../../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class ExpressionAtomRegistry

## private static field Containers:Set<Token> = new Set()

## static method Reset:()=>void

```ts
ExpressionAtomRegistry.Containers.clear();
```

## static method Register:(unit:Token)=>void

```ts
ExpressionAtomRegistry.Containers.add(unit);
```

## static method HasContainer:(unit:Token)=>bool

```ts
return ExpressionAtomRegistry.Containers.has(unit);
```

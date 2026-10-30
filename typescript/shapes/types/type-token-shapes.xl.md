# dependencies
```xl
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class TypeTokenShape extends ShapeToken

## field Text:string = ""

## static method Fill:(node:TypeTokenShape, unit:Token, pos:int, text:string)=>void

```ts
node.Pos = pos;
node.Text = text;
node.SignIn(unit.SourceRange.Start);
node.SignOut(unit.SourceRange.End);
node.Closed = true;
```

# class QuestionTokenShape extends TypeTokenShape

## static method FromUnit:(unit:Token, pos:int)=>QuestionTokenShape

```ts
const shape = new QuestionTokenShape(unit.Template);
TypeTokenShape.Fill(shape, unit, pos, "?");
return shape;
```

# class DotDotDotTokenShape extends TypeTokenShape

## static method FromUnit:(unit:Token, pos:int)=>DotDotDotTokenShape

```ts
const shape = new DotDotDotTokenShape(unit.Template);
TypeTokenShape.Fill(shape, unit, pos, "...");
return shape;
```

# class ReadonlyKeywordShape extends TypeTokenShape

## static method FromUnit:(unit:Token, pos:int)=>ReadonlyKeywordShape

```ts
const shape = new ReadonlyKeywordShape(unit.Template);
TypeTokenShape.Fill(shape, unit, pos, "readonly");
return shape;
```

# class AbstractKeywordShape extends TypeTokenShape

## static method FromUnit:(unit:Token, pos:int)=>AbstractKeywordShape

```ts
const shape = new AbstractKeywordShape(unit.Template);
TypeTokenShape.Fill(shape, unit, pos, "abstract");
return shape;
```

# class AssertsKeywordShape extends TypeTokenShape

## static method FromUnit:(unit:Token, pos:int)=>AssertsKeywordShape

```ts
const shape = new AssertsKeywordShape(unit.Template);
TypeTokenShape.Fill(shape, unit, pos, "asserts");
return shape;
```

# class UniqueKeywordShape extends TypeTokenShape

## static method FromUnit:(unit:Token, pos:int)=>UniqueKeywordShape

```ts
const shape = new UniqueKeywordShape(unit.Template);
TypeTokenShape.Fill(shape, unit, pos, "unique");
return shape;
```

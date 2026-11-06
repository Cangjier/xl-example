# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TypeAliasParsed } from "./type-parser-result.xl.md"
import { TypeArgumentTail } from "./type-parser-result.xl.md"
import { TypeParser } from "./type-parser.xl.md"
```

# namespace cangjie

# class TypeParserApi

## static field AliasFallbackCount:int = 0

## static field ReturnTypeFallbackCount:int = 0

## static method ResetFallbackCounts:()=>void

```ts
TypeParserApi.AliasFallbackCount = 0;
TypeParserApi.ReturnTypeFallbackCount = 0;
```

## static method FallbackCount:()=>int

```ts
return TypeParserApi.AliasFallbackCount + TypeParserApi.ReturnTypeFallbackCount;
```

## static method ParseAlias:(units:Array<Token>, limit:int, template:Template)=>TypeAliasParsed

```ts
TypeParserApi.AliasFallbackCount++;
const parser = new TypeParser(units, limit, template);
return parser.Alias();
```


## static method ParseCompleteType:(units:Array<Token>, limit:int, template:Template)=>Token

```ts
const parser = new TypeParser(units, limit, template);
const type = parser.ParseType();
parser.SkipTrivia();
if (parser.Index < parser.Limit) {
  throw parser.MakeError("模板插值里的类型之后仍有多余单元");
}
return type;
```


## static method ParseCompleteReturnType:(units:Array<Token>, limit:int, template:Template)=>Token

```ts
TypeParserApi.ReturnTypeFallbackCount++;
const parser = new TypeParser(units, limit, template);
const type = parser.ParseTypeReturn();
parser.SkipTrivia();
if (parser.Index < parser.Limit) {
  throw parser.MakeError("返回类型之后仍有多余单元");
}
return type;
```


## static method ParseParameterPrefix:(units:Array<Token>, from:int, limit:int, template:Template)=>Array<Token>

```ts
const parser = new TypeParser(units, limit, template);
parser.Index = from;
const items = parser.ParseParameterList();
parser.SkipTrivia();
if (parser.Index < parser.Limit) {
  throw parser.MakeError("参数列表之后仍有多余单元");
}
return items;
```


## static method ParseTypeParameterList:(units:Array<Token>, limit:int, template:Template)=>Array<Token>

```ts
const parser = new TypeParser(units, limit, template);
const items = parser.ParseTypeParametersIfPresent();
parser.SkipTrivia();
if (parser.Index < parser.Limit) {
  throw parser.MakeError("类型参数之后仍有多余单元");
}
return items;
```


## static method ParseTypeParameterOnly:(units:Array<Token>, limit:int, template:Template)=>Token

```ts
const parser = new TypeParser(units, limit, template);
const parameter = parser.ParseTypeParameter();
parser.SkipTrivia();
if (parser.Index < parser.Limit) {
  throw parser.MakeError("类型参数之后仍有多余单元");
}
return parameter;
```


## static method ParseTypeParameterTail:(units:Array<Token>, from:int, to:int, template:Template)=>Token

```ts
const parser = new TypeParser(units, to, template);
parser.Index = from;
const parameter = parser.ParseTypeParameter();
parser.SkipTrivia();
if (parser.Index !== parser.Limit) {
  throw parser.MakeError("infer 之后仍有多余单元");
}
return parameter;
```


## static method ParseTypeArgumentTail:(units:Array<Token>, limit:int, template:Template)=>TypeArgumentTail

```ts
const parser = new TypeParser(units, limit, template);
const tail = parser.ParseArguments();
parser.SkipTrivia();
if (parser.Index < parser.Limit) {
  throw parser.MakeError("类型实参之后仍有多余单元");
}
return tail;
```


## static method ParseEntityNamePrefix:(units:Array<Token>, from:int, to:int, template:Template)=>Token

```ts
const parser = new TypeParser(units, to, template);
parser.Index = from;
const name = parser.ParseEntityName();
parser.SkipTrivia();
if (parser.Index !== parser.Limit) {
  throw parser.MakeError("名字之后仍有多余单元");
}
return name;
```

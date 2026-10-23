# dependencies
```xl
import { Token } from "../token.xl.md"
import { Template } from "../templates/template.xl.md"
```

# namespace cangjie

basic token 的一级分类。core 只做**语法无关**的形态判定；关键字表属于语言知识，
由 typescript 侧的 `ItemRule` 自持（`Of` 的 `template` 形参留给后续注入，本包不读它）。

# class BasicKind

## static field Unknown:int = 0

判不出（调用方应保守处理，不得据此建 item）。

## static field Keyword:int = 1

关键字。

## static field Identifier:int = 2

标识符。

## static field Number:int = 3

数字字面量。

## static field String:int = 4

字符串 / 模板字符串 / 字符字面量。

## static field Regex:int = 5

正则字面量。

## static field Open:int = 6

开括号 `(` `[` `{`。

## static field Punct:int = 7

标点符号（含闭括号与分隔符）。

## static field Comment:int = 8

注释（区域 / 行）。

## static field Blank:int = 9

空白 trivia。

## static field Eof:int = 10

文件末尾哨兵（零宽）。

## static method TextOf:(token:Token)=>string

token 覆盖区间的原始文本；范围或文档缺失时返回空串。

```ts
const document = token.SourceRange.Document;
if (document === null || token.SourceRange.Start < 0 || token.SourceRange.End < 0) {
  return "";
}
return document.GetRaw(token.SourceRange.Start, token.SourceRange.End);
```

## static method Of:(token:Token, template:Template)=>int

一级分类：先看 trivia 标记，再看零宽（EOF 哨兵），最后看首字符形态。

```ts
if (token.IsAnnotationToken) {
  return BasicKind.Comment;
}
if (token.IsTriviaToken) {
  return BasicKind.Blank;
}
const text = BasicKind.TextOf(token);
if (text.length === 0) {
  return BasicKind.Eof;
}
const first = text.substring(0, 1);
if (first === "\"" || first === "'" || first === "`") {
  return BasicKind.String;
}
if (first === "/" && text.length > 1) {
  const second = text.substring(1, 2);
  if (second === "/" || second === "*") {
    return BasicKind.Comment;
  }
}
if (first >= "0" && first <= "9") {
  return BasicKind.Number;
}
if (first === "(" || first === "[" || first === "{") {
  return BasicKind.Open;
}
if (BasicKind.IsIdentifierStart(first)) {
  return BasicKind.Identifier;
}
return BasicKind.Punct;
```

## static method IsIdentifierStart:(value:string)=>bool

首字符是否可能是标识符起点（ASCII 保守判定；非 ASCII 交给 language 侧规则）。

```ts
if (value.length !== 1) {
  return false;
}
const code = value.charCodeAt(0);
if (code >= 65 && code <= 90) {
  return true;
}
if (code >= 97 && code <= 122) {
  return true;
}
return value === "_" || value === "$";
```

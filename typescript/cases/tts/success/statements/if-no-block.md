# 预期 token 树（逐字）：`if (a) b;`

- 类型：statements / if statement
- 源文件：`typescript/cases/tts/success/statements/if-no-block.ts`
- 说明：以下逐字树由当前实现生成；最终 AST 已与 TypeScript 对拍一致。

```text
0 1 2 3 4 5 6 7 8 9
i f   ( a )   b ; ⏎
```

## [char 0] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,1)  text="i"
```

## [char 1] `"f"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,2)  text="if"
```

## [char 2] `" "`（if 关闭 → 建 IfStatementShape）

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   └─ WrapSymbol  src=[2,3)  text=" "
```

## [char 3] `"("`（`(` 建 Bracket）

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   └─ Bracket  src=[3,...)
```

## [char 4] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   └─ Bracket  src=[3,...)
      └─ Common  src=[4,5)  text="a"
```

## [char 5] `")"`（a 关闭；`)` 关闭 Bracket → 条件落成 IdentifierShape）

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   └─ IdentifierShape  pos=4  src=[4,5)  text="a"
```

## [char 6] `" "`（空格进入 if）

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   └─ WrapSymbol  src=[6,7)  text=" "
```

## [char 7] `"b"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ Common  src=[7,8)  text="b"
```

## [char 8] `";"`（b 关闭 → 建 body ExpressionStatement；`;` 挂到 body）

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ ExpressionStatementShape  pos=6  src=[7,...)
      ├─ IdentifierShape  pos=6  src=[7,8)  text="b"
      └─ Symbol  src=[8,9)  text=";"
```

## [char 9] `"\n"`（`;` 关闭 → body 与 if 同时封口；换行归 SourceFile）

```text
SourceFileShape  pos=-  src=[0,...)
├─ IfStatementShape  pos=0  src=[0,9)
│  ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
│  └─ ExpressionStatementShape  pos=6  src=[7,9)
│     └─ IdentifierShape  pos=6  src=[7,8)  text="b"
└─ WrapSymbol  src=[9,10)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,10)
└─ IfStatementShape  pos=0  src=[0,9)
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   └─ ExpressionStatementShape  pos=6  src=[7,9)
      └─ IdentifierShape  pos=6  src=[7,8)  text="b"
```

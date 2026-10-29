# 预期 token 树（逐字）：`a = b;`

```text
0 1 2 3 4 5 6
a   =   b ; ⏎
```

## [char 0] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,1)  text="a"
```

## [char 1] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ExpressionStatementShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=0  src=[0,1)  text="a"
   └─ WrapSymbol  src=[1,2)  text=" "
```

## [char 2] `"="`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ExpressionStatementShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=0  src=[0,1)  text="a"
   ├─ WrapSymbol  src=[1,2)  text=" "
   └─ Symbol  src=[2,3)  text="="
```

## [char 3] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ExpressionStatementShape  pos=0  src=[0,...)
   └─ BinaryExpressionShape  pos=0  src=[0,...)
      ├─ IdentifierShape  pos=0  src=[0,1)  text="a"
      ├─ WrapSymbol  src=[1,2)  text=" "
      ├─ EqualsTokenShape  pos=1  src=[2,3)  op="="
      └─ WrapSymbol  src=[3,4)  text=" "
```

## [char 4] `"b"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ExpressionStatementShape  pos=0  src=[0,...)
   └─ BinaryExpressionShape  pos=0  src=[0,...)
      ├─ IdentifierShape  pos=0  src=[0,1)  text="a"
      ├─ WrapSymbol  src=[1,2)  text=" "
      ├─ EqualsTokenShape  pos=1  src=[2,3)  op="="
      ├─ WrapSymbol  src=[3,4)  text=" "
      └─ Common  src=[4,5)  text="b"
```

## [char 5] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ExpressionStatementShape  pos=0  src=[0,6)
   └─ BinaryExpressionShape  pos=0  src=[0,5)
      ├─ IdentifierShape  pos=0  src=[0,1)  text="a"
      ├─ EqualsTokenShape  pos=1  src=[2,3)  op="="
      └─ IdentifierShape  pos=3  src=[4,5)  text="b"
```

## [char 6] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ ExpressionStatementShape  pos=0  src=[0,6)
│  └─ BinaryExpressionShape  pos=0  src=[0,5)
│     ├─ IdentifierShape  pos=0  src=[0,1)  text="a"
│     ├─ EqualsTokenShape  pos=1  src=[2,3)  op="="
│     └─ IdentifierShape  pos=3  src=[4,5)  text="b"
└─ WrapSymbol  src=[6,7)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,7)
└─ ExpressionStatementShape  pos=0  src=[0,6)
   └─ BinaryExpressionShape  pos=0  src=[0,5)
      ├─ IdentifierShape  pos=0  src=[0,1)  text="a"
      ├─ EqualsTokenShape  pos=1  src=[2,3)  op="="
      └─ IdentifierShape  pos=3  src=[4,5)  text="b"
```

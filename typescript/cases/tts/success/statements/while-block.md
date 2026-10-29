# 预期 token 树（逐字）：`while (a) { b; }`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16
w h i l e   ( a )   {   b ;   } ⏎
```

## [char 0] `"w"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,1)  text="w"
```

## [char 1] `"h"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,2)  text="wh"
```

## [char 2] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,3)  text="whi"
```

## [char 3] `"l"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,4)  text="whil"
```

## [char 4] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,5)  text="while"
```

## [char 5] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   └─ WrapSymbol  src=[5,6)  text=" "
```

## [char 6] `"("`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   └─ ConditionShape  pos=5  src=[6,7)
```

## [char 7] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   └─ ConditionShape  pos=5  src=[6,7)
      └─ Common  src=[7,8)  text="a"
```

## [char 8] `")"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   └─ IdentifierShape  pos=7  src=[7,8)  text="a"
```

## [char 9] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   └─ WrapSymbol  src=[9,10)  text=" "
```

## [char 10] `"{"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ BlockShape  pos=9  src=[10,11)
```

## [char 11] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ BlockShape  pos=9  src=[10,11)
      └─ WrapSymbol  src=[11,12)  text=" "
```

## [char 12] `"b"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ BlockShape  pos=9  src=[10,11)
      ├─ WrapSymbol  src=[11,12)  text=" "
      └─ Common  src=[12,13)  text="b"
```

## [char 13] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ BlockShape  pos=9  src=[10,11)
      ├─ WrapSymbol  src=[11,12)  text=" "
      └─ ExpressionStatementShape  pos=11  src=[12,14)
         └─ IdentifierShape  pos=11  src=[12,13)  text="b"
```

## [char 14] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ BlockShape  pos=9  src=[10,11)
      ├─ WrapSymbol  src=[11,12)  text=" "
      ├─ ExpressionStatementShape  pos=11  src=[12,14)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="b"
      └─ WrapSymbol  src=[14,15)  text=" "
```

## [char 15] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,16)
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   └─ BlockShape  pos=9  src=[10,16)
      └─ ExpressionStatementShape  pos=11  src=[12,14)
         └─ IdentifierShape  pos=11  src=[12,13)  text="b"
```

## [char 16] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ WhileStatementShape  pos=0  src=[0,16)
│  ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
│  └─ BlockShape  pos=9  src=[10,16)
│     └─ ExpressionStatementShape  pos=11  src=[12,14)
│        └─ IdentifierShape  pos=11  src=[12,13)  text="b"
└─ WrapSymbol  src=[16,17)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,17)
└─ WhileStatementShape  pos=0  src=[0,16)
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   └─ BlockShape  pos=9  src=[10,16)
      └─ ExpressionStatementShape  pos=11  src=[12,14)
         └─ IdentifierShape  pos=11  src=[12,13)  text="b"
```

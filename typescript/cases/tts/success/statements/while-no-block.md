# 预期 token 树（逐字）：`while (a) b;`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12
w h i l e   ( a )   b ; ⏎
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

## [char 10] `"b"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ Common  src=[10,11)  text="b"
```

## [char 11] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,12)
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   └─ ExpressionStatementShape  pos=9  src=[10,12)
      └─ IdentifierShape  pos=9  src=[10,11)  text="b"
```

## [char 12] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ WhileStatementShape  pos=0  src=[0,12)
│  ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
│  └─ ExpressionStatementShape  pos=9  src=[10,12)
│     └─ IdentifierShape  pos=9  src=[10,11)  text="b"
└─ WrapSymbol  src=[12,13)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,13)
└─ WhileStatementShape  pos=0  src=[0,12)
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   └─ ExpressionStatementShape  pos=9  src=[10,12)
      └─ IdentifierShape  pos=9  src=[10,11)  text="b"
```

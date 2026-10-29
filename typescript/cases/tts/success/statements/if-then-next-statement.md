# 预期 token 树（逐字）：`if (a) b; c;`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12
i f   ( a )   b ;   c ; ⏎
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

## [char 2] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   └─ WrapSymbol  src=[2,3)  text=" "
```

## [char 3] `"("`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   └─ ConditionShape  pos=2  src=[3,4)
```

## [char 4] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   └─ ConditionShape  pos=2  src=[3,4)
      └─ Common  src=[4,5)  text="a"
```

## [char 5] `")"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   └─ IdentifierShape  pos=4  src=[4,5)  text="a"
```

## [char 6] `" "`

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

## [char 8] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,9)
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   └─ ExpressionStatementShape  pos=6  src=[7,9)
      └─ IdentifierShape  pos=6  src=[7,8)  text="b"
```

## [char 9] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
├─ IfStatementShape  pos=0  src=[0,9)
│  ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
│  └─ ExpressionStatementShape  pos=6  src=[7,9)
│     └─ IdentifierShape  pos=6  src=[7,8)  text="b"
└─ WrapSymbol  src=[9,10)  text=" "
```

## [char 10] `"c"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ IfStatementShape  pos=0  src=[0,9)
│  ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
│  └─ ExpressionStatementShape  pos=6  src=[7,9)
│     └─ IdentifierShape  pos=6  src=[7,8)  text="b"
├─ WrapSymbol  src=[9,10)  text=" "
└─ Common  src=[10,11)  text="c"
```

## [char 11] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ IfStatementShape  pos=0  src=[0,9)
│  ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
│  └─ ExpressionStatementShape  pos=6  src=[7,9)
│     └─ IdentifierShape  pos=6  src=[7,8)  text="b"
├─ WrapSymbol  src=[9,10)  text=" "
└─ ExpressionStatementShape  pos=9  src=[10,12)
   └─ IdentifierShape  pos=9  src=[10,11)  text="c"
```

## [char 12] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ IfStatementShape  pos=0  src=[0,9)
│  ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
│  └─ ExpressionStatementShape  pos=6  src=[7,9)
│     └─ IdentifierShape  pos=6  src=[7,8)  text="b"
├─ WrapSymbol  src=[9,10)  text=" "
├─ ExpressionStatementShape  pos=9  src=[10,12)
│  └─ IdentifierShape  pos=9  src=[10,11)  text="c"
└─ WrapSymbol  src=[12,13)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,13)
├─ IfStatementShape  pos=0  src=[0,9)
│  ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
│  └─ ExpressionStatementShape  pos=6  src=[7,9)
│     └─ IdentifierShape  pos=6  src=[7,8)  text="b"
└─ ExpressionStatementShape  pos=9  src=[10,12)
   └─ IdentifierShape  pos=9  src=[10,11)  text="c"
```

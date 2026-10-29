# 预期 token 树（逐字）：`if (a) { b; } else { c; }`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25
i f   ( a )   {   b ;   }   e l s e   {   c ;   } ⏎
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

## [char 7] `"{"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
```

## [char 8] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      └─ WrapSymbol  src=[8,9)  text=" "
```

## [char 9] `"b"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ Common  src=[9,10)  text="b"
```

## [char 10] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ ExpressionStatementShape  pos=8  src=[9,11)
         └─ IdentifierShape  pos=8  src=[9,10)  text="b"
```

## [char 11] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      ├─ ExpressionStatementShape  pos=8  src=[9,11)
      │  └─ IdentifierShape  pos=8  src=[9,10)  text="b"
      └─ WrapSymbol  src=[11,12)  text=" "
```

## [char 12] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,13)
      └─ ExpressionStatementShape  pos=8  src=[9,11)
         └─ IdentifierShape  pos=8  src=[9,10)  text="b"
```

## [char 13] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ BlockShape  pos=6  src=[7,13)
   │  └─ ExpressionStatementShape  pos=8  src=[9,11)
   │     └─ IdentifierShape  pos=8  src=[9,10)  text="b"
   └─ WrapSymbol  src=[13,14)  text=" "
```

## [char 14] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ BlockShape  pos=6  src=[7,13)
   │  └─ ExpressionStatementShape  pos=8  src=[9,11)
   │     └─ IdentifierShape  pos=8  src=[9,10)  text="b"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Common  src=[14,15)  text="e"
```

## [char 15] `"l"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ BlockShape  pos=6  src=[7,13)
   │  └─ ExpressionStatementShape  pos=8  src=[9,11)
   │     └─ IdentifierShape  pos=8  src=[9,10)  text="b"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Common  src=[14,16)  text="el"
```

## [char 16] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ BlockShape  pos=6  src=[7,13)
   │  └─ ExpressionStatementShape  pos=8  src=[9,11)
   │     └─ IdentifierShape  pos=8  src=[9,10)  text="b"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Common  src=[14,17)  text="els"
```

## [char 17] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ BlockShape  pos=6  src=[7,13)
   │  └─ ExpressionStatementShape  pos=8  src=[9,11)
   │     └─ IdentifierShape  pos=8  src=[9,10)  text="b"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Common  src=[14,18)  text="else"
```

## [char 18] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ BlockShape  pos=6  src=[7,13)
   │  └─ ExpressionStatementShape  pos=8  src=[9,11)
   │     └─ IdentifierShape  pos=8  src=[9,10)  text="b"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,18)  text="else"
   └─ WrapSymbol  src=[18,19)  text=" "
```

## [char 19] `"{"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ BlockShape  pos=6  src=[7,13)
   │  └─ ExpressionStatementShape  pos=8  src=[9,11)
   │     └─ IdentifierShape  pos=8  src=[9,10)  text="b"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,18)  text="else"
   ├─ WrapSymbol  src=[18,19)  text=" "
   └─ BlockShape  pos=18  src=[19,20)
```

## [char 20] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ BlockShape  pos=6  src=[7,13)
   │  └─ ExpressionStatementShape  pos=8  src=[9,11)
   │     └─ IdentifierShape  pos=8  src=[9,10)  text="b"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,18)  text="else"
   ├─ WrapSymbol  src=[18,19)  text=" "
   └─ BlockShape  pos=18  src=[19,20)
      └─ WrapSymbol  src=[20,21)  text=" "
```

## [char 21] `"c"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ BlockShape  pos=6  src=[7,13)
   │  └─ ExpressionStatementShape  pos=8  src=[9,11)
   │     └─ IdentifierShape  pos=8  src=[9,10)  text="b"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,18)  text="else"
   ├─ WrapSymbol  src=[18,19)  text=" "
   └─ BlockShape  pos=18  src=[19,20)
      ├─ WrapSymbol  src=[20,21)  text=" "
      └─ Common  src=[21,22)  text="c"
```

## [char 22] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ BlockShape  pos=6  src=[7,13)
   │  └─ ExpressionStatementShape  pos=8  src=[9,11)
   │     └─ IdentifierShape  pos=8  src=[9,10)  text="b"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,18)  text="else"
   ├─ WrapSymbol  src=[18,19)  text=" "
   └─ BlockShape  pos=18  src=[19,20)
      ├─ WrapSymbol  src=[20,21)  text=" "
      └─ ExpressionStatementShape  pos=20  src=[21,23)
         └─ IdentifierShape  pos=20  src=[21,22)  text="c"
```

## [char 23] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ BlockShape  pos=6  src=[7,13)
   │  └─ ExpressionStatementShape  pos=8  src=[9,11)
   │     └─ IdentifierShape  pos=8  src=[9,10)  text="b"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,18)  text="else"
   ├─ WrapSymbol  src=[18,19)  text=" "
   └─ BlockShape  pos=18  src=[19,20)
      ├─ WrapSymbol  src=[20,21)  text=" "
      ├─ ExpressionStatementShape  pos=20  src=[21,23)
      │  └─ IdentifierShape  pos=20  src=[21,22)  text="c"
      └─ WrapSymbol  src=[23,24)  text=" "
```

## [char 24] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,25)
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ BlockShape  pos=6  src=[7,13)
   │  └─ ExpressionStatementShape  pos=8  src=[9,11)
   │     └─ IdentifierShape  pos=8  src=[9,10)  text="b"
   └─ BlockShape  pos=18  src=[19,25)
      └─ ExpressionStatementShape  pos=20  src=[21,23)
         └─ IdentifierShape  pos=20  src=[21,22)  text="c"
```

## [char 25] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ IfStatementShape  pos=0  src=[0,25)
│  ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
│  ├─ BlockShape  pos=6  src=[7,13)
│  │  └─ ExpressionStatementShape  pos=8  src=[9,11)
│  │     └─ IdentifierShape  pos=8  src=[9,10)  text="b"
│  └─ BlockShape  pos=18  src=[19,25)
│     └─ ExpressionStatementShape  pos=20  src=[21,23)
│        └─ IdentifierShape  pos=20  src=[21,22)  text="c"
└─ WrapSymbol  src=[25,26)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,26)
└─ IfStatementShape  pos=0  src=[0,25)
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ BlockShape  pos=6  src=[7,13)
   │  └─ ExpressionStatementShape  pos=8  src=[9,11)
   │     └─ IdentifierShape  pos=8  src=[9,10)  text="b"
   └─ BlockShape  pos=18  src=[19,25)
      └─ ExpressionStatementShape  pos=20  src=[21,23)
         └─ IdentifierShape  pos=20  src=[21,22)  text="c"
```

# 预期 token 树（逐字）：`if (a) { if (b) c; else d; } else e;`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36
i f   ( a )   {   i f   ( b )   c ;   e l s e   d ;   }   e l s e   e ; ⏎
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

## [char 9] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ Common  src=[9,10)  text="i"
```

## [char 10] `"f"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ Common  src=[9,11)  text="if"
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
      └─ IfStatementShape  pos=8  src=[9,...)
         └─ WrapSymbol  src=[11,12)  text=" "
```

## [char 12] `"("`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ IfStatementShape  pos=8  src=[9,...)
         ├─ WrapSymbol  src=[11,12)  text=" "
         └─ ConditionShape  pos=11  src=[12,13)
```

## [char 13] `"b"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ IfStatementShape  pos=8  src=[9,...)
         ├─ WrapSymbol  src=[11,12)  text=" "
         └─ ConditionShape  pos=11  src=[12,13)
            └─ Common  src=[13,14)  text="b"
```

## [char 14] `")"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ IfStatementShape  pos=8  src=[9,...)
         ├─ WrapSymbol  src=[11,12)  text=" "
         └─ IdentifierShape  pos=13  src=[13,14)  text="b"
```

## [char 15] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ IfStatementShape  pos=8  src=[9,...)
         ├─ WrapSymbol  src=[11,12)  text=" "
         ├─ IdentifierShape  pos=13  src=[13,14)  text="b"
         └─ WrapSymbol  src=[15,16)  text=" "
```

## [char 16] `"c"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ IfStatementShape  pos=8  src=[9,...)
         ├─ WrapSymbol  src=[11,12)  text=" "
         ├─ IdentifierShape  pos=13  src=[13,14)  text="b"
         ├─ WrapSymbol  src=[15,16)  text=" "
         └─ Common  src=[16,17)  text="c"
```

## [char 17] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ IfStatementShape  pos=8  src=[9,...)
         ├─ WrapSymbol  src=[11,12)  text=" "
         ├─ IdentifierShape  pos=13  src=[13,14)  text="b"
         ├─ WrapSymbol  src=[15,16)  text=" "
         └─ ExpressionStatementShape  pos=15  src=[16,18)
            └─ IdentifierShape  pos=15  src=[16,17)  text="c"
```

## [char 18] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ IfStatementShape  pos=8  src=[9,...)
         ├─ WrapSymbol  src=[11,12)  text=" "
         ├─ IdentifierShape  pos=13  src=[13,14)  text="b"
         ├─ WrapSymbol  src=[15,16)  text=" "
         ├─ ExpressionStatementShape  pos=15  src=[16,18)
         │  └─ IdentifierShape  pos=15  src=[16,17)  text="c"
         └─ WrapSymbol  src=[18,19)  text=" "
```

## [char 19] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ IfStatementShape  pos=8  src=[9,...)
         ├─ WrapSymbol  src=[11,12)  text=" "
         ├─ IdentifierShape  pos=13  src=[13,14)  text="b"
         ├─ WrapSymbol  src=[15,16)  text=" "
         ├─ ExpressionStatementShape  pos=15  src=[16,18)
         │  └─ IdentifierShape  pos=15  src=[16,17)  text="c"
         ├─ WrapSymbol  src=[18,19)  text=" "
         └─ Common  src=[19,20)  text="e"
```

## [char 20] `"l"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ IfStatementShape  pos=8  src=[9,...)
         ├─ WrapSymbol  src=[11,12)  text=" "
         ├─ IdentifierShape  pos=13  src=[13,14)  text="b"
         ├─ WrapSymbol  src=[15,16)  text=" "
         ├─ ExpressionStatementShape  pos=15  src=[16,18)
         │  └─ IdentifierShape  pos=15  src=[16,17)  text="c"
         ├─ WrapSymbol  src=[18,19)  text=" "
         └─ Common  src=[19,21)  text="el"
```

## [char 21] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ IfStatementShape  pos=8  src=[9,...)
         ├─ WrapSymbol  src=[11,12)  text=" "
         ├─ IdentifierShape  pos=13  src=[13,14)  text="b"
         ├─ WrapSymbol  src=[15,16)  text=" "
         ├─ ExpressionStatementShape  pos=15  src=[16,18)
         │  └─ IdentifierShape  pos=15  src=[16,17)  text="c"
         ├─ WrapSymbol  src=[18,19)  text=" "
         └─ Common  src=[19,22)  text="els"
```

## [char 22] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ IfStatementShape  pos=8  src=[9,...)
         ├─ WrapSymbol  src=[11,12)  text=" "
         ├─ IdentifierShape  pos=13  src=[13,14)  text="b"
         ├─ WrapSymbol  src=[15,16)  text=" "
         ├─ ExpressionStatementShape  pos=15  src=[16,18)
         │  └─ IdentifierShape  pos=15  src=[16,17)  text="c"
         ├─ WrapSymbol  src=[18,19)  text=" "
         └─ Common  src=[19,23)  text="else"
```

## [char 23] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ IfStatementShape  pos=8  src=[9,...)
         ├─ WrapSymbol  src=[11,12)  text=" "
         ├─ IdentifierShape  pos=13  src=[13,14)  text="b"
         ├─ WrapSymbol  src=[15,16)  text=" "
         ├─ ExpressionStatementShape  pos=15  src=[16,18)
         │  └─ IdentifierShape  pos=15  src=[16,17)  text="c"
         ├─ WrapSymbol  src=[18,19)  text=" "
         ├─ Common  src=[19,23)  text="else"
         └─ WrapSymbol  src=[23,24)  text=" "
```

## [char 24] `"d"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ IfStatementShape  pos=8  src=[9,...)
         ├─ WrapSymbol  src=[11,12)  text=" "
         ├─ IdentifierShape  pos=13  src=[13,14)  text="b"
         ├─ WrapSymbol  src=[15,16)  text=" "
         ├─ ExpressionStatementShape  pos=15  src=[16,18)
         │  └─ IdentifierShape  pos=15  src=[16,17)  text="c"
         ├─ WrapSymbol  src=[18,19)  text=" "
         ├─ Common  src=[19,23)  text="else"
         ├─ WrapSymbol  src=[23,24)  text=" "
         └─ Common  src=[24,25)  text="d"
```

## [char 25] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ IfStatementShape  pos=8  src=[9,26)
         ├─ IdentifierShape  pos=13  src=[13,14)  text="b"
         ├─ ExpressionStatementShape  pos=15  src=[16,18)
         │  └─ IdentifierShape  pos=15  src=[16,17)  text="c"
         └─ ExpressionStatementShape  pos=23  src=[24,26)
            └─ IdentifierShape  pos=23  src=[24,25)  text="d"
```

## [char 26] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      ├─ IfStatementShape  pos=8  src=[9,26)
      │  ├─ IdentifierShape  pos=13  src=[13,14)  text="b"
      │  ├─ ExpressionStatementShape  pos=15  src=[16,18)
      │  │  └─ IdentifierShape  pos=15  src=[16,17)  text="c"
      │  └─ ExpressionStatementShape  pos=23  src=[24,26)
      │     └─ IdentifierShape  pos=23  src=[24,25)  text="d"
      └─ WrapSymbol  src=[26,27)  text=" "
```

## [char 27] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,28)
      └─ IfStatementShape  pos=8  src=[9,26)
         ├─ IdentifierShape  pos=13  src=[13,14)  text="b"
         ├─ ExpressionStatementShape  pos=15  src=[16,18)
         │  └─ IdentifierShape  pos=15  src=[16,17)  text="c"
         └─ ExpressionStatementShape  pos=23  src=[24,26)
            └─ IdentifierShape  pos=23  src=[24,25)  text="d"
```

## [char 28] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ BlockShape  pos=6  src=[7,28)
   │  └─ IfStatementShape  pos=8  src=[9,26)
   │     ├─ IdentifierShape  pos=13  src=[13,14)  text="b"
   │     ├─ ExpressionStatementShape  pos=15  src=[16,18)
   │     │  └─ IdentifierShape  pos=15  src=[16,17)  text="c"
   │     └─ ExpressionStatementShape  pos=23  src=[24,26)
   │        └─ IdentifierShape  pos=23  src=[24,25)  text="d"
   └─ WrapSymbol  src=[28,29)  text=" "
```

## [char 29] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ BlockShape  pos=6  src=[7,28)
   │  └─ IfStatementShape  pos=8  src=[9,26)
   │     ├─ IdentifierShape  pos=13  src=[13,14)  text="b"
   │     ├─ ExpressionStatementShape  pos=15  src=[16,18)
   │     │  └─ IdentifierShape  pos=15  src=[16,17)  text="c"
   │     └─ ExpressionStatementShape  pos=23  src=[24,26)
   │        └─ IdentifierShape  pos=23  src=[24,25)  text="d"
   ├─ WrapSymbol  src=[28,29)  text=" "
   └─ Common  src=[29,30)  text="e"
```

## [char 30] `"l"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ BlockShape  pos=6  src=[7,28)
   │  └─ IfStatementShape  pos=8  src=[9,26)
   │     ├─ IdentifierShape  pos=13  src=[13,14)  text="b"
   │     ├─ ExpressionStatementShape  pos=15  src=[16,18)
   │     │  └─ IdentifierShape  pos=15  src=[16,17)  text="c"
   │     └─ ExpressionStatementShape  pos=23  src=[24,26)
   │        └─ IdentifierShape  pos=23  src=[24,25)  text="d"
   ├─ WrapSymbol  src=[28,29)  text=" "
   └─ Common  src=[29,31)  text="el"
```

## [char 31] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ BlockShape  pos=6  src=[7,28)
   │  └─ IfStatementShape  pos=8  src=[9,26)
   │     ├─ IdentifierShape  pos=13  src=[13,14)  text="b"
   │     ├─ ExpressionStatementShape  pos=15  src=[16,18)
   │     │  └─ IdentifierShape  pos=15  src=[16,17)  text="c"
   │     └─ ExpressionStatementShape  pos=23  src=[24,26)
   │        └─ IdentifierShape  pos=23  src=[24,25)  text="d"
   ├─ WrapSymbol  src=[28,29)  text=" "
   └─ Common  src=[29,32)  text="els"
```

## [char 32] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ BlockShape  pos=6  src=[7,28)
   │  └─ IfStatementShape  pos=8  src=[9,26)
   │     ├─ IdentifierShape  pos=13  src=[13,14)  text="b"
   │     ├─ ExpressionStatementShape  pos=15  src=[16,18)
   │     │  └─ IdentifierShape  pos=15  src=[16,17)  text="c"
   │     └─ ExpressionStatementShape  pos=23  src=[24,26)
   │        └─ IdentifierShape  pos=23  src=[24,25)  text="d"
   ├─ WrapSymbol  src=[28,29)  text=" "
   └─ Common  src=[29,33)  text="else"
```

## [char 33] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ BlockShape  pos=6  src=[7,28)
   │  └─ IfStatementShape  pos=8  src=[9,26)
   │     ├─ IdentifierShape  pos=13  src=[13,14)  text="b"
   │     ├─ ExpressionStatementShape  pos=15  src=[16,18)
   │     │  └─ IdentifierShape  pos=15  src=[16,17)  text="c"
   │     └─ ExpressionStatementShape  pos=23  src=[24,26)
   │        └─ IdentifierShape  pos=23  src=[24,25)  text="d"
   ├─ WrapSymbol  src=[28,29)  text=" "
   ├─ Common  src=[29,33)  text="else"
   └─ WrapSymbol  src=[33,34)  text=" "
```

## [char 34] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ BlockShape  pos=6  src=[7,28)
   │  └─ IfStatementShape  pos=8  src=[9,26)
   │     ├─ IdentifierShape  pos=13  src=[13,14)  text="b"
   │     ├─ ExpressionStatementShape  pos=15  src=[16,18)
   │     │  └─ IdentifierShape  pos=15  src=[16,17)  text="c"
   │     └─ ExpressionStatementShape  pos=23  src=[24,26)
   │        └─ IdentifierShape  pos=23  src=[24,25)  text="d"
   ├─ WrapSymbol  src=[28,29)  text=" "
   ├─ Common  src=[29,33)  text="else"
   ├─ WrapSymbol  src=[33,34)  text=" "
   └─ Common  src=[34,35)  text="e"
```

## [char 35] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,36)
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ BlockShape  pos=6  src=[7,28)
   │  └─ IfStatementShape  pos=8  src=[9,26)
   │     ├─ IdentifierShape  pos=13  src=[13,14)  text="b"
   │     ├─ ExpressionStatementShape  pos=15  src=[16,18)
   │     │  └─ IdentifierShape  pos=15  src=[16,17)  text="c"
   │     └─ ExpressionStatementShape  pos=23  src=[24,26)
   │        └─ IdentifierShape  pos=23  src=[24,25)  text="d"
   └─ ExpressionStatementShape  pos=33  src=[34,36)
      └─ IdentifierShape  pos=33  src=[34,35)  text="e"
```

## [char 36] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ IfStatementShape  pos=0  src=[0,36)
│  ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
│  ├─ BlockShape  pos=6  src=[7,28)
│  │  └─ IfStatementShape  pos=8  src=[9,26)
│  │     ├─ IdentifierShape  pos=13  src=[13,14)  text="b"
│  │     ├─ ExpressionStatementShape  pos=15  src=[16,18)
│  │     │  └─ IdentifierShape  pos=15  src=[16,17)  text="c"
│  │     └─ ExpressionStatementShape  pos=23  src=[24,26)
│  │        └─ IdentifierShape  pos=23  src=[24,25)  text="d"
│  └─ ExpressionStatementShape  pos=33  src=[34,36)
│     └─ IdentifierShape  pos=33  src=[34,35)  text="e"
└─ WrapSymbol  src=[36,37)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,37)
└─ IfStatementShape  pos=0  src=[0,36)
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ BlockShape  pos=6  src=[7,28)
   │  └─ IfStatementShape  pos=8  src=[9,26)
   │     ├─ IdentifierShape  pos=13  src=[13,14)  text="b"
   │     ├─ ExpressionStatementShape  pos=15  src=[16,18)
   │     │  └─ IdentifierShape  pos=15  src=[16,17)  text="c"
   │     └─ ExpressionStatementShape  pos=23  src=[24,26)
   │        └─ IdentifierShape  pos=23  src=[24,25)  text="d"
   └─ ExpressionStatementShape  pos=33  src=[34,36)
      └─ IdentifierShape  pos=33  src=[34,35)  text="e"
```

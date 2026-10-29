# 预期 token 树（逐字）：`if (a) if (b) if (c) d; else e; else f;`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39
i f   ( a )   i f   ( b )   i f   ( c )   d ;   e l s e   e ;   e l s e   f ; ⏎
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

## [char 7] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ Common  src=[7,8)  text="i"
```

## [char 8] `"f"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ Common  src=[7,9)  text="if"
```

## [char 9] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      └─ WrapSymbol  src=[9,10)  text=" "
```

## [char 10] `"("`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      └─ ConditionShape  pos=9  src=[10,11)
```

## [char 11] `"b"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      └─ ConditionShape  pos=9  src=[10,11)
         └─ Common  src=[11,12)  text="b"
```

## [char 12] `")"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      └─ IdentifierShape  pos=11  src=[11,12)  text="b"
```

## [char 13] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      └─ WrapSymbol  src=[13,14)  text=" "
```

## [char 14] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ WrapSymbol  src=[13,14)  text=" "
      └─ Common  src=[14,15)  text="i"
```

## [char 15] `"f"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ WrapSymbol  src=[13,14)  text=" "
      └─ Common  src=[14,16)  text="if"
```

## [char 16] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ WrapSymbol  src=[13,14)  text=" "
      └─ IfStatementShape  pos=13  src=[14,...)
         └─ WrapSymbol  src=[16,17)  text=" "
```

## [char 17] `"("`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ WrapSymbol  src=[13,14)  text=" "
      └─ IfStatementShape  pos=13  src=[14,...)
         ├─ WrapSymbol  src=[16,17)  text=" "
         └─ ConditionShape  pos=16  src=[17,18)
```

## [char 18] `"c"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ WrapSymbol  src=[13,14)  text=" "
      └─ IfStatementShape  pos=13  src=[14,...)
         ├─ WrapSymbol  src=[16,17)  text=" "
         └─ ConditionShape  pos=16  src=[17,18)
            └─ Common  src=[18,19)  text="c"
```

## [char 19] `")"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ WrapSymbol  src=[13,14)  text=" "
      └─ IfStatementShape  pos=13  src=[14,...)
         ├─ WrapSymbol  src=[16,17)  text=" "
         └─ IdentifierShape  pos=18  src=[18,19)  text="c"
```

## [char 20] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ WrapSymbol  src=[13,14)  text=" "
      └─ IfStatementShape  pos=13  src=[14,...)
         ├─ WrapSymbol  src=[16,17)  text=" "
         ├─ IdentifierShape  pos=18  src=[18,19)  text="c"
         └─ WrapSymbol  src=[20,21)  text=" "
```

## [char 21] `"d"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ WrapSymbol  src=[13,14)  text=" "
      └─ IfStatementShape  pos=13  src=[14,...)
         ├─ WrapSymbol  src=[16,17)  text=" "
         ├─ IdentifierShape  pos=18  src=[18,19)  text="c"
         ├─ WrapSymbol  src=[20,21)  text=" "
         └─ Common  src=[21,22)  text="d"
```

## [char 22] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ WrapSymbol  src=[13,14)  text=" "
      └─ IfStatementShape  pos=13  src=[14,...)
         ├─ WrapSymbol  src=[16,17)  text=" "
         ├─ IdentifierShape  pos=18  src=[18,19)  text="c"
         ├─ WrapSymbol  src=[20,21)  text=" "
         └─ ExpressionStatementShape  pos=20  src=[21,23)
            └─ IdentifierShape  pos=20  src=[21,22)  text="d"
```

## [char 23] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ WrapSymbol  src=[13,14)  text=" "
      └─ IfStatementShape  pos=13  src=[14,...)
         ├─ WrapSymbol  src=[16,17)  text=" "
         ├─ IdentifierShape  pos=18  src=[18,19)  text="c"
         ├─ WrapSymbol  src=[20,21)  text=" "
         ├─ ExpressionStatementShape  pos=20  src=[21,23)
         │  └─ IdentifierShape  pos=20  src=[21,22)  text="d"
         └─ WrapSymbol  src=[23,24)  text=" "
```

## [char 24] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ WrapSymbol  src=[13,14)  text=" "
      └─ IfStatementShape  pos=13  src=[14,...)
         ├─ WrapSymbol  src=[16,17)  text=" "
         ├─ IdentifierShape  pos=18  src=[18,19)  text="c"
         ├─ WrapSymbol  src=[20,21)  text=" "
         ├─ ExpressionStatementShape  pos=20  src=[21,23)
         │  └─ IdentifierShape  pos=20  src=[21,22)  text="d"
         ├─ WrapSymbol  src=[23,24)  text=" "
         └─ Common  src=[24,25)  text="e"
```

## [char 25] `"l"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ WrapSymbol  src=[13,14)  text=" "
      └─ IfStatementShape  pos=13  src=[14,...)
         ├─ WrapSymbol  src=[16,17)  text=" "
         ├─ IdentifierShape  pos=18  src=[18,19)  text="c"
         ├─ WrapSymbol  src=[20,21)  text=" "
         ├─ ExpressionStatementShape  pos=20  src=[21,23)
         │  └─ IdentifierShape  pos=20  src=[21,22)  text="d"
         ├─ WrapSymbol  src=[23,24)  text=" "
         └─ Common  src=[24,26)  text="el"
```

## [char 26] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ WrapSymbol  src=[13,14)  text=" "
      └─ IfStatementShape  pos=13  src=[14,...)
         ├─ WrapSymbol  src=[16,17)  text=" "
         ├─ IdentifierShape  pos=18  src=[18,19)  text="c"
         ├─ WrapSymbol  src=[20,21)  text=" "
         ├─ ExpressionStatementShape  pos=20  src=[21,23)
         │  └─ IdentifierShape  pos=20  src=[21,22)  text="d"
         ├─ WrapSymbol  src=[23,24)  text=" "
         └─ Common  src=[24,27)  text="els"
```

## [char 27] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ WrapSymbol  src=[13,14)  text=" "
      └─ IfStatementShape  pos=13  src=[14,...)
         ├─ WrapSymbol  src=[16,17)  text=" "
         ├─ IdentifierShape  pos=18  src=[18,19)  text="c"
         ├─ WrapSymbol  src=[20,21)  text=" "
         ├─ ExpressionStatementShape  pos=20  src=[21,23)
         │  └─ IdentifierShape  pos=20  src=[21,22)  text="d"
         ├─ WrapSymbol  src=[23,24)  text=" "
         └─ Common  src=[24,28)  text="else"
```

## [char 28] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ WrapSymbol  src=[13,14)  text=" "
      └─ IfStatementShape  pos=13  src=[14,...)
         ├─ WrapSymbol  src=[16,17)  text=" "
         ├─ IdentifierShape  pos=18  src=[18,19)  text="c"
         ├─ WrapSymbol  src=[20,21)  text=" "
         ├─ ExpressionStatementShape  pos=20  src=[21,23)
         │  └─ IdentifierShape  pos=20  src=[21,22)  text="d"
         ├─ WrapSymbol  src=[23,24)  text=" "
         ├─ Common  src=[24,28)  text="else"
         └─ WrapSymbol  src=[28,29)  text=" "
```

## [char 29] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ WrapSymbol  src=[13,14)  text=" "
      └─ IfStatementShape  pos=13  src=[14,...)
         ├─ WrapSymbol  src=[16,17)  text=" "
         ├─ IdentifierShape  pos=18  src=[18,19)  text="c"
         ├─ WrapSymbol  src=[20,21)  text=" "
         ├─ ExpressionStatementShape  pos=20  src=[21,23)
         │  └─ IdentifierShape  pos=20  src=[21,22)  text="d"
         ├─ WrapSymbol  src=[23,24)  text=" "
         ├─ Common  src=[24,28)  text="else"
         ├─ WrapSymbol  src=[28,29)  text=" "
         └─ Common  src=[29,30)  text="e"
```

## [char 30] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ WrapSymbol  src=[13,14)  text=" "
      └─ IfStatementShape  pos=13  src=[14,31)
         ├─ IdentifierShape  pos=18  src=[18,19)  text="c"
         ├─ ExpressionStatementShape  pos=20  src=[21,23)
         │  └─ IdentifierShape  pos=20  src=[21,22)  text="d"
         └─ ExpressionStatementShape  pos=28  src=[29,31)
            └─ IdentifierShape  pos=28  src=[29,30)  text="e"
```

## [char 31] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ WrapSymbol  src=[13,14)  text=" "
      ├─ IfStatementShape  pos=13  src=[14,31)
      │  ├─ IdentifierShape  pos=18  src=[18,19)  text="c"
      │  ├─ ExpressionStatementShape  pos=20  src=[21,23)
      │  │  └─ IdentifierShape  pos=20  src=[21,22)  text="d"
      │  └─ ExpressionStatementShape  pos=28  src=[29,31)
      │     └─ IdentifierShape  pos=28  src=[29,30)  text="e"
      └─ WrapSymbol  src=[31,32)  text=" "
```

## [char 32] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ WrapSymbol  src=[13,14)  text=" "
      ├─ IfStatementShape  pos=13  src=[14,31)
      │  ├─ IdentifierShape  pos=18  src=[18,19)  text="c"
      │  ├─ ExpressionStatementShape  pos=20  src=[21,23)
      │  │  └─ IdentifierShape  pos=20  src=[21,22)  text="d"
      │  └─ ExpressionStatementShape  pos=28  src=[29,31)
      │     └─ IdentifierShape  pos=28  src=[29,30)  text="e"
      ├─ WrapSymbol  src=[31,32)  text=" "
      └─ Common  src=[32,33)  text="e"
```

## [char 33] `"l"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ WrapSymbol  src=[13,14)  text=" "
      ├─ IfStatementShape  pos=13  src=[14,31)
      │  ├─ IdentifierShape  pos=18  src=[18,19)  text="c"
      │  ├─ ExpressionStatementShape  pos=20  src=[21,23)
      │  │  └─ IdentifierShape  pos=20  src=[21,22)  text="d"
      │  └─ ExpressionStatementShape  pos=28  src=[29,31)
      │     └─ IdentifierShape  pos=28  src=[29,30)  text="e"
      ├─ WrapSymbol  src=[31,32)  text=" "
      └─ Common  src=[32,34)  text="el"
```

## [char 34] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ WrapSymbol  src=[13,14)  text=" "
      ├─ IfStatementShape  pos=13  src=[14,31)
      │  ├─ IdentifierShape  pos=18  src=[18,19)  text="c"
      │  ├─ ExpressionStatementShape  pos=20  src=[21,23)
      │  │  └─ IdentifierShape  pos=20  src=[21,22)  text="d"
      │  └─ ExpressionStatementShape  pos=28  src=[29,31)
      │     └─ IdentifierShape  pos=28  src=[29,30)  text="e"
      ├─ WrapSymbol  src=[31,32)  text=" "
      └─ Common  src=[32,35)  text="els"
```

## [char 35] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ WrapSymbol  src=[13,14)  text=" "
      ├─ IfStatementShape  pos=13  src=[14,31)
      │  ├─ IdentifierShape  pos=18  src=[18,19)  text="c"
      │  ├─ ExpressionStatementShape  pos=20  src=[21,23)
      │  │  └─ IdentifierShape  pos=20  src=[21,22)  text="d"
      │  └─ ExpressionStatementShape  pos=28  src=[29,31)
      │     └─ IdentifierShape  pos=28  src=[29,30)  text="e"
      ├─ WrapSymbol  src=[31,32)  text=" "
      └─ Common  src=[32,36)  text="else"
```

## [char 36] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ WrapSymbol  src=[13,14)  text=" "
      ├─ IfStatementShape  pos=13  src=[14,31)
      │  ├─ IdentifierShape  pos=18  src=[18,19)  text="c"
      │  ├─ ExpressionStatementShape  pos=20  src=[21,23)
      │  │  └─ IdentifierShape  pos=20  src=[21,22)  text="d"
      │  └─ ExpressionStatementShape  pos=28  src=[29,31)
      │     └─ IdentifierShape  pos=28  src=[29,30)  text="e"
      ├─ WrapSymbol  src=[31,32)  text=" "
      ├─ Common  src=[32,36)  text="else"
      └─ WrapSymbol  src=[36,37)  text=" "
```

## [char 37] `"f"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IfStatementShape  pos=6  src=[7,...)
      ├─ WrapSymbol  src=[9,10)  text=" "
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ WrapSymbol  src=[13,14)  text=" "
      ├─ IfStatementShape  pos=13  src=[14,31)
      │  ├─ IdentifierShape  pos=18  src=[18,19)  text="c"
      │  ├─ ExpressionStatementShape  pos=20  src=[21,23)
      │  │  └─ IdentifierShape  pos=20  src=[21,22)  text="d"
      │  └─ ExpressionStatementShape  pos=28  src=[29,31)
      │     └─ IdentifierShape  pos=28  src=[29,30)  text="e"
      ├─ WrapSymbol  src=[31,32)  text=" "
      ├─ Common  src=[32,36)  text="else"
      ├─ WrapSymbol  src=[36,37)  text=" "
      └─ Common  src=[37,38)  text="f"
```

## [char 38] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,39)
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   └─ IfStatementShape  pos=6  src=[7,39)
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ IfStatementShape  pos=13  src=[14,31)
      │  ├─ IdentifierShape  pos=18  src=[18,19)  text="c"
      │  ├─ ExpressionStatementShape  pos=20  src=[21,23)
      │  │  └─ IdentifierShape  pos=20  src=[21,22)  text="d"
      │  └─ ExpressionStatementShape  pos=28  src=[29,31)
      │     └─ IdentifierShape  pos=28  src=[29,30)  text="e"
      └─ ExpressionStatementShape  pos=36  src=[37,39)
         └─ IdentifierShape  pos=36  src=[37,38)  text="f"
```

## [char 39] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ IfStatementShape  pos=0  src=[0,39)
│  ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
│  └─ IfStatementShape  pos=6  src=[7,39)
│     ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
│     ├─ IfStatementShape  pos=13  src=[14,31)
│     │  ├─ IdentifierShape  pos=18  src=[18,19)  text="c"
│     │  ├─ ExpressionStatementShape  pos=20  src=[21,23)
│     │  │  └─ IdentifierShape  pos=20  src=[21,22)  text="d"
│     │  └─ ExpressionStatementShape  pos=28  src=[29,31)
│     │     └─ IdentifierShape  pos=28  src=[29,30)  text="e"
│     └─ ExpressionStatementShape  pos=36  src=[37,39)
│        └─ IdentifierShape  pos=36  src=[37,38)  text="f"
└─ WrapSymbol  src=[39,40)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,40)
└─ IfStatementShape  pos=0  src=[0,39)
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   └─ IfStatementShape  pos=6  src=[7,39)
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ IfStatementShape  pos=13  src=[14,31)
      │  ├─ IdentifierShape  pos=18  src=[18,19)  text="c"
      │  ├─ ExpressionStatementShape  pos=20  src=[21,23)
      │  │  └─ IdentifierShape  pos=20  src=[21,22)  text="d"
      │  └─ ExpressionStatementShape  pos=28  src=[29,31)
      │     └─ IdentifierShape  pos=28  src=[29,30)  text="e"
      └─ ExpressionStatementShape  pos=36  src=[37,39)
         └─ IdentifierShape  pos=36  src=[37,38)  text="f"
```

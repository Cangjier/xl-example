# 预期 token 树（逐字）：`if (a) if (b) c; else if (d) e; else f;`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39
i f   ( a )   i f   ( b )   c ;   e l s e   i f   ( d )   e ;   e l s e   f ; ⏎
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

## [char 14] `"c"`

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
      └─ Common  src=[14,15)  text="c"
```

## [char 15] `";"`

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
      └─ ExpressionStatementShape  pos=13  src=[14,16)
         └─ IdentifierShape  pos=13  src=[14,15)  text="c"
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
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      └─ WrapSymbol  src=[16,17)  text=" "
```

## [char 17] `"e"`

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
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      ├─ WrapSymbol  src=[16,17)  text=" "
      └─ Common  src=[17,18)  text="e"
```

## [char 18] `"l"`

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
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      ├─ WrapSymbol  src=[16,17)  text=" "
      └─ Common  src=[17,19)  text="el"
```

## [char 19] `"s"`

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
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      ├─ WrapSymbol  src=[16,17)  text=" "
      └─ Common  src=[17,20)  text="els"
```

## [char 20] `"e"`

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
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      ├─ WrapSymbol  src=[16,17)  text=" "
      └─ Common  src=[17,21)  text="else"
```

## [char 21] `" "`

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
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      ├─ WrapSymbol  src=[16,17)  text=" "
      ├─ Common  src=[17,21)  text="else"
      └─ WrapSymbol  src=[21,22)  text=" "
```

## [char 22] `"i"`

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
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      ├─ WrapSymbol  src=[16,17)  text=" "
      ├─ Common  src=[17,21)  text="else"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ Common  src=[22,23)  text="i"
```

## [char 23] `"f"`

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
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      ├─ WrapSymbol  src=[16,17)  text=" "
      ├─ Common  src=[17,21)  text="else"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ Common  src=[22,24)  text="if"
```

## [char 24] `" "`

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
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      ├─ WrapSymbol  src=[16,17)  text=" "
      ├─ Common  src=[17,21)  text="else"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ IfStatementShape  pos=21  src=[22,...)
         └─ WrapSymbol  src=[24,25)  text=" "
```

## [char 25] `"("`

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
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      ├─ WrapSymbol  src=[16,17)  text=" "
      ├─ Common  src=[17,21)  text="else"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ IfStatementShape  pos=21  src=[22,...)
         ├─ WrapSymbol  src=[24,25)  text=" "
         └─ ConditionShape  pos=24  src=[25,26)
```

## [char 26] `"d"`

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
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      ├─ WrapSymbol  src=[16,17)  text=" "
      ├─ Common  src=[17,21)  text="else"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ IfStatementShape  pos=21  src=[22,...)
         ├─ WrapSymbol  src=[24,25)  text=" "
         └─ ConditionShape  pos=24  src=[25,26)
            └─ Common  src=[26,27)  text="d"
```

## [char 27] `")"`

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
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      ├─ WrapSymbol  src=[16,17)  text=" "
      ├─ Common  src=[17,21)  text="else"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ IfStatementShape  pos=21  src=[22,...)
         ├─ WrapSymbol  src=[24,25)  text=" "
         └─ IdentifierShape  pos=26  src=[26,27)  text="d"
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
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      ├─ WrapSymbol  src=[16,17)  text=" "
      ├─ Common  src=[17,21)  text="else"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ IfStatementShape  pos=21  src=[22,...)
         ├─ WrapSymbol  src=[24,25)  text=" "
         ├─ IdentifierShape  pos=26  src=[26,27)  text="d"
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
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      ├─ WrapSymbol  src=[16,17)  text=" "
      ├─ Common  src=[17,21)  text="else"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ IfStatementShape  pos=21  src=[22,...)
         ├─ WrapSymbol  src=[24,25)  text=" "
         ├─ IdentifierShape  pos=26  src=[26,27)  text="d"
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
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      ├─ WrapSymbol  src=[16,17)  text=" "
      ├─ Common  src=[17,21)  text="else"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ IfStatementShape  pos=21  src=[22,...)
         ├─ WrapSymbol  src=[24,25)  text=" "
         ├─ IdentifierShape  pos=26  src=[26,27)  text="d"
         ├─ WrapSymbol  src=[28,29)  text=" "
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
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      ├─ WrapSymbol  src=[16,17)  text=" "
      ├─ Common  src=[17,21)  text="else"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ IfStatementShape  pos=21  src=[22,...)
         ├─ WrapSymbol  src=[24,25)  text=" "
         ├─ IdentifierShape  pos=26  src=[26,27)  text="d"
         ├─ WrapSymbol  src=[28,29)  text=" "
         ├─ ExpressionStatementShape  pos=28  src=[29,31)
         │  └─ IdentifierShape  pos=28  src=[29,30)  text="e"
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
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      ├─ WrapSymbol  src=[16,17)  text=" "
      ├─ Common  src=[17,21)  text="else"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ IfStatementShape  pos=21  src=[22,...)
         ├─ WrapSymbol  src=[24,25)  text=" "
         ├─ IdentifierShape  pos=26  src=[26,27)  text="d"
         ├─ WrapSymbol  src=[28,29)  text=" "
         ├─ ExpressionStatementShape  pos=28  src=[29,31)
         │  └─ IdentifierShape  pos=28  src=[29,30)  text="e"
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
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      ├─ WrapSymbol  src=[16,17)  text=" "
      ├─ Common  src=[17,21)  text="else"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ IfStatementShape  pos=21  src=[22,...)
         ├─ WrapSymbol  src=[24,25)  text=" "
         ├─ IdentifierShape  pos=26  src=[26,27)  text="d"
         ├─ WrapSymbol  src=[28,29)  text=" "
         ├─ ExpressionStatementShape  pos=28  src=[29,31)
         │  └─ IdentifierShape  pos=28  src=[29,30)  text="e"
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
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      ├─ WrapSymbol  src=[16,17)  text=" "
      ├─ Common  src=[17,21)  text="else"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ IfStatementShape  pos=21  src=[22,...)
         ├─ WrapSymbol  src=[24,25)  text=" "
         ├─ IdentifierShape  pos=26  src=[26,27)  text="d"
         ├─ WrapSymbol  src=[28,29)  text=" "
         ├─ ExpressionStatementShape  pos=28  src=[29,31)
         │  └─ IdentifierShape  pos=28  src=[29,30)  text="e"
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
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      ├─ WrapSymbol  src=[16,17)  text=" "
      ├─ Common  src=[17,21)  text="else"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ IfStatementShape  pos=21  src=[22,...)
         ├─ WrapSymbol  src=[24,25)  text=" "
         ├─ IdentifierShape  pos=26  src=[26,27)  text="d"
         ├─ WrapSymbol  src=[28,29)  text=" "
         ├─ ExpressionStatementShape  pos=28  src=[29,31)
         │  └─ IdentifierShape  pos=28  src=[29,30)  text="e"
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
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      ├─ WrapSymbol  src=[16,17)  text=" "
      ├─ Common  src=[17,21)  text="else"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ IfStatementShape  pos=21  src=[22,...)
         ├─ WrapSymbol  src=[24,25)  text=" "
         ├─ IdentifierShape  pos=26  src=[26,27)  text="d"
         ├─ WrapSymbol  src=[28,29)  text=" "
         ├─ ExpressionStatementShape  pos=28  src=[29,31)
         │  └─ IdentifierShape  pos=28  src=[29,30)  text="e"
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
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      ├─ WrapSymbol  src=[16,17)  text=" "
      ├─ Common  src=[17,21)  text="else"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ IfStatementShape  pos=21  src=[22,...)
         ├─ WrapSymbol  src=[24,25)  text=" "
         ├─ IdentifierShape  pos=26  src=[26,27)  text="d"
         ├─ WrapSymbol  src=[28,29)  text=" "
         ├─ ExpressionStatementShape  pos=28  src=[29,31)
         │  └─ IdentifierShape  pos=28  src=[29,30)  text="e"
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
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      └─ IfStatementShape  pos=21  src=[22,39)
         ├─ IdentifierShape  pos=26  src=[26,27)  text="d"
         ├─ ExpressionStatementShape  pos=28  src=[29,31)
         │  └─ IdentifierShape  pos=28  src=[29,30)  text="e"
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
│     ├─ ExpressionStatementShape  pos=13  src=[14,16)
│     │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
│     └─ IfStatementShape  pos=21  src=[22,39)
│        ├─ IdentifierShape  pos=26  src=[26,27)  text="d"
│        ├─ ExpressionStatementShape  pos=28  src=[29,31)
│        │  └─ IdentifierShape  pos=28  src=[29,30)  text="e"
│        └─ ExpressionStatementShape  pos=36  src=[37,39)
│           └─ IdentifierShape  pos=36  src=[37,38)  text="f"
└─ WrapSymbol  src=[39,40)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,40)
└─ IfStatementShape  pos=0  src=[0,39)
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   └─ IfStatementShape  pos=6  src=[7,39)
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      └─ IfStatementShape  pos=21  src=[22,39)
         ├─ IdentifierShape  pos=26  src=[26,27)  text="d"
         ├─ ExpressionStatementShape  pos=28  src=[29,31)
         │  └─ IdentifierShape  pos=28  src=[29,30)  text="e"
         └─ ExpressionStatementShape  pos=36  src=[37,39)
            └─ IdentifierShape  pos=36  src=[37,38)  text="f"
```

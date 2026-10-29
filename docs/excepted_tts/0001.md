# 预期 token 树（逐字）：`if (a) b; else if (c) if (d) e; else f;`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39
i f   ( a )   b ;   e l s e   i f   ( c )   i f   ( d )   e ;   e l s e   f ; ⏎
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
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ ExpressionStatementShape  pos=6  src=[7,9)
      └─ IdentifierShape  pos=6  src=[7,8)  text="b"
```

## [char 9] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   └─ WrapSymbol  src=[9,10)  text=" "
```

## [char 10] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ Common  src=[10,11)  text="e"
```

## [char 11] `"l"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ Common  src=[10,12)  text="el"
```

## [char 12] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ Common  src=[10,13)  text="els"
```

## [char 13] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ Common  src=[10,14)  text="else"
```

## [char 14] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,14)  text="else"
   └─ WrapSymbol  src=[14,15)  text=" "
```

## [char 15] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,14)  text="else"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ Common  src=[15,16)  text="i"
```

## [char 16] `"f"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,14)  text="else"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ Common  src=[15,17)  text="if"
```

## [char 17] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,14)  text="else"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ IfStatementShape  pos=14  src=[15,...)
      └─ WrapSymbol  src=[17,18)  text=" "
```

## [char 18] `"("`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,14)  text="else"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ IfStatementShape  pos=14  src=[15,...)
      ├─ WrapSymbol  src=[17,18)  text=" "
      └─ ConditionShape  pos=17  src=[18,19)
```

## [char 19] `"c"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,14)  text="else"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ IfStatementShape  pos=14  src=[15,...)
      ├─ WrapSymbol  src=[17,18)  text=" "
      └─ ConditionShape  pos=17  src=[18,19)
         └─ Common  src=[19,20)  text="c"
```

## [char 20] `")"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,14)  text="else"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ IfStatementShape  pos=14  src=[15,...)
      ├─ WrapSymbol  src=[17,18)  text=" "
      └─ IdentifierShape  pos=19  src=[19,20)  text="c"
```

## [char 21] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,14)  text="else"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ IfStatementShape  pos=14  src=[15,...)
      ├─ WrapSymbol  src=[17,18)  text=" "
      ├─ IdentifierShape  pos=19  src=[19,20)  text="c"
      └─ WrapSymbol  src=[21,22)  text=" "
```

## [char 22] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,14)  text="else"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ IfStatementShape  pos=14  src=[15,...)
      ├─ WrapSymbol  src=[17,18)  text=" "
      ├─ IdentifierShape  pos=19  src=[19,20)  text="c"
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
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,14)  text="else"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ IfStatementShape  pos=14  src=[15,...)
      ├─ WrapSymbol  src=[17,18)  text=" "
      ├─ IdentifierShape  pos=19  src=[19,20)  text="c"
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
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,14)  text="else"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ IfStatementShape  pos=14  src=[15,...)
      ├─ WrapSymbol  src=[17,18)  text=" "
      ├─ IdentifierShape  pos=19  src=[19,20)  text="c"
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
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,14)  text="else"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ IfStatementShape  pos=14  src=[15,...)
      ├─ WrapSymbol  src=[17,18)  text=" "
      ├─ IdentifierShape  pos=19  src=[19,20)  text="c"
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
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,14)  text="else"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ IfStatementShape  pos=14  src=[15,...)
      ├─ WrapSymbol  src=[17,18)  text=" "
      ├─ IdentifierShape  pos=19  src=[19,20)  text="c"
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
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,14)  text="else"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ IfStatementShape  pos=14  src=[15,...)
      ├─ WrapSymbol  src=[17,18)  text=" "
      ├─ IdentifierShape  pos=19  src=[19,20)  text="c"
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
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,14)  text="else"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ IfStatementShape  pos=14  src=[15,...)
      ├─ WrapSymbol  src=[17,18)  text=" "
      ├─ IdentifierShape  pos=19  src=[19,20)  text="c"
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
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,14)  text="else"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ IfStatementShape  pos=14  src=[15,...)
      ├─ WrapSymbol  src=[17,18)  text=" "
      ├─ IdentifierShape  pos=19  src=[19,20)  text="c"
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
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,14)  text="else"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ IfStatementShape  pos=14  src=[15,...)
      ├─ WrapSymbol  src=[17,18)  text=" "
      ├─ IdentifierShape  pos=19  src=[19,20)  text="c"
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
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,14)  text="else"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ IfStatementShape  pos=14  src=[15,...)
      ├─ WrapSymbol  src=[17,18)  text=" "
      ├─ IdentifierShape  pos=19  src=[19,20)  text="c"
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
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,14)  text="else"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ IfStatementShape  pos=14  src=[15,...)
      ├─ WrapSymbol  src=[17,18)  text=" "
      ├─ IdentifierShape  pos=19  src=[19,20)  text="c"
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
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,14)  text="else"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ IfStatementShape  pos=14  src=[15,...)
      ├─ WrapSymbol  src=[17,18)  text=" "
      ├─ IdentifierShape  pos=19  src=[19,20)  text="c"
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
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,14)  text="else"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ IfStatementShape  pos=14  src=[15,...)
      ├─ WrapSymbol  src=[17,18)  text=" "
      ├─ IdentifierShape  pos=19  src=[19,20)  text="c"
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
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,14)  text="else"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ IfStatementShape  pos=14  src=[15,...)
      ├─ WrapSymbol  src=[17,18)  text=" "
      ├─ IdentifierShape  pos=19  src=[19,20)  text="c"
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
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,14)  text="else"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ IfStatementShape  pos=14  src=[15,...)
      ├─ WrapSymbol  src=[17,18)  text=" "
      ├─ IdentifierShape  pos=19  src=[19,20)  text="c"
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
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,14)  text="else"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ IfStatementShape  pos=14  src=[15,...)
      ├─ WrapSymbol  src=[17,18)  text=" "
      ├─ IdentifierShape  pos=19  src=[19,20)  text="c"
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
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   └─ IfStatementShape  pos=14  src=[15,39)
      ├─ IdentifierShape  pos=19  src=[19,20)  text="c"
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
│  ├─ ExpressionStatementShape  pos=6  src=[7,9)
│  │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
│  └─ IfStatementShape  pos=14  src=[15,39)
│     ├─ IdentifierShape  pos=19  src=[19,20)  text="c"
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
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   └─ IfStatementShape  pos=14  src=[15,39)
      ├─ IdentifierShape  pos=19  src=[19,20)  text="c"
      └─ IfStatementShape  pos=21  src=[22,39)
         ├─ IdentifierShape  pos=26  src=[26,27)  text="d"
         ├─ ExpressionStatementShape  pos=28  src=[29,31)
         │  └─ IdentifierShape  pos=28  src=[29,30)  text="e"
         └─ ExpressionStatementShape  pos=36  src=[37,39)
            └─ IdentifierShape  pos=36  src=[37,38)  text="f"
```

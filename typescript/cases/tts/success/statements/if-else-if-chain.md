# 预期 token 树（逐字）：`if (a) b; else if (c) d; else e;`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32
i f   ( a )   b ;   e l s e   i f   ( c )   d ;   e l s e   e ; ⏎
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

## [char 22] `"d"`

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
      └─ Common  src=[22,23)  text="d"
```

## [char 23] `";"`

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
      └─ ExpressionStatementShape  pos=21  src=[22,24)
         └─ IdentifierShape  pos=21  src=[22,23)  text="d"
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
      ├─ ExpressionStatementShape  pos=21  src=[22,24)
      │  └─ IdentifierShape  pos=21  src=[22,23)  text="d"
      └─ WrapSymbol  src=[24,25)  text=" "
```

## [char 25] `"e"`

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
      ├─ ExpressionStatementShape  pos=21  src=[22,24)
      │  └─ IdentifierShape  pos=21  src=[22,23)  text="d"
      ├─ WrapSymbol  src=[24,25)  text=" "
      └─ Common  src=[25,26)  text="e"
```

## [char 26] `"l"`

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
      ├─ ExpressionStatementShape  pos=21  src=[22,24)
      │  └─ IdentifierShape  pos=21  src=[22,23)  text="d"
      ├─ WrapSymbol  src=[24,25)  text=" "
      └─ Common  src=[25,27)  text="el"
```

## [char 27] `"s"`

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
      ├─ ExpressionStatementShape  pos=21  src=[22,24)
      │  └─ IdentifierShape  pos=21  src=[22,23)  text="d"
      ├─ WrapSymbol  src=[24,25)  text=" "
      └─ Common  src=[25,28)  text="els"
```

## [char 28] `"e"`

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
      ├─ ExpressionStatementShape  pos=21  src=[22,24)
      │  └─ IdentifierShape  pos=21  src=[22,23)  text="d"
      ├─ WrapSymbol  src=[24,25)  text=" "
      └─ Common  src=[25,29)  text="else"
```

## [char 29] `" "`

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
      ├─ ExpressionStatementShape  pos=21  src=[22,24)
      │  └─ IdentifierShape  pos=21  src=[22,23)  text="d"
      ├─ WrapSymbol  src=[24,25)  text=" "
      ├─ Common  src=[25,29)  text="else"
      └─ WrapSymbol  src=[29,30)  text=" "
```

## [char 30] `"e"`

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
      ├─ ExpressionStatementShape  pos=21  src=[22,24)
      │  └─ IdentifierShape  pos=21  src=[22,23)  text="d"
      ├─ WrapSymbol  src=[24,25)  text=" "
      ├─ Common  src=[25,29)  text="else"
      ├─ WrapSymbol  src=[29,30)  text=" "
      └─ Common  src=[30,31)  text="e"
```

## [char 31] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,32)
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   └─ IfStatementShape  pos=14  src=[15,32)
      ├─ IdentifierShape  pos=19  src=[19,20)  text="c"
      ├─ ExpressionStatementShape  pos=21  src=[22,24)
      │  └─ IdentifierShape  pos=21  src=[22,23)  text="d"
      └─ ExpressionStatementShape  pos=29  src=[30,32)
         └─ IdentifierShape  pos=29  src=[30,31)  text="e"
```

## [char 32] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ IfStatementShape  pos=0  src=[0,32)
│  ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
│  ├─ ExpressionStatementShape  pos=6  src=[7,9)
│  │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
│  └─ IfStatementShape  pos=14  src=[15,32)
│     ├─ IdentifierShape  pos=19  src=[19,20)  text="c"
│     ├─ ExpressionStatementShape  pos=21  src=[22,24)
│     │  └─ IdentifierShape  pos=21  src=[22,23)  text="d"
│     └─ ExpressionStatementShape  pos=29  src=[30,32)
│        └─ IdentifierShape  pos=29  src=[30,31)  text="e"
└─ WrapSymbol  src=[32,33)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,33)
└─ IfStatementShape  pos=0  src=[0,32)
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ ExpressionStatementShape  pos=6  src=[7,9)
   │  └─ IdentifierShape  pos=6  src=[7,8)  text="b"
   └─ IfStatementShape  pos=14  src=[15,32)
      ├─ IdentifierShape  pos=19  src=[19,20)  text="c"
      ├─ ExpressionStatementShape  pos=21  src=[22,24)
      │  └─ IdentifierShape  pos=21  src=[22,23)  text="d"
      └─ ExpressionStatementShape  pos=29  src=[30,32)
         └─ IdentifierShape  pos=29  src=[30,31)  text="e"
```

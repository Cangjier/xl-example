# 预期 token 树（逐字）：`if (a) if (b) c; else d;`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24
i f   ( a )   i f   ( b )   c ;   e l s e   d ; ⏎
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

## [char 22] `"d"`

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
      └─ Common  src=[22,23)  text="d"
```

## [char 23] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,24)
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   └─ IfStatementShape  pos=6  src=[7,24)
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      └─ ExpressionStatementShape  pos=21  src=[22,24)
         └─ IdentifierShape  pos=21  src=[22,23)  text="d"
```

## [char 24] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ IfStatementShape  pos=0  src=[0,24)
│  ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
│  └─ IfStatementShape  pos=6  src=[7,24)
│     ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
│     ├─ ExpressionStatementShape  pos=13  src=[14,16)
│     │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
│     └─ ExpressionStatementShape  pos=21  src=[22,24)
│        └─ IdentifierShape  pos=21  src=[22,23)  text="d"
└─ WrapSymbol  src=[24,25)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,25)
└─ IfStatementShape  pos=0  src=[0,24)
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   └─ IfStatementShape  pos=6  src=[7,24)
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      ├─ ExpressionStatementShape  pos=13  src=[14,16)
      │  └─ IdentifierShape  pos=13  src=[14,15)  text="c"
      └─ ExpressionStatementShape  pos=21  src=[22,24)
         └─ IdentifierShape  pos=21  src=[22,23)  text="d"
```

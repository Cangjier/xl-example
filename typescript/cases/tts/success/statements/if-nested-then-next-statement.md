# 预期 token 树（逐字）：`if (a) if (b) c; d;`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19
i f   ( a )   i f   ( b )   c ;   d ; ⏎
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
└─ IfStatementShape  pos=0  src=[0,16)
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   └─ IfStatementShape  pos=6  src=[7,16)
      ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
      └─ ExpressionStatementShape  pos=13  src=[14,16)
         └─ IdentifierShape  pos=13  src=[14,15)  text="c"
```

## [char 16] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
├─ IfStatementShape  pos=0  src=[0,16)
│  ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
│  └─ IfStatementShape  pos=6  src=[7,16)
│     ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
│     └─ ExpressionStatementShape  pos=13  src=[14,16)
│        └─ IdentifierShape  pos=13  src=[14,15)  text="c"
└─ WrapSymbol  src=[16,17)  text=" "
```

## [char 17] `"d"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ IfStatementShape  pos=0  src=[0,16)
│  ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
│  └─ IfStatementShape  pos=6  src=[7,16)
│     ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
│     └─ ExpressionStatementShape  pos=13  src=[14,16)
│        └─ IdentifierShape  pos=13  src=[14,15)  text="c"
├─ WrapSymbol  src=[16,17)  text=" "
└─ Common  src=[17,18)  text="d"
```

## [char 18] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ IfStatementShape  pos=0  src=[0,16)
│  ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
│  └─ IfStatementShape  pos=6  src=[7,16)
│     ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
│     └─ ExpressionStatementShape  pos=13  src=[14,16)
│        └─ IdentifierShape  pos=13  src=[14,15)  text="c"
├─ WrapSymbol  src=[16,17)  text=" "
└─ ExpressionStatementShape  pos=16  src=[17,19)
   └─ IdentifierShape  pos=16  src=[17,18)  text="d"
```

## [char 19] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ IfStatementShape  pos=0  src=[0,16)
│  ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
│  └─ IfStatementShape  pos=6  src=[7,16)
│     ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
│     └─ ExpressionStatementShape  pos=13  src=[14,16)
│        └─ IdentifierShape  pos=13  src=[14,15)  text="c"
├─ WrapSymbol  src=[16,17)  text=" "
├─ ExpressionStatementShape  pos=16  src=[17,19)
│  └─ IdentifierShape  pos=16  src=[17,18)  text="d"
└─ WrapSymbol  src=[19,20)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,20)
├─ IfStatementShape  pos=0  src=[0,16)
│  ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
│  └─ IfStatementShape  pos=6  src=[7,16)
│     ├─ IdentifierShape  pos=11  src=[11,12)  text="b"
│     └─ ExpressionStatementShape  pos=13  src=[14,16)
│        └─ IdentifierShape  pos=13  src=[14,15)  text="c"
└─ ExpressionStatementShape  pos=16  src=[17,19)
   └─ IdentifierShape  pos=16  src=[17,18)  text="d"
```

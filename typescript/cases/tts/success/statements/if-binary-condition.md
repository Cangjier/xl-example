# 预期 token 树（逐字）：`if (a + b) c;`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13
i f   ( a   +   b )   c ; ⏎
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

## [char 5] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   └─ ConditionShape  pos=2  src=[3,4)
      ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
      └─ WrapSymbol  src=[5,6)  text=" "
```

## [char 6] `"+"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   └─ ConditionShape  pos=2  src=[3,4)
      ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
      ├─ WrapSymbol  src=[5,6)  text=" "
      └─ Symbol  src=[6,7)  text="+"
```

## [char 7] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   └─ ConditionShape  pos=2  src=[3,4)
      └─ BinaryExpressionShape  pos=4  src=[4,7)
         ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
         ├─ WrapSymbol  src=[5,6)  text=" "
         ├─ PlusTokenShape  pos=5  src=[6,7)  op="+"
         └─ WrapSymbol  src=[7,8)  text=" "
```

## [char 8] `"b"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   └─ ConditionShape  pos=2  src=[3,4)
      └─ BinaryExpressionShape  pos=4  src=[4,7)
         ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
         ├─ WrapSymbol  src=[5,6)  text=" "
         ├─ PlusTokenShape  pos=5  src=[6,7)  op="+"
         ├─ WrapSymbol  src=[7,8)  text=" "
         └─ Common  src=[8,9)  text="b"
```

## [char 9] `")"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   └─ BinaryExpressionShape  pos=4  src=[4,9)
      ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
      ├─ PlusTokenShape  pos=5  src=[6,7)  op="+"
      └─ IdentifierShape  pos=7  src=[8,9)  text="b"
```

## [char 10] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ BinaryExpressionShape  pos=4  src=[4,9)
   │  ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   │  ├─ PlusTokenShape  pos=5  src=[6,7)  op="+"
   │  └─ IdentifierShape  pos=7  src=[8,9)  text="b"
   └─ WrapSymbol  src=[10,11)  text=" "
```

## [char 11] `"c"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ BinaryExpressionShape  pos=4  src=[4,9)
   │  ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   │  ├─ PlusTokenShape  pos=5  src=[6,7)  op="+"
   │  └─ IdentifierShape  pos=7  src=[8,9)  text="b"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,12)  text="c"
```

## [char 12] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,13)
   ├─ BinaryExpressionShape  pos=4  src=[4,9)
   │  ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   │  ├─ PlusTokenShape  pos=5  src=[6,7)  op="+"
   │  └─ IdentifierShape  pos=7  src=[8,9)  text="b"
   └─ ExpressionStatementShape  pos=10  src=[11,13)
      └─ IdentifierShape  pos=10  src=[11,12)  text="c"
```

## [char 13] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ IfStatementShape  pos=0  src=[0,13)
│  ├─ BinaryExpressionShape  pos=4  src=[4,9)
│  │  ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
│  │  ├─ PlusTokenShape  pos=5  src=[6,7)  op="+"
│  │  └─ IdentifierShape  pos=7  src=[8,9)  text="b"
│  └─ ExpressionStatementShape  pos=10  src=[11,13)
│     └─ IdentifierShape  pos=10  src=[11,12)  text="c"
└─ WrapSymbol  src=[13,14)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,14)
└─ IfStatementShape  pos=0  src=[0,13)
   ├─ BinaryExpressionShape  pos=4  src=[4,9)
   │  ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   │  ├─ PlusTokenShape  pos=5  src=[6,7)  op="+"
   │  └─ IdentifierShape  pos=7  src=[8,9)  text="b"
   └─ ExpressionStatementShape  pos=10  src=[11,13)
      └─ IdentifierShape  pos=10  src=[11,12)  text="c"
```

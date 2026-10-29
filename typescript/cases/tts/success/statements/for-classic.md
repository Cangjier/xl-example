# 预期 token 树（逐字）：`for (i = 0; i < 3; i++) { }`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27
f o r   ( i   =   0 ;   i   <   3 ;   i + + )   {   } ⏎
```

## [char 0] `"f"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,1)  text="f"
```

## [char 1] `"o"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,2)  text="fo"
```

## [char 2] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,3)  text="for"
```

## [char 3] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   └─ WrapSymbol  src=[3,4)  text=" "
```

## [char 4] `"("`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
```

## [char 5] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   └─ Common  src=[5,6)  text="i"
```

## [char 6] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   └─ ForClauseShape  pos=5  src=[5,6)
      ├─ IdentifierShape  pos=5  src=[5,6)  text="i"
      └─ WrapSymbol  src=[6,7)  text=" "
```

## [char 7] `"="`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   └─ ForClauseShape  pos=5  src=[5,6)
      ├─ IdentifierShape  pos=5  src=[5,6)  text="i"
      ├─ WrapSymbol  src=[6,7)  text=" "
      └─ Symbol  src=[7,8)  text="="
```

## [char 8] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   └─ ForClauseShape  pos=5  src=[5,6)
      └─ BinaryExpressionShape  pos=5  src=[5,8)
         ├─ IdentifierShape  pos=5  src=[5,6)  text="i"
         ├─ WrapSymbol  src=[6,7)  text=" "
         ├─ EqualsTokenShape  pos=6  src=[7,8)  op="="
         └─ WrapSymbol  src=[8,9)  text=" "
```

## [char 9] `"0"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   └─ ForClauseShape  pos=5  src=[5,6)
      └─ BinaryExpressionShape  pos=5  src=[5,8)
         ├─ IdentifierShape  pos=5  src=[5,6)  text="i"
         ├─ WrapSymbol  src=[6,7)  text=" "
         ├─ EqualsTokenShape  pos=6  src=[7,8)  op="="
         ├─ WrapSymbol  src=[8,9)  text=" "
         └─ Common  src=[9,10)  text="0"
```

## [char 10] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   └─ BinaryExpressionShape  pos=5  src=[5,10)
      ├─ IdentifierShape  pos=5  src=[5,6)  text="i"
      ├─ EqualsTokenShape  pos=6  src=[7,8)  op="="
      └─ NumericLiteralShape  pos=8  src=[9,10)  text="0"
```

## [char 11] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ BinaryExpressionShape  pos=5  src=[5,10)
   │  ├─ IdentifierShape  pos=5  src=[5,6)  text="i"
   │  ├─ EqualsTokenShape  pos=6  src=[7,8)  op="="
   │  └─ NumericLiteralShape  pos=8  src=[9,10)  text="0"
   └─ WrapSymbol  src=[11,12)  text=" "
```

## [char 12] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ BinaryExpressionShape  pos=5  src=[5,10)
   │  ├─ IdentifierShape  pos=5  src=[5,6)  text="i"
   │  ├─ EqualsTokenShape  pos=6  src=[7,8)  op="="
   │  └─ NumericLiteralShape  pos=8  src=[9,10)  text="0"
   ├─ WrapSymbol  src=[11,12)  text=" "
   └─ Common  src=[12,13)  text="i"
```

## [char 13] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ BinaryExpressionShape  pos=5  src=[5,10)
   │  ├─ IdentifierShape  pos=5  src=[5,6)  text="i"
   │  ├─ EqualsTokenShape  pos=6  src=[7,8)  op="="
   │  └─ NumericLiteralShape  pos=8  src=[9,10)  text="0"
   ├─ WrapSymbol  src=[11,12)  text=" "
   └─ ForClauseShape  pos=11  src=[12,13)
      ├─ IdentifierShape  pos=11  src=[12,13)  text="i"
      └─ WrapSymbol  src=[13,14)  text=" "
```

## [char 14] `"<"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ BinaryExpressionShape  pos=5  src=[5,10)
   │  ├─ IdentifierShape  pos=5  src=[5,6)  text="i"
   │  ├─ EqualsTokenShape  pos=6  src=[7,8)  op="="
   │  └─ NumericLiteralShape  pos=8  src=[9,10)  text="0"
   ├─ WrapSymbol  src=[11,12)  text=" "
   └─ ForClauseShape  pos=11  src=[12,13)
      ├─ IdentifierShape  pos=11  src=[12,13)  text="i"
      ├─ WrapSymbol  src=[13,14)  text=" "
      └─ Symbol  src=[14,15)  text="<"
```

## [char 15] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ BinaryExpressionShape  pos=5  src=[5,10)
   │  ├─ IdentifierShape  pos=5  src=[5,6)  text="i"
   │  ├─ EqualsTokenShape  pos=6  src=[7,8)  op="="
   │  └─ NumericLiteralShape  pos=8  src=[9,10)  text="0"
   ├─ WrapSymbol  src=[11,12)  text=" "
   └─ ForClauseShape  pos=11  src=[12,13)
      └─ BinaryExpressionShape  pos=11  src=[12,15)
         ├─ IdentifierShape  pos=11  src=[12,13)  text="i"
         ├─ WrapSymbol  src=[13,14)  text=" "
         ├─ LessThanTokenShape  pos=13  src=[14,15)  op="<"
         └─ WrapSymbol  src=[15,16)  text=" "
```

## [char 16] `"3"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ BinaryExpressionShape  pos=5  src=[5,10)
   │  ├─ IdentifierShape  pos=5  src=[5,6)  text="i"
   │  ├─ EqualsTokenShape  pos=6  src=[7,8)  op="="
   │  └─ NumericLiteralShape  pos=8  src=[9,10)  text="0"
   ├─ WrapSymbol  src=[11,12)  text=" "
   └─ ForClauseShape  pos=11  src=[12,13)
      └─ BinaryExpressionShape  pos=11  src=[12,15)
         ├─ IdentifierShape  pos=11  src=[12,13)  text="i"
         ├─ WrapSymbol  src=[13,14)  text=" "
         ├─ LessThanTokenShape  pos=13  src=[14,15)  op="<"
         ├─ WrapSymbol  src=[15,16)  text=" "
         └─ Common  src=[16,17)  text="3"
```

## [char 17] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ BinaryExpressionShape  pos=5  src=[5,10)
   │  ├─ IdentifierShape  pos=5  src=[5,6)  text="i"
   │  ├─ EqualsTokenShape  pos=6  src=[7,8)  op="="
   │  └─ NumericLiteralShape  pos=8  src=[9,10)  text="0"
   ├─ WrapSymbol  src=[11,12)  text=" "
   └─ BinaryExpressionShape  pos=11  src=[12,17)
      ├─ IdentifierShape  pos=11  src=[12,13)  text="i"
      ├─ LessThanTokenShape  pos=13  src=[14,15)  op="<"
      └─ NumericLiteralShape  pos=15  src=[16,17)  text="3"
```

## [char 18] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ BinaryExpressionShape  pos=5  src=[5,10)
   │  ├─ IdentifierShape  pos=5  src=[5,6)  text="i"
   │  ├─ EqualsTokenShape  pos=6  src=[7,8)  op="="
   │  └─ NumericLiteralShape  pos=8  src=[9,10)  text="0"
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ BinaryExpressionShape  pos=11  src=[12,17)
   │  ├─ IdentifierShape  pos=11  src=[12,13)  text="i"
   │  ├─ LessThanTokenShape  pos=13  src=[14,15)  op="<"
   │  └─ NumericLiteralShape  pos=15  src=[16,17)  text="3"
   └─ WrapSymbol  src=[18,19)  text=" "
```

## [char 19] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ BinaryExpressionShape  pos=5  src=[5,10)
   │  ├─ IdentifierShape  pos=5  src=[5,6)  text="i"
   │  ├─ EqualsTokenShape  pos=6  src=[7,8)  op="="
   │  └─ NumericLiteralShape  pos=8  src=[9,10)  text="0"
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ BinaryExpressionShape  pos=11  src=[12,17)
   │  ├─ IdentifierShape  pos=11  src=[12,13)  text="i"
   │  ├─ LessThanTokenShape  pos=13  src=[14,15)  op="<"
   │  └─ NumericLiteralShape  pos=15  src=[16,17)  text="3"
   ├─ WrapSymbol  src=[18,19)  text=" "
   └─ Common  src=[19,20)  text="i"
```

## [char 20] `"+"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ BinaryExpressionShape  pos=5  src=[5,10)
   │  ├─ IdentifierShape  pos=5  src=[5,6)  text="i"
   │  ├─ EqualsTokenShape  pos=6  src=[7,8)  op="="
   │  └─ NumericLiteralShape  pos=8  src=[9,10)  text="0"
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ BinaryExpressionShape  pos=11  src=[12,17)
   │  ├─ IdentifierShape  pos=11  src=[12,13)  text="i"
   │  ├─ LessThanTokenShape  pos=13  src=[14,15)  op="<"
   │  └─ NumericLiteralShape  pos=15  src=[16,17)  text="3"
   ├─ WrapSymbol  src=[18,19)  text=" "
   └─ ForClauseShape  pos=18  src=[19,20)
      ├─ IdentifierShape  pos=18  src=[19,20)  text="i"
      └─ Symbol  src=[20,21)  text="+"
```

## [char 21] `"+"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ BinaryExpressionShape  pos=5  src=[5,10)
   │  ├─ IdentifierShape  pos=5  src=[5,6)  text="i"
   │  ├─ EqualsTokenShape  pos=6  src=[7,8)  op="="
   │  └─ NumericLiteralShape  pos=8  src=[9,10)  text="0"
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ BinaryExpressionShape  pos=11  src=[12,17)
   │  ├─ IdentifierShape  pos=11  src=[12,13)  text="i"
   │  ├─ LessThanTokenShape  pos=13  src=[14,15)  op="<"
   │  └─ NumericLiteralShape  pos=15  src=[16,17)  text="3"
   ├─ WrapSymbol  src=[18,19)  text=" "
   └─ ForClauseShape  pos=18  src=[19,20)
      └─ PostfixUnaryExpressionShape  pos=18  src=[19,22)
         └─ IdentifierShape  pos=18  src=[19,20)  text="i"
```

## [char 22] `")"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForStatementShape  pos=0  src=[0,...)
   ├─ BinaryExpressionShape  pos=5  src=[5,10)
   │  ├─ IdentifierShape  pos=5  src=[5,6)  text="i"
   │  ├─ EqualsTokenShape  pos=6  src=[7,8)  op="="
   │  └─ NumericLiteralShape  pos=8  src=[9,10)  text="0"
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ BinaryExpressionShape  pos=11  src=[12,17)
   │  ├─ IdentifierShape  pos=11  src=[12,13)  text="i"
   │  ├─ LessThanTokenShape  pos=13  src=[14,15)  op="<"
   │  └─ NumericLiteralShape  pos=15  src=[16,17)  text="3"
   ├─ WrapSymbol  src=[18,19)  text=" "
   └─ PostfixUnaryExpressionShape  pos=18  src=[19,22)
      └─ IdentifierShape  pos=18  src=[19,20)  text="i"
```

## [char 23] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForStatementShape  pos=0  src=[0,...)
   ├─ BinaryExpressionShape  pos=5  src=[5,10)
   │  ├─ IdentifierShape  pos=5  src=[5,6)  text="i"
   │  ├─ EqualsTokenShape  pos=6  src=[7,8)  op="="
   │  └─ NumericLiteralShape  pos=8  src=[9,10)  text="0"
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ BinaryExpressionShape  pos=11  src=[12,17)
   │  ├─ IdentifierShape  pos=11  src=[12,13)  text="i"
   │  ├─ LessThanTokenShape  pos=13  src=[14,15)  op="<"
   │  └─ NumericLiteralShape  pos=15  src=[16,17)  text="3"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ PostfixUnaryExpressionShape  pos=18  src=[19,22)
   │  └─ IdentifierShape  pos=18  src=[19,20)  text="i"
   └─ WrapSymbol  src=[23,24)  text=" "
```

## [char 24] `"{"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForStatementShape  pos=0  src=[0,...)
   ├─ BinaryExpressionShape  pos=5  src=[5,10)
   │  ├─ IdentifierShape  pos=5  src=[5,6)  text="i"
   │  ├─ EqualsTokenShape  pos=6  src=[7,8)  op="="
   │  └─ NumericLiteralShape  pos=8  src=[9,10)  text="0"
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ BinaryExpressionShape  pos=11  src=[12,17)
   │  ├─ IdentifierShape  pos=11  src=[12,13)  text="i"
   │  ├─ LessThanTokenShape  pos=13  src=[14,15)  op="<"
   │  └─ NumericLiteralShape  pos=15  src=[16,17)  text="3"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ PostfixUnaryExpressionShape  pos=18  src=[19,22)
   │  └─ IdentifierShape  pos=18  src=[19,20)  text="i"
   ├─ WrapSymbol  src=[23,24)  text=" "
   └─ BlockShape  pos=23  src=[24,25)
```

## [char 25] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForStatementShape  pos=0  src=[0,...)
   ├─ BinaryExpressionShape  pos=5  src=[5,10)
   │  ├─ IdentifierShape  pos=5  src=[5,6)  text="i"
   │  ├─ EqualsTokenShape  pos=6  src=[7,8)  op="="
   │  └─ NumericLiteralShape  pos=8  src=[9,10)  text="0"
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ BinaryExpressionShape  pos=11  src=[12,17)
   │  ├─ IdentifierShape  pos=11  src=[12,13)  text="i"
   │  ├─ LessThanTokenShape  pos=13  src=[14,15)  op="<"
   │  └─ NumericLiteralShape  pos=15  src=[16,17)  text="3"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ PostfixUnaryExpressionShape  pos=18  src=[19,22)
   │  └─ IdentifierShape  pos=18  src=[19,20)  text="i"
   ├─ WrapSymbol  src=[23,24)  text=" "
   └─ BlockShape  pos=23  src=[24,25)
      └─ WrapSymbol  src=[25,26)  text=" "
```

## [char 26] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForStatementShape  pos=0  src=[0,27)
   ├─ BinaryExpressionShape  pos=5  src=[5,10)
   │  ├─ IdentifierShape  pos=5  src=[5,6)  text="i"
   │  ├─ EqualsTokenShape  pos=6  src=[7,8)  op="="
   │  └─ NumericLiteralShape  pos=8  src=[9,10)  text="0"
   ├─ BinaryExpressionShape  pos=11  src=[12,17)
   │  ├─ IdentifierShape  pos=11  src=[12,13)  text="i"
   │  ├─ LessThanTokenShape  pos=13  src=[14,15)  op="<"
   │  └─ NumericLiteralShape  pos=15  src=[16,17)  text="3"
   ├─ PostfixUnaryExpressionShape  pos=18  src=[19,22)
   │  └─ IdentifierShape  pos=18  src=[19,20)  text="i"
   └─ BlockShape  pos=23  src=[24,27)
```

## [char 27] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ ForStatementShape  pos=0  src=[0,27)
│  ├─ BinaryExpressionShape  pos=5  src=[5,10)
│  │  ├─ IdentifierShape  pos=5  src=[5,6)  text="i"
│  │  ├─ EqualsTokenShape  pos=6  src=[7,8)  op="="
│  │  └─ NumericLiteralShape  pos=8  src=[9,10)  text="0"
│  ├─ BinaryExpressionShape  pos=11  src=[12,17)
│  │  ├─ IdentifierShape  pos=11  src=[12,13)  text="i"
│  │  ├─ LessThanTokenShape  pos=13  src=[14,15)  op="<"
│  │  └─ NumericLiteralShape  pos=15  src=[16,17)  text="3"
│  ├─ PostfixUnaryExpressionShape  pos=18  src=[19,22)
│  │  └─ IdentifierShape  pos=18  src=[19,20)  text="i"
│  └─ BlockShape  pos=23  src=[24,27)
└─ WrapSymbol  src=[27,28)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,28)
└─ ForStatementShape  pos=0  src=[0,27)
   ├─ BinaryExpressionShape  pos=5  src=[5,10)
   │  ├─ IdentifierShape  pos=5  src=[5,6)  text="i"
   │  ├─ EqualsTokenShape  pos=6  src=[7,8)  op="="
   │  └─ NumericLiteralShape  pos=8  src=[9,10)  text="0"
   ├─ BinaryExpressionShape  pos=11  src=[12,17)
   │  ├─ IdentifierShape  pos=11  src=[12,13)  text="i"
   │  ├─ LessThanTokenShape  pos=13  src=[14,15)  op="<"
   │  └─ NumericLiteralShape  pos=15  src=[16,17)  text="3"
   ├─ PostfixUnaryExpressionShape  pos=18  src=[19,22)
   │  └─ IdentifierShape  pos=18  src=[19,20)  text="i"
   └─ BlockShape  pos=23  src=[24,27)
```

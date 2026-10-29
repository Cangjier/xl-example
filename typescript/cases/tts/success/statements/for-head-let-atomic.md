# 预期 token 树（逐字）：`for (let i = 0; i < 3; i++) { }`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31
f o r   ( l e t   i   =   0 ;   i   <   3 ;   i + + )   {   } ⏎
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

## [char 5] `"l"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   └─ Common  src=[5,6)  text="l"
```

## [char 6] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   └─ Common  src=[5,7)  text="le"
```

## [char 7] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   └─ Common  src=[5,8)  text="let"
```

## [char 8] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ Common  src=[5,8)  text="let"
   └─ WrapSymbol  src=[8,9)  text=" "
```

## [char 9] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ Common  src=[5,8)  text="let"
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ Common  src=[9,10)  text="i"
```

## [char 10] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,10)
   │  └─ VariableDeclarationShape  pos=8  src=[9,10)
   │     └─ IdentifierShape  pos=8  src=[9,10)  text="i"
   └─ WrapSymbol  src=[10,11)  text=" "
```

## [char 11] `"="`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,10)
   │  └─ VariableDeclarationShape  pos=8  src=[9,10)
   │     └─ IdentifierShape  pos=8  src=[9,10)  text="i"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Symbol  src=[11,12)  text="="
```

## [char 12] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   └─ VariableDeclarationListShape  pos=5  src=[5,10)
      └─ VariableDeclarationShape  pos=8  src=[9,10)
         ├─ IdentifierShape  pos=8  src=[9,10)  text="i"
         └─ WrapSymbol  src=[12,13)  text=" "
```

## [char 13] `"0"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   └─ VariableDeclarationListShape  pos=5  src=[5,10)
      └─ VariableDeclarationShape  pos=8  src=[9,10)
         ├─ IdentifierShape  pos=8  src=[9,10)  text="i"
         ├─ WrapSymbol  src=[12,13)  text=" "
         └─ Common  src=[13,14)  text="0"
```

## [char 14] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   └─ VariableDeclarationListShape  pos=5  src=[5,14)
      └─ VariableDeclarationShape  pos=8  src=[9,14)
         ├─ IdentifierShape  pos=8  src=[9,10)  text="i"
         └─ NumericLiteralShape  pos=12  src=[13,14)  text="0"
```

## [char 15] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,14)
   │  └─ VariableDeclarationShape  pos=8  src=[9,14)
   │     ├─ IdentifierShape  pos=8  src=[9,10)  text="i"
   │     └─ NumericLiteralShape  pos=12  src=[13,14)  text="0"
   └─ WrapSymbol  src=[15,16)  text=" "
```

## [char 16] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,14)
   │  └─ VariableDeclarationShape  pos=8  src=[9,14)
   │     ├─ IdentifierShape  pos=8  src=[9,10)  text="i"
   │     └─ NumericLiteralShape  pos=12  src=[13,14)  text="0"
   ├─ WrapSymbol  src=[15,16)  text=" "
   └─ Common  src=[16,17)  text="i"
```

## [char 17] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,14)
   │  └─ VariableDeclarationShape  pos=8  src=[9,14)
   │     ├─ IdentifierShape  pos=8  src=[9,10)  text="i"
   │     └─ NumericLiteralShape  pos=12  src=[13,14)  text="0"
   ├─ WrapSymbol  src=[15,16)  text=" "
   └─ ForClauseShape  pos=15  src=[16,17)
      ├─ IdentifierShape  pos=15  src=[16,17)  text="i"
      └─ WrapSymbol  src=[17,18)  text=" "
```

## [char 18] `"<"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,14)
   │  └─ VariableDeclarationShape  pos=8  src=[9,14)
   │     ├─ IdentifierShape  pos=8  src=[9,10)  text="i"
   │     └─ NumericLiteralShape  pos=12  src=[13,14)  text="0"
   ├─ WrapSymbol  src=[15,16)  text=" "
   └─ ForClauseShape  pos=15  src=[16,17)
      ├─ IdentifierShape  pos=15  src=[16,17)  text="i"
      ├─ WrapSymbol  src=[17,18)  text=" "
      └─ Symbol  src=[18,19)  text="<"
```

## [char 19] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,14)
   │  └─ VariableDeclarationShape  pos=8  src=[9,14)
   │     ├─ IdentifierShape  pos=8  src=[9,10)  text="i"
   │     └─ NumericLiteralShape  pos=12  src=[13,14)  text="0"
   ├─ WrapSymbol  src=[15,16)  text=" "
   └─ ForClauseShape  pos=15  src=[16,17)
      └─ BinaryExpressionShape  pos=15  src=[16,19)
         ├─ IdentifierShape  pos=15  src=[16,17)  text="i"
         ├─ WrapSymbol  src=[17,18)  text=" "
         ├─ LessThanTokenShape  pos=17  src=[18,19)  op="<"
         └─ WrapSymbol  src=[19,20)  text=" "
```

## [char 20] `"3"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,14)
   │  └─ VariableDeclarationShape  pos=8  src=[9,14)
   │     ├─ IdentifierShape  pos=8  src=[9,10)  text="i"
   │     └─ NumericLiteralShape  pos=12  src=[13,14)  text="0"
   ├─ WrapSymbol  src=[15,16)  text=" "
   └─ ForClauseShape  pos=15  src=[16,17)
      └─ BinaryExpressionShape  pos=15  src=[16,19)
         ├─ IdentifierShape  pos=15  src=[16,17)  text="i"
         ├─ WrapSymbol  src=[17,18)  text=" "
         ├─ LessThanTokenShape  pos=17  src=[18,19)  op="<"
         ├─ WrapSymbol  src=[19,20)  text=" "
         └─ Common  src=[20,21)  text="3"
```

## [char 21] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,14)
   │  └─ VariableDeclarationShape  pos=8  src=[9,14)
   │     ├─ IdentifierShape  pos=8  src=[9,10)  text="i"
   │     └─ NumericLiteralShape  pos=12  src=[13,14)  text="0"
   ├─ WrapSymbol  src=[15,16)  text=" "
   └─ BinaryExpressionShape  pos=15  src=[16,21)
      ├─ IdentifierShape  pos=15  src=[16,17)  text="i"
      ├─ LessThanTokenShape  pos=17  src=[18,19)  op="<"
      └─ NumericLiteralShape  pos=19  src=[20,21)  text="3"
```

## [char 22] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,14)
   │  └─ VariableDeclarationShape  pos=8  src=[9,14)
   │     ├─ IdentifierShape  pos=8  src=[9,10)  text="i"
   │     └─ NumericLiteralShape  pos=12  src=[13,14)  text="0"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ BinaryExpressionShape  pos=15  src=[16,21)
   │  ├─ IdentifierShape  pos=15  src=[16,17)  text="i"
   │  ├─ LessThanTokenShape  pos=17  src=[18,19)  op="<"
   │  └─ NumericLiteralShape  pos=19  src=[20,21)  text="3"
   └─ WrapSymbol  src=[22,23)  text=" "
```

## [char 23] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,14)
   │  └─ VariableDeclarationShape  pos=8  src=[9,14)
   │     ├─ IdentifierShape  pos=8  src=[9,10)  text="i"
   │     └─ NumericLiteralShape  pos=12  src=[13,14)  text="0"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ BinaryExpressionShape  pos=15  src=[16,21)
   │  ├─ IdentifierShape  pos=15  src=[16,17)  text="i"
   │  ├─ LessThanTokenShape  pos=17  src=[18,19)  op="<"
   │  └─ NumericLiteralShape  pos=19  src=[20,21)  text="3"
   ├─ WrapSymbol  src=[22,23)  text=" "
   └─ Common  src=[23,24)  text="i"
```

## [char 24] `"+"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,14)
   │  └─ VariableDeclarationShape  pos=8  src=[9,14)
   │     ├─ IdentifierShape  pos=8  src=[9,10)  text="i"
   │     └─ NumericLiteralShape  pos=12  src=[13,14)  text="0"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ BinaryExpressionShape  pos=15  src=[16,21)
   │  ├─ IdentifierShape  pos=15  src=[16,17)  text="i"
   │  ├─ LessThanTokenShape  pos=17  src=[18,19)  op="<"
   │  └─ NumericLiteralShape  pos=19  src=[20,21)  text="3"
   ├─ WrapSymbol  src=[22,23)  text=" "
   └─ ForClauseShape  pos=22  src=[23,24)
      ├─ IdentifierShape  pos=22  src=[23,24)  text="i"
      └─ Symbol  src=[24,25)  text="+"
```

## [char 25] `"+"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,14)
   │  └─ VariableDeclarationShape  pos=8  src=[9,14)
   │     ├─ IdentifierShape  pos=8  src=[9,10)  text="i"
   │     └─ NumericLiteralShape  pos=12  src=[13,14)  text="0"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ BinaryExpressionShape  pos=15  src=[16,21)
   │  ├─ IdentifierShape  pos=15  src=[16,17)  text="i"
   │  ├─ LessThanTokenShape  pos=17  src=[18,19)  op="<"
   │  └─ NumericLiteralShape  pos=19  src=[20,21)  text="3"
   ├─ WrapSymbol  src=[22,23)  text=" "
   └─ ForClauseShape  pos=22  src=[23,24)
      └─ PostfixUnaryExpressionShape  pos=22  src=[23,26)
         └─ IdentifierShape  pos=22  src=[23,24)  text="i"
```

## [char 26] `")"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForStatementShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,14)
   │  └─ VariableDeclarationShape  pos=8  src=[9,14)
   │     ├─ IdentifierShape  pos=8  src=[9,10)  text="i"
   │     └─ NumericLiteralShape  pos=12  src=[13,14)  text="0"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ BinaryExpressionShape  pos=15  src=[16,21)
   │  ├─ IdentifierShape  pos=15  src=[16,17)  text="i"
   │  ├─ LessThanTokenShape  pos=17  src=[18,19)  op="<"
   │  └─ NumericLiteralShape  pos=19  src=[20,21)  text="3"
   ├─ WrapSymbol  src=[22,23)  text=" "
   └─ PostfixUnaryExpressionShape  pos=22  src=[23,26)
      └─ IdentifierShape  pos=22  src=[23,24)  text="i"
```

## [char 27] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForStatementShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,14)
   │  └─ VariableDeclarationShape  pos=8  src=[9,14)
   │     ├─ IdentifierShape  pos=8  src=[9,10)  text="i"
   │     └─ NumericLiteralShape  pos=12  src=[13,14)  text="0"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ BinaryExpressionShape  pos=15  src=[16,21)
   │  ├─ IdentifierShape  pos=15  src=[16,17)  text="i"
   │  ├─ LessThanTokenShape  pos=17  src=[18,19)  op="<"
   │  └─ NumericLiteralShape  pos=19  src=[20,21)  text="3"
   ├─ WrapSymbol  src=[22,23)  text=" "
   ├─ PostfixUnaryExpressionShape  pos=22  src=[23,26)
   │  └─ IdentifierShape  pos=22  src=[23,24)  text="i"
   └─ WrapSymbol  src=[27,28)  text=" "
```

## [char 28] `"{"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForStatementShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,14)
   │  └─ VariableDeclarationShape  pos=8  src=[9,14)
   │     ├─ IdentifierShape  pos=8  src=[9,10)  text="i"
   │     └─ NumericLiteralShape  pos=12  src=[13,14)  text="0"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ BinaryExpressionShape  pos=15  src=[16,21)
   │  ├─ IdentifierShape  pos=15  src=[16,17)  text="i"
   │  ├─ LessThanTokenShape  pos=17  src=[18,19)  op="<"
   │  └─ NumericLiteralShape  pos=19  src=[20,21)  text="3"
   ├─ WrapSymbol  src=[22,23)  text=" "
   ├─ PostfixUnaryExpressionShape  pos=22  src=[23,26)
   │  └─ IdentifierShape  pos=22  src=[23,24)  text="i"
   ├─ WrapSymbol  src=[27,28)  text=" "
   └─ BlockShape  pos=27  src=[28,29)
```

## [char 29] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForStatementShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,14)
   │  └─ VariableDeclarationShape  pos=8  src=[9,14)
   │     ├─ IdentifierShape  pos=8  src=[9,10)  text="i"
   │     └─ NumericLiteralShape  pos=12  src=[13,14)  text="0"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ BinaryExpressionShape  pos=15  src=[16,21)
   │  ├─ IdentifierShape  pos=15  src=[16,17)  text="i"
   │  ├─ LessThanTokenShape  pos=17  src=[18,19)  op="<"
   │  └─ NumericLiteralShape  pos=19  src=[20,21)  text="3"
   ├─ WrapSymbol  src=[22,23)  text=" "
   ├─ PostfixUnaryExpressionShape  pos=22  src=[23,26)
   │  └─ IdentifierShape  pos=22  src=[23,24)  text="i"
   ├─ WrapSymbol  src=[27,28)  text=" "
   └─ BlockShape  pos=27  src=[28,29)
      └─ WrapSymbol  src=[29,30)  text=" "
```

## [char 30] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForStatementShape  pos=0  src=[0,31)
   ├─ VariableDeclarationListShape  pos=5  src=[5,14)
   │  └─ VariableDeclarationShape  pos=8  src=[9,14)
   │     ├─ IdentifierShape  pos=8  src=[9,10)  text="i"
   │     └─ NumericLiteralShape  pos=12  src=[13,14)  text="0"
   ├─ BinaryExpressionShape  pos=15  src=[16,21)
   │  ├─ IdentifierShape  pos=15  src=[16,17)  text="i"
   │  ├─ LessThanTokenShape  pos=17  src=[18,19)  op="<"
   │  └─ NumericLiteralShape  pos=19  src=[20,21)  text="3"
   ├─ PostfixUnaryExpressionShape  pos=22  src=[23,26)
   │  └─ IdentifierShape  pos=22  src=[23,24)  text="i"
   └─ BlockShape  pos=27  src=[28,31)
```

## [char 31] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ ForStatementShape  pos=0  src=[0,31)
│  ├─ VariableDeclarationListShape  pos=5  src=[5,14)
│  │  └─ VariableDeclarationShape  pos=8  src=[9,14)
│  │     ├─ IdentifierShape  pos=8  src=[9,10)  text="i"
│  │     └─ NumericLiteralShape  pos=12  src=[13,14)  text="0"
│  ├─ BinaryExpressionShape  pos=15  src=[16,21)
│  │  ├─ IdentifierShape  pos=15  src=[16,17)  text="i"
│  │  ├─ LessThanTokenShape  pos=17  src=[18,19)  op="<"
│  │  └─ NumericLiteralShape  pos=19  src=[20,21)  text="3"
│  ├─ PostfixUnaryExpressionShape  pos=22  src=[23,26)
│  │  └─ IdentifierShape  pos=22  src=[23,24)  text="i"
│  └─ BlockShape  pos=27  src=[28,31)
└─ WrapSymbol  src=[31,32)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,32)
└─ ForStatementShape  pos=0  src=[0,31)
   ├─ VariableDeclarationListShape  pos=5  src=[5,14)
   │  └─ VariableDeclarationShape  pos=8  src=[9,14)
   │     ├─ IdentifierShape  pos=8  src=[9,10)  text="i"
   │     └─ NumericLiteralShape  pos=12  src=[13,14)  text="0"
   ├─ BinaryExpressionShape  pos=15  src=[16,21)
   │  ├─ IdentifierShape  pos=15  src=[16,17)  text="i"
   │  ├─ LessThanTokenShape  pos=17  src=[18,19)  op="<"
   │  └─ NumericLiteralShape  pos=19  src=[20,21)  text="3"
   ├─ PostfixUnaryExpressionShape  pos=22  src=[23,26)
   │  └─ IdentifierShape  pos=22  src=[23,24)  text="i"
   └─ BlockShape  pos=27  src=[28,31)
```

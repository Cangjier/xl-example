# 预期 token 树（逐字）：`switch (a) { case 1: case 2: b; break; default: c; }`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50 51 52
s w i t c h   ( a )   {   c a s e   1 :   c a s e   2 :   b ;   b r e a k ;   d e f a u l t :   c ;   } ⏎
```

## [char 0] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,1)  text="s"
```

## [char 1] `"w"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,2)  text="sw"
```

## [char 2] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,3)  text="swi"
```

## [char 3] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,4)  text="swit"
```

## [char 4] `"c"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,5)  text="switc"
```

## [char 5] `"h"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,6)  text="switch"
```

## [char 6] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   └─ WrapSymbol  src=[6,7)  text=" "
```

## [char 7] `"("`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ ConditionShape  pos=6  src=[7,8)
```

## [char 8] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ ConditionShape  pos=6  src=[7,8)
      └─ Common  src=[8,9)  text="a"
```

## [char 9] `")"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ IdentifierShape  pos=8  src=[8,9)  text="a"
```

## [char 10] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   └─ WrapSymbol  src=[10,11)  text=" "
```

## [char 11] `"{"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
```

## [char 12] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      └─ WrapSymbol  src=[12,13)  text=" "
```

## [char 13] `"c"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      └─ Common  src=[13,14)  text="c"
```

## [char 14] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      └─ Common  src=[13,15)  text="ca"
```

## [char 15] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      └─ Common  src=[13,16)  text="cas"
```

## [char 16] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      └─ Common  src=[13,17)  text="case"
```

## [char 17] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      └─ CaseClauseShape  pos=12  src=[13,...)
         └─ WrapSymbol  src=[17,18)  text=" "
```

## [char 18] `"1"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      └─ CaseClauseShape  pos=12  src=[13,...)
         ├─ WrapSymbol  src=[17,18)  text=" "
         └─ Common  src=[18,19)  text="1"
```

## [char 19] `":"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      └─ CaseClauseShape  pos=12  src=[13,...)
         ├─ WrapSymbol  src=[17,18)  text=" "
         ├─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
         └─ Symbol  src=[19,20)  text=":"
```

## [char 20] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      └─ CaseClauseShape  pos=12  src=[13,20)
         ├─ WrapSymbol  src=[17,18)  text=" "
         ├─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
         └─ WrapSymbol  src=[20,21)  text=" "
```

## [char 21] `"c"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      └─ CaseClauseShape  pos=12  src=[13,20)
         ├─ WrapSymbol  src=[17,18)  text=" "
         ├─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
         ├─ WrapSymbol  src=[20,21)  text=" "
         └─ Common  src=[21,22)  text="c"
```

## [char 22] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      └─ CaseClauseShape  pos=12  src=[13,20)
         ├─ WrapSymbol  src=[17,18)  text=" "
         ├─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
         ├─ WrapSymbol  src=[20,21)  text=" "
         └─ Common  src=[21,23)  text="ca"
```

## [char 23] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      └─ CaseClauseShape  pos=12  src=[13,20)
         ├─ WrapSymbol  src=[17,18)  text=" "
         ├─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
         ├─ WrapSymbol  src=[20,21)  text=" "
         └─ Common  src=[21,24)  text="cas"
```

## [char 24] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      └─ CaseClauseShape  pos=12  src=[13,20)
         ├─ WrapSymbol  src=[17,18)  text=" "
         ├─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
         ├─ WrapSymbol  src=[20,21)  text=" "
         └─ Common  src=[21,25)  text="case"
```

## [char 25] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      └─ CaseClauseShape  pos=20  src=[21,...)
         └─ WrapSymbol  src=[25,26)  text=" "
```

## [char 26] `"2"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      └─ CaseClauseShape  pos=20  src=[21,...)
         ├─ WrapSymbol  src=[25,26)  text=" "
         └─ Common  src=[26,27)  text="2"
```

## [char 27] `":"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      └─ CaseClauseShape  pos=20  src=[21,...)
         ├─ WrapSymbol  src=[25,26)  text=" "
         ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
         └─ Symbol  src=[27,28)  text=":"
```

## [char 28] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      └─ CaseClauseShape  pos=20  src=[21,28)
         ├─ WrapSymbol  src=[25,26)  text=" "
         ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
         └─ WrapSymbol  src=[28,29)  text=" "
```

## [char 29] `"b"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      └─ CaseClauseShape  pos=20  src=[21,28)
         ├─ WrapSymbol  src=[25,26)  text=" "
         ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
         ├─ WrapSymbol  src=[28,29)  text=" "
         └─ Common  src=[29,30)  text="b"
```

## [char 30] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      └─ CaseClauseShape  pos=20  src=[21,28)
         ├─ WrapSymbol  src=[25,26)  text=" "
         ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
         ├─ WrapSymbol  src=[28,29)  text=" "
         └─ ExpressionStatementShape  pos=28  src=[29,31)
            └─ IdentifierShape  pos=28  src=[29,30)  text="b"
```

## [char 31] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      └─ CaseClauseShape  pos=20  src=[21,28)
         ├─ WrapSymbol  src=[25,26)  text=" "
         ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
         ├─ WrapSymbol  src=[28,29)  text=" "
         ├─ ExpressionStatementShape  pos=28  src=[29,31)
         │  └─ IdentifierShape  pos=28  src=[29,30)  text="b"
         └─ WrapSymbol  src=[31,32)  text=" "
```

## [char 32] `"b"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      └─ CaseClauseShape  pos=20  src=[21,28)
         ├─ WrapSymbol  src=[25,26)  text=" "
         ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
         ├─ WrapSymbol  src=[28,29)  text=" "
         ├─ ExpressionStatementShape  pos=28  src=[29,31)
         │  └─ IdentifierShape  pos=28  src=[29,30)  text="b"
         ├─ WrapSymbol  src=[31,32)  text=" "
         └─ Common  src=[32,33)  text="b"
```

## [char 33] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      └─ CaseClauseShape  pos=20  src=[21,28)
         ├─ WrapSymbol  src=[25,26)  text=" "
         ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
         ├─ WrapSymbol  src=[28,29)  text=" "
         ├─ ExpressionStatementShape  pos=28  src=[29,31)
         │  └─ IdentifierShape  pos=28  src=[29,30)  text="b"
         ├─ WrapSymbol  src=[31,32)  text=" "
         └─ Common  src=[32,34)  text="br"
```

## [char 34] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      └─ CaseClauseShape  pos=20  src=[21,28)
         ├─ WrapSymbol  src=[25,26)  text=" "
         ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
         ├─ WrapSymbol  src=[28,29)  text=" "
         ├─ ExpressionStatementShape  pos=28  src=[29,31)
         │  └─ IdentifierShape  pos=28  src=[29,30)  text="b"
         ├─ WrapSymbol  src=[31,32)  text=" "
         └─ Common  src=[32,35)  text="bre"
```

## [char 35] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      └─ CaseClauseShape  pos=20  src=[21,28)
         ├─ WrapSymbol  src=[25,26)  text=" "
         ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
         ├─ WrapSymbol  src=[28,29)  text=" "
         ├─ ExpressionStatementShape  pos=28  src=[29,31)
         │  └─ IdentifierShape  pos=28  src=[29,30)  text="b"
         ├─ WrapSymbol  src=[31,32)  text=" "
         └─ Common  src=[32,36)  text="brea"
```

## [char 36] `"k"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      └─ CaseClauseShape  pos=20  src=[21,28)
         ├─ WrapSymbol  src=[25,26)  text=" "
         ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
         ├─ WrapSymbol  src=[28,29)  text=" "
         ├─ ExpressionStatementShape  pos=28  src=[29,31)
         │  └─ IdentifierShape  pos=28  src=[29,30)  text="b"
         ├─ WrapSymbol  src=[31,32)  text=" "
         └─ Common  src=[32,37)  text="break"
```

## [char 37] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      └─ CaseClauseShape  pos=20  src=[21,28)
         ├─ WrapSymbol  src=[25,26)  text=" "
         ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
         ├─ WrapSymbol  src=[28,29)  text=" "
         ├─ ExpressionStatementShape  pos=28  src=[29,31)
         │  └─ IdentifierShape  pos=28  src=[29,30)  text="b"
         ├─ WrapSymbol  src=[31,32)  text=" "
         └─ BreakStatementShape  pos=31  src=[32,38)
```

## [char 38] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      └─ CaseClauseShape  pos=20  src=[21,28)
         ├─ WrapSymbol  src=[25,26)  text=" "
         ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
         ├─ WrapSymbol  src=[28,29)  text=" "
         ├─ ExpressionStatementShape  pos=28  src=[29,31)
         │  └─ IdentifierShape  pos=28  src=[29,30)  text="b"
         ├─ WrapSymbol  src=[31,32)  text=" "
         ├─ BreakStatementShape  pos=31  src=[32,38)
         └─ WrapSymbol  src=[38,39)  text=" "
```

## [char 39] `"d"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      └─ CaseClauseShape  pos=20  src=[21,28)
         ├─ WrapSymbol  src=[25,26)  text=" "
         ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
         ├─ WrapSymbol  src=[28,29)  text=" "
         ├─ ExpressionStatementShape  pos=28  src=[29,31)
         │  └─ IdentifierShape  pos=28  src=[29,30)  text="b"
         ├─ WrapSymbol  src=[31,32)  text=" "
         ├─ BreakStatementShape  pos=31  src=[32,38)
         ├─ WrapSymbol  src=[38,39)  text=" "
         └─ Common  src=[39,40)  text="d"
```

## [char 40] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      └─ CaseClauseShape  pos=20  src=[21,28)
         ├─ WrapSymbol  src=[25,26)  text=" "
         ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
         ├─ WrapSymbol  src=[28,29)  text=" "
         ├─ ExpressionStatementShape  pos=28  src=[29,31)
         │  └─ IdentifierShape  pos=28  src=[29,30)  text="b"
         ├─ WrapSymbol  src=[31,32)  text=" "
         ├─ BreakStatementShape  pos=31  src=[32,38)
         ├─ WrapSymbol  src=[38,39)  text=" "
         └─ Common  src=[39,41)  text="de"
```

## [char 41] `"f"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      └─ CaseClauseShape  pos=20  src=[21,28)
         ├─ WrapSymbol  src=[25,26)  text=" "
         ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
         ├─ WrapSymbol  src=[28,29)  text=" "
         ├─ ExpressionStatementShape  pos=28  src=[29,31)
         │  └─ IdentifierShape  pos=28  src=[29,30)  text="b"
         ├─ WrapSymbol  src=[31,32)  text=" "
         ├─ BreakStatementShape  pos=31  src=[32,38)
         ├─ WrapSymbol  src=[38,39)  text=" "
         └─ Common  src=[39,42)  text="def"
```

## [char 42] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      └─ CaseClauseShape  pos=20  src=[21,28)
         ├─ WrapSymbol  src=[25,26)  text=" "
         ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
         ├─ WrapSymbol  src=[28,29)  text=" "
         ├─ ExpressionStatementShape  pos=28  src=[29,31)
         │  └─ IdentifierShape  pos=28  src=[29,30)  text="b"
         ├─ WrapSymbol  src=[31,32)  text=" "
         ├─ BreakStatementShape  pos=31  src=[32,38)
         ├─ WrapSymbol  src=[38,39)  text=" "
         └─ Common  src=[39,43)  text="defa"
```

## [char 43] `"u"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      └─ CaseClauseShape  pos=20  src=[21,28)
         ├─ WrapSymbol  src=[25,26)  text=" "
         ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
         ├─ WrapSymbol  src=[28,29)  text=" "
         ├─ ExpressionStatementShape  pos=28  src=[29,31)
         │  └─ IdentifierShape  pos=28  src=[29,30)  text="b"
         ├─ WrapSymbol  src=[31,32)  text=" "
         ├─ BreakStatementShape  pos=31  src=[32,38)
         ├─ WrapSymbol  src=[38,39)  text=" "
         └─ Common  src=[39,44)  text="defau"
```

## [char 44] `"l"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      └─ CaseClauseShape  pos=20  src=[21,28)
         ├─ WrapSymbol  src=[25,26)  text=" "
         ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
         ├─ WrapSymbol  src=[28,29)  text=" "
         ├─ ExpressionStatementShape  pos=28  src=[29,31)
         │  └─ IdentifierShape  pos=28  src=[29,30)  text="b"
         ├─ WrapSymbol  src=[31,32)  text=" "
         ├─ BreakStatementShape  pos=31  src=[32,38)
         ├─ WrapSymbol  src=[38,39)  text=" "
         └─ Common  src=[39,45)  text="defaul"
```

## [char 45] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      └─ CaseClauseShape  pos=20  src=[21,28)
         ├─ WrapSymbol  src=[25,26)  text=" "
         ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
         ├─ WrapSymbol  src=[28,29)  text=" "
         ├─ ExpressionStatementShape  pos=28  src=[29,31)
         │  └─ IdentifierShape  pos=28  src=[29,30)  text="b"
         ├─ WrapSymbol  src=[31,32)  text=" "
         ├─ BreakStatementShape  pos=31  src=[32,38)
         ├─ WrapSymbol  src=[38,39)  text=" "
         └─ Common  src=[39,46)  text="default"
```

## [char 46] `":"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      ├─ CaseClauseShape  pos=20  src=[21,38)
      │  ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
      │  ├─ ExpressionStatementShape  pos=28  src=[29,31)
      │  │  └─ IdentifierShape  pos=28  src=[29,30)  text="b"
      │  └─ BreakStatementShape  pos=31  src=[32,38)
      ├─ WrapSymbol  src=[38,39)  text=" "
      └─ DefaultClauseShape  pos=38  src=[39,...)
         └─ Symbol  src=[46,47)  text=":"
```

## [char 47] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      ├─ CaseClauseShape  pos=20  src=[21,38)
      │  ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
      │  ├─ ExpressionStatementShape  pos=28  src=[29,31)
      │  │  └─ IdentifierShape  pos=28  src=[29,30)  text="b"
      │  └─ BreakStatementShape  pos=31  src=[32,38)
      ├─ WrapSymbol  src=[38,39)  text=" "
      └─ DefaultClauseShape  pos=38  src=[39,47)
         └─ WrapSymbol  src=[47,48)  text=" "
```

## [char 48] `"c"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      ├─ CaseClauseShape  pos=20  src=[21,38)
      │  ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
      │  ├─ ExpressionStatementShape  pos=28  src=[29,31)
      │  │  └─ IdentifierShape  pos=28  src=[29,30)  text="b"
      │  └─ BreakStatementShape  pos=31  src=[32,38)
      ├─ WrapSymbol  src=[38,39)  text=" "
      └─ DefaultClauseShape  pos=38  src=[39,47)
         ├─ WrapSymbol  src=[47,48)  text=" "
         └─ Common  src=[48,49)  text="c"
```

## [char 49] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      ├─ CaseClauseShape  pos=20  src=[21,38)
      │  ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
      │  ├─ ExpressionStatementShape  pos=28  src=[29,31)
      │  │  └─ IdentifierShape  pos=28  src=[29,30)  text="b"
      │  └─ BreakStatementShape  pos=31  src=[32,38)
      ├─ WrapSymbol  src=[38,39)  text=" "
      └─ DefaultClauseShape  pos=38  src=[39,47)
         ├─ WrapSymbol  src=[47,48)  text=" "
         └─ ExpressionStatementShape  pos=47  src=[48,50)
            └─ IdentifierShape  pos=47  src=[48,49)  text="c"
```

## [char 50] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CaseBlockShape  pos=10  src=[11,12)
      ├─ WrapSymbol  src=[12,13)  text=" "
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ WrapSymbol  src=[20,21)  text=" "
      ├─ CaseClauseShape  pos=20  src=[21,38)
      │  ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
      │  ├─ ExpressionStatementShape  pos=28  src=[29,31)
      │  │  └─ IdentifierShape  pos=28  src=[29,30)  text="b"
      │  └─ BreakStatementShape  pos=31  src=[32,38)
      ├─ WrapSymbol  src=[38,39)  text=" "
      └─ DefaultClauseShape  pos=38  src=[39,47)
         ├─ WrapSymbol  src=[47,48)  text=" "
         ├─ ExpressionStatementShape  pos=47  src=[48,50)
         │  └─ IdentifierShape  pos=47  src=[48,49)  text="c"
         └─ WrapSymbol  src=[50,51)  text=" "
```

## [char 51] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,52)
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   └─ CaseBlockShape  pos=10  src=[11,52)
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ CaseClauseShape  pos=20  src=[21,38)
      │  ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
      │  ├─ ExpressionStatementShape  pos=28  src=[29,31)
      │  │  └─ IdentifierShape  pos=28  src=[29,30)  text="b"
      │  └─ BreakStatementShape  pos=31  src=[32,38)
      └─ DefaultClauseShape  pos=38  src=[39,50)
         └─ ExpressionStatementShape  pos=47  src=[48,50)
            └─ IdentifierShape  pos=47  src=[48,49)  text="c"
```

## [char 52] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ SwitchStatementShape  pos=0  src=[0,52)
│  ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
│  └─ CaseBlockShape  pos=10  src=[11,52)
│     ├─ CaseClauseShape  pos=12  src=[13,20)
│     │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
│     ├─ CaseClauseShape  pos=20  src=[21,38)
│     │  ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
│     │  ├─ ExpressionStatementShape  pos=28  src=[29,31)
│     │  │  └─ IdentifierShape  pos=28  src=[29,30)  text="b"
│     │  └─ BreakStatementShape  pos=31  src=[32,38)
│     └─ DefaultClauseShape  pos=38  src=[39,50)
│        └─ ExpressionStatementShape  pos=47  src=[48,50)
│           └─ IdentifierShape  pos=47  src=[48,49)  text="c"
└─ WrapSymbol  src=[52,53)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,53)
└─ SwitchStatementShape  pos=0  src=[0,52)
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   └─ CaseBlockShape  pos=10  src=[11,52)
      ├─ CaseClauseShape  pos=12  src=[13,20)
      │  └─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
      ├─ CaseClauseShape  pos=20  src=[21,38)
      │  ├─ NumericLiteralShape  pos=25  src=[26,27)  text="2"
      │  ├─ ExpressionStatementShape  pos=28  src=[29,31)
      │  │  └─ IdentifierShape  pos=28  src=[29,30)  text="b"
      │  └─ BreakStatementShape  pos=31  src=[32,38)
      └─ DefaultClauseShape  pos=38  src=[39,50)
         └─ ExpressionStatementShape  pos=47  src=[48,50)
            └─ IdentifierShape  pos=47  src=[48,49)  text="c"
```

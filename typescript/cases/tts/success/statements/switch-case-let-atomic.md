# 预期 token 树（逐字）：`switch (a) { case 1: let y = 1; }`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33
s w i t c h   ( a )   {   c a s e   1 :   l e t   y   =   1 ;   } ⏎
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

## [char 21] `"l"`

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
         └─ Common  src=[21,22)  text="l"
```

## [char 22] `"e"`

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
         └─ Common  src=[21,23)  text="le"
```

## [char 23] `"t"`

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
         └─ Common  src=[21,24)  text="let"
```

## [char 24] `" "`

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
         ├─ Common  src=[21,24)  text="let"
         └─ WrapSymbol  src=[24,25)  text=" "
```

## [char 25] `"y"`

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
         ├─ Common  src=[21,24)  text="let"
         ├─ WrapSymbol  src=[24,25)  text=" "
         └─ Common  src=[25,26)  text="y"
```

## [char 26] `" "`

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
         └─ VariableStatementShape  pos=20  src=[21,...)
            └─ VariableDeclarationListShape  pos=20  src=[21,...)
               └─ VariableDeclarationShape  pos=24  src=[25,...)
                  ├─ IdentifierShape  pos=24  src=[25,26)  text="y"
                  └─ WrapSymbol  src=[26,27)  text=" "
```

## [char 27] `"="`

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
         └─ VariableStatementShape  pos=20  src=[21,...)
            └─ VariableDeclarationListShape  pos=20  src=[21,...)
               └─ VariableDeclarationShape  pos=24  src=[25,...)
                  ├─ IdentifierShape  pos=24  src=[25,26)  text="y"
                  ├─ WrapSymbol  src=[26,27)  text=" "
                  └─ Symbol  src=[27,28)  text="="
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
      └─ CaseClauseShape  pos=12  src=[13,20)
         ├─ WrapSymbol  src=[17,18)  text=" "
         ├─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
         ├─ WrapSymbol  src=[20,21)  text=" "
         └─ VariableStatementShape  pos=20  src=[21,...)
            └─ VariableDeclarationListShape  pos=20  src=[21,...)
               └─ VariableDeclarationShape  pos=24  src=[25,...)
                  ├─ IdentifierShape  pos=24  src=[25,26)  text="y"
                  ├─ WrapSymbol  src=[26,27)  text=" "
                  ├─ Symbol  src=[27,28)  text="="
                  └─ WrapSymbol  src=[28,29)  text=" "
```

## [char 29] `"1"`

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
         └─ VariableStatementShape  pos=20  src=[21,...)
            └─ VariableDeclarationListShape  pos=20  src=[21,...)
               └─ VariableDeclarationShape  pos=24  src=[25,...)
                  ├─ IdentifierShape  pos=24  src=[25,26)  text="y"
                  ├─ WrapSymbol  src=[26,27)  text=" "
                  ├─ Symbol  src=[27,28)  text="="
                  ├─ WrapSymbol  src=[28,29)  text=" "
                  └─ Common  src=[29,30)  text="1"
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
      └─ CaseClauseShape  pos=12  src=[13,20)
         ├─ WrapSymbol  src=[17,18)  text=" "
         ├─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
         ├─ WrapSymbol  src=[20,21)  text=" "
         └─ VariableStatementShape  pos=20  src=[21,31)
            └─ VariableDeclarationListShape  pos=20  src=[21,30)
               └─ VariableDeclarationShape  pos=24  src=[25,30)
                  ├─ IdentifierShape  pos=24  src=[25,26)  text="y"
                  └─ NumericLiteralShape  pos=28  src=[29,30)  text="1"
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
      └─ CaseClauseShape  pos=12  src=[13,20)
         ├─ WrapSymbol  src=[17,18)  text=" "
         ├─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
         ├─ WrapSymbol  src=[20,21)  text=" "
         ├─ VariableStatementShape  pos=20  src=[21,31)
         │  └─ VariableDeclarationListShape  pos=20  src=[21,30)
         │     └─ VariableDeclarationShape  pos=24  src=[25,30)
         │        ├─ IdentifierShape  pos=24  src=[25,26)  text="y"
         │        └─ NumericLiteralShape  pos=28  src=[29,30)  text="1"
         └─ WrapSymbol  src=[31,32)  text=" "
```

## [char 32] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ SwitchStatementShape  pos=0  src=[0,33)
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   └─ CaseBlockShape  pos=10  src=[11,33)
      └─ CaseClauseShape  pos=12  src=[13,31)
         ├─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
         └─ VariableStatementShape  pos=20  src=[21,31)
            └─ VariableDeclarationListShape  pos=20  src=[21,30)
               └─ VariableDeclarationShape  pos=24  src=[25,30)
                  ├─ IdentifierShape  pos=24  src=[25,26)  text="y"
                  └─ NumericLiteralShape  pos=28  src=[29,30)  text="1"
```

## [char 33] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ SwitchStatementShape  pos=0  src=[0,33)
│  ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
│  └─ CaseBlockShape  pos=10  src=[11,33)
│     └─ CaseClauseShape  pos=12  src=[13,31)
│        ├─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
│        └─ VariableStatementShape  pos=20  src=[21,31)
│           └─ VariableDeclarationListShape  pos=20  src=[21,30)
│              └─ VariableDeclarationShape  pos=24  src=[25,30)
│                 ├─ IdentifierShape  pos=24  src=[25,26)  text="y"
│                 └─ NumericLiteralShape  pos=28  src=[29,30)  text="1"
└─ WrapSymbol  src=[33,34)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,34)
└─ SwitchStatementShape  pos=0  src=[0,33)
   ├─ IdentifierShape  pos=8  src=[8,9)  text="a"
   └─ CaseBlockShape  pos=10  src=[11,33)
      └─ CaseClauseShape  pos=12  src=[13,31)
         ├─ NumericLiteralShape  pos=17  src=[18,19)  text="1"
         └─ VariableStatementShape  pos=20  src=[21,31)
            └─ VariableDeclarationListShape  pos=20  src=[21,30)
               └─ VariableDeclarationShape  pos=24  src=[25,30)
                  ├─ IdentifierShape  pos=24  src=[25,26)  text="y"
                  └─ NumericLiteralShape  pos=28  src=[29,30)  text="1"
```

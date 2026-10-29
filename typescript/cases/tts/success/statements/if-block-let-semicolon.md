# 预期 token 树（逐字）：`if (a) { let y = 1; }`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21
i f   ( a )   {   l e t   y   =   1 ;   } ⏎
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

## [char 7] `"{"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
```

## [char 8] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      └─ WrapSymbol  src=[8,9)  text=" "
```

## [char 9] `"l"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ Common  src=[9,10)  text="l"
```

## [char 10] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ Common  src=[9,11)  text="le"
```

## [char 11] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ Common  src=[9,12)  text="let"
```

## [char 12] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      ├─ Common  src=[9,12)  text="let"
      └─ WrapSymbol  src=[12,13)  text=" "
```

## [char 13] `"y"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      ├─ Common  src=[9,12)  text="let"
      ├─ WrapSymbol  src=[12,13)  text=" "
      └─ Common  src=[13,14)  text="y"
```

## [char 14] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ VariableStatementShape  pos=8  src=[9,...)
         └─ VariableDeclarationListShape  pos=8  src=[9,...)
            └─ VariableDeclarationShape  pos=12  src=[13,...)
               ├─ IdentifierShape  pos=12  src=[13,14)  text="y"
               └─ WrapSymbol  src=[14,15)  text=" "
```

## [char 15] `"="`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ VariableStatementShape  pos=8  src=[9,...)
         └─ VariableDeclarationListShape  pos=8  src=[9,...)
            └─ VariableDeclarationShape  pos=12  src=[13,...)
               ├─ IdentifierShape  pos=12  src=[13,14)  text="y"
               ├─ WrapSymbol  src=[14,15)  text=" "
               └─ Symbol  src=[15,16)  text="="
```

## [char 16] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ VariableStatementShape  pos=8  src=[9,...)
         └─ VariableDeclarationListShape  pos=8  src=[9,...)
            └─ VariableDeclarationShape  pos=12  src=[13,...)
               ├─ IdentifierShape  pos=12  src=[13,14)  text="y"
               ├─ WrapSymbol  src=[14,15)  text=" "
               ├─ Symbol  src=[15,16)  text="="
               └─ WrapSymbol  src=[16,17)  text=" "
```

## [char 17] `"1"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ VariableStatementShape  pos=8  src=[9,...)
         └─ VariableDeclarationListShape  pos=8  src=[9,...)
            └─ VariableDeclarationShape  pos=12  src=[13,...)
               ├─ IdentifierShape  pos=12  src=[13,14)  text="y"
               ├─ WrapSymbol  src=[14,15)  text=" "
               ├─ Symbol  src=[15,16)  text="="
               ├─ WrapSymbol  src=[16,17)  text=" "
               └─ Common  src=[17,18)  text="1"
```

## [char 18] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ VariableStatementShape  pos=8  src=[9,19)
         └─ VariableDeclarationListShape  pos=8  src=[9,18)
            └─ VariableDeclarationShape  pos=12  src=[13,18)
               ├─ IdentifierShape  pos=12  src=[13,14)  text="y"
               └─ NumericLiteralShape  pos=16  src=[17,18)  text="1"
```

## [char 19] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ BlockShape  pos=6  src=[7,8)
      ├─ WrapSymbol  src=[8,9)  text=" "
      ├─ VariableStatementShape  pos=8  src=[9,19)
      │  └─ VariableDeclarationListShape  pos=8  src=[9,18)
      │     └─ VariableDeclarationShape  pos=12  src=[13,18)
      │        ├─ IdentifierShape  pos=12  src=[13,14)  text="y"
      │        └─ NumericLiteralShape  pos=16  src=[17,18)  text="1"
      └─ WrapSymbol  src=[19,20)  text=" "
```

## [char 20] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,21)
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   └─ BlockShape  pos=6  src=[7,21)
      └─ VariableStatementShape  pos=8  src=[9,19)
         └─ VariableDeclarationListShape  pos=8  src=[9,18)
            └─ VariableDeclarationShape  pos=12  src=[13,18)
               ├─ IdentifierShape  pos=12  src=[13,14)  text="y"
               └─ NumericLiteralShape  pos=16  src=[17,18)  text="1"
```

## [char 21] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ IfStatementShape  pos=0  src=[0,21)
│  ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
│  └─ BlockShape  pos=6  src=[7,21)
│     └─ VariableStatementShape  pos=8  src=[9,19)
│        └─ VariableDeclarationListShape  pos=8  src=[9,18)
│           └─ VariableDeclarationShape  pos=12  src=[13,18)
│              ├─ IdentifierShape  pos=12  src=[13,14)  text="y"
│              └─ NumericLiteralShape  pos=16  src=[17,18)  text="1"
└─ WrapSymbol  src=[21,22)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,22)
└─ IfStatementShape  pos=0  src=[0,21)
   ├─ IdentifierShape  pos=4  src=[4,5)  text="a"
   └─ BlockShape  pos=6  src=[7,21)
      └─ VariableStatementShape  pos=8  src=[9,19)
         └─ VariableDeclarationListShape  pos=8  src=[9,18)
            └─ VariableDeclarationShape  pos=12  src=[13,18)
               ├─ IdentifierShape  pos=12  src=[13,14)  text="y"
               └─ NumericLiteralShape  pos=16  src=[17,18)  text="1"
```

# 预期 token 树（逐字）：`type A = X extends string ? 1 : 2`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33
t y p e   A   =   X   e x t e n d s   s t r i n g   ?   1   :   2 ⏎
```

## [char 0] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,1)  text="t"
```

## [char 1] `"y"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,2)  text="ty"
```

## [char 2] `"p"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,3)  text="typ"
```

## [char 3] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,4)  text="type"
```

## [char 4] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
├─ Common  src=[0,4)  text="type"
└─ WrapSymbol  src=[4,5)  text=" "
```

## [char 5] `"A"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ Common  src=[0,4)  text="type"
├─ WrapSymbol  src=[4,5)  text=" "
└─ Common  src=[5,6)  text="A"
```

## [char 6] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ WrapSymbol  src=[6,7)  text=" "
```

## [char 7] `"="`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ Symbol  src=[7,8)  text="="
```

## [char 8] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   └─ WrapSymbol  src=[8,9)  text=" "
```

## [char 9] `"X"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ Common  src=[9,10)  text="X"
```

## [char 10] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,10)  text="X"
   └─ WrapSymbol  src=[10,11)  text=" "
```

## [char 11] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,10)  text="X"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,12)  text="e"
```

## [char 12] `"x"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,10)  text="X"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,13)  text="ex"
```

## [char 13] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,10)  text="X"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,14)  text="ext"
```

## [char 14] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,10)  text="X"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,15)  text="exte"
```

## [char 15] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,10)  text="X"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,16)  text="exten"
```

## [char 16] `"d"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,10)  text="X"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,17)  text="extend"
```

## [char 17] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,10)  text="X"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,18)  text="extends"
```

## [char 18] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,10)  text="X"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,18)  text="extends"
   └─ WrapSymbol  src=[18,19)  text=" "
```

## [char 19] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,10)  text="X"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,18)  text="extends"
   ├─ WrapSymbol  src=[18,19)  text=" "
   └─ Common  src=[19,20)  text="s"
```

## [char 20] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,10)  text="X"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,18)  text="extends"
   ├─ WrapSymbol  src=[18,19)  text=" "
   └─ Common  src=[19,21)  text="st"
```

## [char 21] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,10)  text="X"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,18)  text="extends"
   ├─ WrapSymbol  src=[18,19)  text=" "
   └─ Common  src=[19,22)  text="str"
```

## [char 22] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,10)  text="X"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,18)  text="extends"
   ├─ WrapSymbol  src=[18,19)  text=" "
   └─ Common  src=[19,23)  text="stri"
```

## [char 23] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,10)  text="X"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,18)  text="extends"
   ├─ WrapSymbol  src=[18,19)  text=" "
   └─ Common  src=[19,24)  text="strin"
```

## [char 24] `"g"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,10)  text="X"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,18)  text="extends"
   ├─ WrapSymbol  src=[18,19)  text=" "
   └─ Common  src=[19,25)  text="string"
```

## [char 25] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,10)  text="X"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,18)  text="extends"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ Common  src=[19,25)  text="string"
   └─ WrapSymbol  src=[25,26)  text=" "
```

## [char 26] `"?"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,10)  text="X"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,18)  text="extends"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ Common  src=[19,25)  text="string"
   ├─ WrapSymbol  src=[25,26)  text=" "
   └─ Symbol  src=[26,27)  text="?"
```

## [char 27] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,10)  text="X"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,18)  text="extends"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ Common  src=[19,25)  text="string"
   ├─ WrapSymbol  src=[25,26)  text=" "
   ├─ Symbol  src=[26,27)  text="?"
   └─ WrapSymbol  src=[27,28)  text=" "
```

## [char 28] `"1"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,10)  text="X"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,18)  text="extends"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ Common  src=[19,25)  text="string"
   ├─ WrapSymbol  src=[25,26)  text=" "
   ├─ Symbol  src=[26,27)  text="?"
   ├─ WrapSymbol  src=[27,28)  text=" "
   └─ Common  src=[28,29)  text="1"
```

## [char 29] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,10)  text="X"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,18)  text="extends"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ Common  src=[19,25)  text="string"
   ├─ WrapSymbol  src=[25,26)  text=" "
   ├─ Symbol  src=[26,27)  text="?"
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,29)  text="1"
   └─ WrapSymbol  src=[29,30)  text=" "
```

## [char 30] `":"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,10)  text="X"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,18)  text="extends"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ Common  src=[19,25)  text="string"
   ├─ WrapSymbol  src=[25,26)  text=" "
   ├─ Symbol  src=[26,27)  text="?"
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,29)  text="1"
   ├─ WrapSymbol  src=[29,30)  text=" "
   └─ Symbol  src=[30,31)  text=":"
```

## [char 31] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,10)  text="X"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,18)  text="extends"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ Common  src=[19,25)  text="string"
   ├─ WrapSymbol  src=[25,26)  text=" "
   ├─ Symbol  src=[26,27)  text="?"
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,29)  text="1"
   ├─ WrapSymbol  src=[29,30)  text=" "
   ├─ Symbol  src=[30,31)  text=":"
   └─ WrapSymbol  src=[31,32)  text=" "
```

## [char 32] `"2"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,10)  text="X"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,18)  text="extends"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ Common  src=[19,25)  text="string"
   ├─ WrapSymbol  src=[25,26)  text=" "
   ├─ Symbol  src=[26,27)  text="?"
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,29)  text="1"
   ├─ WrapSymbol  src=[29,30)  text=" "
   ├─ Symbol  src=[30,31)  text=":"
   ├─ WrapSymbol  src=[31,32)  text=" "
   └─ Common  src=[32,33)  text="2"
```

## [char 33] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,10)  text="X"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,18)  text="extends"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ Common  src=[19,25)  text="string"
   ├─ WrapSymbol  src=[25,26)  text=" "
   ├─ Symbol  src=[26,27)  text="?"
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,29)  text="1"
   ├─ WrapSymbol  src=[29,30)  text=" "
   ├─ Symbol  src=[30,31)  text=":"
   ├─ WrapSymbol  src=[31,32)  text=" "
   ├─ Common  src=[32,33)  text="2"
   └─ WrapSymbol  src=[33,34)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,34)
└─ TypeAliasDeclarationShape  pos=0  src=[0,33)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ ConditionalTypeShape  pos=8  src=[9,33)
      ├─ TypeReferenceShape  pos=8  src=[9,10)
      │  └─ IdentifierShape  pos=8  src=[9,10)  text="X"
      ├─ StringKeywordShape  pos=18  src=[19,25)  text="string"
      ├─ LiteralTypeShape  pos=27  src=[28,29)
      │  └─ NumericLiteralShape  pos=27  src=[28,29)  text="1"
      └─ LiteralTypeShape  pos=31  src=[32,33)
         └─ NumericLiteralShape  pos=31  src=[32,33)  text="2"
```

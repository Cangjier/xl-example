# 预期 token 树（逐字）：`type B<T extends Array<Array<T>>>= T`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36
t y p e   B < T   e x t e n d s   A r r a y < A r r a y < T > > > =   T ⏎
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

## [char 5] `"B"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ Common  src=[0,4)  text="type"
├─ WrapSymbol  src=[4,5)  text=" "
└─ Common  src=[5,6)  text="B"
```

## [char 6] `"<"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   └─ Symbol  src=[6,7)  text="<"
```

## [char 7] `"T"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   └─ Common  src=[7,8)  text="T"
```

## [char 8] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   └─ WrapSymbol  src=[8,9)  text=" "
```

## [char 9] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ Common  src=[9,10)  text="e"
```

## [char 10] `"x"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ Common  src=[9,11)  text="ex"
```

## [char 11] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ Common  src=[9,12)  text="ext"
```

## [char 12] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ Common  src=[9,13)  text="exte"
```

## [char 13] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ Common  src=[9,14)  text="exten"
```

## [char 14] `"d"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ Common  src=[9,15)  text="extend"
```

## [char 15] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ Common  src=[9,16)  text="extends"
```

## [char 16] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,16)  text="extends"
   └─ WrapSymbol  src=[16,17)  text=" "
```

## [char 17] `"A"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,16)  text="extends"
   ├─ WrapSymbol  src=[16,17)  text=" "
   └─ Common  src=[17,18)  text="A"
```

## [char 18] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,16)  text="extends"
   ├─ WrapSymbol  src=[16,17)  text=" "
   └─ Common  src=[17,19)  text="Ar"
```

## [char 19] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,16)  text="extends"
   ├─ WrapSymbol  src=[16,17)  text=" "
   └─ Common  src=[17,20)  text="Arr"
```

## [char 20] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,16)  text="extends"
   ├─ WrapSymbol  src=[16,17)  text=" "
   └─ Common  src=[17,21)  text="Arra"
```

## [char 21] `"y"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,16)  text="extends"
   ├─ WrapSymbol  src=[16,17)  text=" "
   └─ Common  src=[17,22)  text="Array"
```

## [char 22] `"<"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,16)  text="extends"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,22)  text="Array"
   └─ Symbol  src=[22,23)  text="<"
```

## [char 23] `"A"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,16)  text="extends"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,22)  text="Array"
   ├─ Symbol  src=[22,23)  text="<"
   └─ Common  src=[23,24)  text="A"
```

## [char 24] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,16)  text="extends"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,22)  text="Array"
   ├─ Symbol  src=[22,23)  text="<"
   └─ Common  src=[23,25)  text="Ar"
```

## [char 25] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,16)  text="extends"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,22)  text="Array"
   ├─ Symbol  src=[22,23)  text="<"
   └─ Common  src=[23,26)  text="Arr"
```

## [char 26] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,16)  text="extends"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,22)  text="Array"
   ├─ Symbol  src=[22,23)  text="<"
   └─ Common  src=[23,27)  text="Arra"
```

## [char 27] `"y"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,16)  text="extends"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,22)  text="Array"
   ├─ Symbol  src=[22,23)  text="<"
   └─ Common  src=[23,28)  text="Array"
```

## [char 28] `"<"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,16)  text="extends"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,22)  text="Array"
   ├─ Symbol  src=[22,23)  text="<"
   ├─ Common  src=[23,28)  text="Array"
   └─ Symbol  src=[28,29)  text="<"
```

## [char 29] `"T"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,16)  text="extends"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,22)  text="Array"
   ├─ Symbol  src=[22,23)  text="<"
   ├─ Common  src=[23,28)  text="Array"
   ├─ Symbol  src=[28,29)  text="<"
   └─ Common  src=[29,30)  text="T"
```

## [char 30] `">"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,16)  text="extends"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,22)  text="Array"
   ├─ Symbol  src=[22,23)  text="<"
   ├─ Common  src=[23,28)  text="Array"
   ├─ Symbol  src=[28,29)  text="<"
   ├─ Common  src=[29,30)  text="T"
   └─ Symbol  src=[30,31)  text=">"
```

## [char 31] `">"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,16)  text="extends"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,22)  text="Array"
   ├─ Symbol  src=[22,23)  text="<"
   ├─ Common  src=[23,28)  text="Array"
   ├─ Symbol  src=[28,29)  text="<"
   ├─ Common  src=[29,30)  text="T"
   ├─ Symbol  src=[30,31)  text=">"
   └─ Symbol  src=[31,32)  text=">"
```

## [char 32] `">"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,16)  text="extends"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,22)  text="Array"
   ├─ Symbol  src=[22,23)  text="<"
   ├─ Common  src=[23,28)  text="Array"
   ├─ Symbol  src=[28,29)  text="<"
   ├─ Common  src=[29,30)  text="T"
   ├─ Symbol  src=[30,31)  text=">"
   ├─ Symbol  src=[31,32)  text=">"
   └─ Symbol  src=[32,33)  text=">"
```

## [char 33] `"="`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,16)  text="extends"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,22)  text="Array"
   ├─ Symbol  src=[22,23)  text="<"
   ├─ Common  src=[23,28)  text="Array"
   ├─ Symbol  src=[28,29)  text="<"
   ├─ Common  src=[29,30)  text="T"
   ├─ Symbol  src=[30,31)  text=">"
   ├─ Symbol  src=[31,32)  text=">"
   ├─ Symbol  src=[32,33)  text=">"
   └─ Symbol  src=[33,34)  text="="
```

## [char 34] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,16)  text="extends"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,22)  text="Array"
   ├─ Symbol  src=[22,23)  text="<"
   ├─ Common  src=[23,28)  text="Array"
   ├─ Symbol  src=[28,29)  text="<"
   ├─ Common  src=[29,30)  text="T"
   ├─ Symbol  src=[30,31)  text=">"
   ├─ Symbol  src=[31,32)  text=">"
   ├─ Symbol  src=[32,33)  text=">"
   ├─ Symbol  src=[33,34)  text="="
   └─ WrapSymbol  src=[34,35)  text=" "
```

## [char 35] `"T"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,16)  text="extends"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,22)  text="Array"
   ├─ Symbol  src=[22,23)  text="<"
   ├─ Common  src=[23,28)  text="Array"
   ├─ Symbol  src=[28,29)  text="<"
   ├─ Common  src=[29,30)  text="T"
   ├─ Symbol  src=[30,31)  text=">"
   ├─ Symbol  src=[31,32)  text=">"
   ├─ Symbol  src=[32,33)  text=">"
   ├─ Symbol  src=[33,34)  text="="
   ├─ WrapSymbol  src=[34,35)  text=" "
   └─ Common  src=[35,36)  text="T"
```

## [char 36] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,16)  text="extends"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,22)  text="Array"
   ├─ Symbol  src=[22,23)  text="<"
   ├─ Common  src=[23,28)  text="Array"
   ├─ Symbol  src=[28,29)  text="<"
   ├─ Common  src=[29,30)  text="T"
   ├─ Symbol  src=[30,31)  text=">"
   ├─ Symbol  src=[31,32)  text=">"
   ├─ Symbol  src=[32,33)  text=">"
   ├─ Symbol  src=[33,34)  text="="
   ├─ WrapSymbol  src=[34,35)  text=" "
   ├─ Common  src=[35,36)  text="T"
   └─ WrapSymbol  src=[36,37)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,37)
└─ TypeAliasDeclarationShape  pos=0  src=[0,36)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="B"
   ├─ TypeParameterShape  pos=7  src=[7,32)
   │  ├─ IdentifierShape  pos=7  src=[7,8)  text="T"
   │  └─ TypeReferenceShape  pos=16  src=[17,32)
   │     ├─ IdentifierShape  pos=16  src=[17,22)  text="Array"
   │     └─ TypeReferenceShape  pos=23  src=[23,31)
   │        ├─ IdentifierShape  pos=23  src=[23,28)  text="Array"
   │        └─ TypeReferenceShape  pos=29  src=[29,30)
   │           └─ IdentifierShape  pos=29  src=[29,30)  text="T"
   └─ TypeReferenceShape  pos=34  src=[35,36)
      └─ IdentifierShape  pos=34  src=[35,36)  text="T"
```

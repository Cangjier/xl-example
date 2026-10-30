# 预期 token 树（逐字）：`type A<T> = T extends Array<infer U extends string> ? U : never`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50 51 52 53 54 55 56 57 58 59 60 61 62 63
t y p e   A < T >   =   T   e x t e n d s   A r r a y < i n f e r   U   e x t e n d s   s t r i n g >   ?   U   :   n e v e r ⏎
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

## [char 6] `"<"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ Symbol  src=[6,7)  text="<"
```

## [char 7] `"T"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   └─ Common  src=[7,8)  text="T"
```

## [char 8] `">"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   └─ Symbol  src=[8,9)  text=">"
```

## [char 9] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   └─ WrapSymbol  src=[9,10)  text=" "
```

## [char 10] `"="`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ Symbol  src=[10,11)  text="="
```

## [char 11] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ WrapSymbol  src=[11,12)  text=" "
```

## [char 12] `"T"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   └─ Common  src=[12,13)  text="T"
```

## [char 13] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   └─ WrapSymbol  src=[13,14)  text=" "
```

## [char 14] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Common  src=[14,15)  text="e"
```

## [char 15] `"x"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Common  src=[14,16)  text="ex"
```

## [char 16] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Common  src=[14,17)  text="ext"
```

## [char 17] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Common  src=[14,18)  text="exte"
```

## [char 18] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Common  src=[14,19)  text="exten"
```

## [char 19] `"d"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Common  src=[14,20)  text="extend"
```

## [char 20] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Common  src=[14,21)  text="extends"
```

## [char 21] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   └─ WrapSymbol  src=[21,22)  text=" "
```

## [char 22] `"A"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   └─ Common  src=[22,23)  text="A"
```

## [char 23] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   └─ Common  src=[22,24)  text="Ar"
```

## [char 24] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   └─ Common  src=[22,25)  text="Arr"
```

## [char 25] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   └─ Common  src=[22,26)  text="Arra"
```

## [char 26] `"y"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   └─ Common  src=[22,27)  text="Array"
```

## [char 27] `"<"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   └─ Symbol  src=[27,28)  text="<"
```

## [char 28] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   └─ Common  src=[28,29)  text="i"
```

## [char 29] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   └─ Common  src=[28,30)  text="in"
```

## [char 30] `"f"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   └─ Common  src=[28,31)  text="inf"
```

## [char 31] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   └─ Common  src=[28,32)  text="infe"
```

## [char 32] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   └─ Common  src=[28,33)  text="infer"
```

## [char 33] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   └─ WrapSymbol  src=[33,34)  text=" "
```

## [char 34] `"U"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   └─ Common  src=[34,35)  text="U"
```

## [char 35] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   └─ WrapSymbol  src=[35,36)  text=" "
```

## [char 36] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   └─ Common  src=[36,37)  text="e"
```

## [char 37] `"x"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   └─ Common  src=[36,38)  text="ex"
```

## [char 38] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   └─ Common  src=[36,39)  text="ext"
```

## [char 39] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   └─ Common  src=[36,40)  text="exte"
```

## [char 40] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   └─ Common  src=[36,41)  text="exten"
```

## [char 41] `"d"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   └─ Common  src=[36,42)  text="extend"
```

## [char 42] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   └─ Common  src=[36,43)  text="extends"
```

## [char 43] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,43)  text="extends"
   └─ WrapSymbol  src=[43,44)  text=" "
```

## [char 44] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,43)  text="extends"
   ├─ WrapSymbol  src=[43,44)  text=" "
   └─ Common  src=[44,45)  text="s"
```

## [char 45] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,43)  text="extends"
   ├─ WrapSymbol  src=[43,44)  text=" "
   └─ Common  src=[44,46)  text="st"
```

## [char 46] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,43)  text="extends"
   ├─ WrapSymbol  src=[43,44)  text=" "
   └─ Common  src=[44,47)  text="str"
```

## [char 47] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,43)  text="extends"
   ├─ WrapSymbol  src=[43,44)  text=" "
   └─ Common  src=[44,48)  text="stri"
```

## [char 48] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,43)  text="extends"
   ├─ WrapSymbol  src=[43,44)  text=" "
   └─ Common  src=[44,49)  text="strin"
```

## [char 49] `"g"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,43)  text="extends"
   ├─ WrapSymbol  src=[43,44)  text=" "
   └─ Common  src=[44,50)  text="string"
```

## [char 50] `">"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,43)  text="extends"
   ├─ WrapSymbol  src=[43,44)  text=" "
   ├─ Common  src=[44,50)  text="string"
   └─ Symbol  src=[50,51)  text=">"
```

## [char 51] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,43)  text="extends"
   ├─ WrapSymbol  src=[43,44)  text=" "
   ├─ Common  src=[44,50)  text="string"
   ├─ Symbol  src=[50,51)  text=">"
   └─ WrapSymbol  src=[51,52)  text=" "
```

## [char 52] `"?"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,43)  text="extends"
   ├─ WrapSymbol  src=[43,44)  text=" "
   ├─ Common  src=[44,50)  text="string"
   ├─ Symbol  src=[50,51)  text=">"
   ├─ WrapSymbol  src=[51,52)  text=" "
   └─ Symbol  src=[52,53)  text="?"
```

## [char 53] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,43)  text="extends"
   ├─ WrapSymbol  src=[43,44)  text=" "
   ├─ Common  src=[44,50)  text="string"
   ├─ Symbol  src=[50,51)  text=">"
   ├─ WrapSymbol  src=[51,52)  text=" "
   ├─ Symbol  src=[52,53)  text="?"
   └─ WrapSymbol  src=[53,54)  text=" "
```

## [char 54] `"U"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,43)  text="extends"
   ├─ WrapSymbol  src=[43,44)  text=" "
   ├─ Common  src=[44,50)  text="string"
   ├─ Symbol  src=[50,51)  text=">"
   ├─ WrapSymbol  src=[51,52)  text=" "
   ├─ Symbol  src=[52,53)  text="?"
   ├─ WrapSymbol  src=[53,54)  text=" "
   └─ Common  src=[54,55)  text="U"
```

## [char 55] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,43)  text="extends"
   ├─ WrapSymbol  src=[43,44)  text=" "
   ├─ Common  src=[44,50)  text="string"
   ├─ Symbol  src=[50,51)  text=">"
   ├─ WrapSymbol  src=[51,52)  text=" "
   ├─ Symbol  src=[52,53)  text="?"
   ├─ WrapSymbol  src=[53,54)  text=" "
   ├─ Common  src=[54,55)  text="U"
   └─ WrapSymbol  src=[55,56)  text=" "
```

## [char 56] `":"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,43)  text="extends"
   ├─ WrapSymbol  src=[43,44)  text=" "
   ├─ Common  src=[44,50)  text="string"
   ├─ Symbol  src=[50,51)  text=">"
   ├─ WrapSymbol  src=[51,52)  text=" "
   ├─ Symbol  src=[52,53)  text="?"
   ├─ WrapSymbol  src=[53,54)  text=" "
   ├─ Common  src=[54,55)  text="U"
   ├─ WrapSymbol  src=[55,56)  text=" "
   └─ Symbol  src=[56,57)  text=":"
```

## [char 57] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,43)  text="extends"
   ├─ WrapSymbol  src=[43,44)  text=" "
   ├─ Common  src=[44,50)  text="string"
   ├─ Symbol  src=[50,51)  text=">"
   ├─ WrapSymbol  src=[51,52)  text=" "
   ├─ Symbol  src=[52,53)  text="?"
   ├─ WrapSymbol  src=[53,54)  text=" "
   ├─ Common  src=[54,55)  text="U"
   ├─ WrapSymbol  src=[55,56)  text=" "
   ├─ Symbol  src=[56,57)  text=":"
   └─ WrapSymbol  src=[57,58)  text=" "
```

## [char 58] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,43)  text="extends"
   ├─ WrapSymbol  src=[43,44)  text=" "
   ├─ Common  src=[44,50)  text="string"
   ├─ Symbol  src=[50,51)  text=">"
   ├─ WrapSymbol  src=[51,52)  text=" "
   ├─ Symbol  src=[52,53)  text="?"
   ├─ WrapSymbol  src=[53,54)  text=" "
   ├─ Common  src=[54,55)  text="U"
   ├─ WrapSymbol  src=[55,56)  text=" "
   ├─ Symbol  src=[56,57)  text=":"
   ├─ WrapSymbol  src=[57,58)  text=" "
   └─ Common  src=[58,59)  text="n"
```

## [char 59] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,43)  text="extends"
   ├─ WrapSymbol  src=[43,44)  text=" "
   ├─ Common  src=[44,50)  text="string"
   ├─ Symbol  src=[50,51)  text=">"
   ├─ WrapSymbol  src=[51,52)  text=" "
   ├─ Symbol  src=[52,53)  text="?"
   ├─ WrapSymbol  src=[53,54)  text=" "
   ├─ Common  src=[54,55)  text="U"
   ├─ WrapSymbol  src=[55,56)  text=" "
   ├─ Symbol  src=[56,57)  text=":"
   ├─ WrapSymbol  src=[57,58)  text=" "
   └─ Common  src=[58,60)  text="ne"
```

## [char 60] `"v"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,43)  text="extends"
   ├─ WrapSymbol  src=[43,44)  text=" "
   ├─ Common  src=[44,50)  text="string"
   ├─ Symbol  src=[50,51)  text=">"
   ├─ WrapSymbol  src=[51,52)  text=" "
   ├─ Symbol  src=[52,53)  text="?"
   ├─ WrapSymbol  src=[53,54)  text=" "
   ├─ Common  src=[54,55)  text="U"
   ├─ WrapSymbol  src=[55,56)  text=" "
   ├─ Symbol  src=[56,57)  text=":"
   ├─ WrapSymbol  src=[57,58)  text=" "
   └─ Common  src=[58,61)  text="nev"
```

## [char 61] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,43)  text="extends"
   ├─ WrapSymbol  src=[43,44)  text=" "
   ├─ Common  src=[44,50)  text="string"
   ├─ Symbol  src=[50,51)  text=">"
   ├─ WrapSymbol  src=[51,52)  text=" "
   ├─ Symbol  src=[52,53)  text="?"
   ├─ WrapSymbol  src=[53,54)  text=" "
   ├─ Common  src=[54,55)  text="U"
   ├─ WrapSymbol  src=[55,56)  text=" "
   ├─ Symbol  src=[56,57)  text=":"
   ├─ WrapSymbol  src=[57,58)  text=" "
   └─ Common  src=[58,62)  text="neve"
```

## [char 62] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,43)  text="extends"
   ├─ WrapSymbol  src=[43,44)  text=" "
   ├─ Common  src=[44,50)  text="string"
   ├─ Symbol  src=[50,51)  text=">"
   ├─ WrapSymbol  src=[51,52)  text=" "
   ├─ Symbol  src=[52,53)  text="?"
   ├─ WrapSymbol  src=[53,54)  text=" "
   ├─ Common  src=[54,55)  text="U"
   ├─ WrapSymbol  src=[55,56)  text=" "
   ├─ Symbol  src=[56,57)  text=":"
   ├─ WrapSymbol  src=[57,58)  text=" "
   └─ Common  src=[58,63)  text="never"
```

## [char 63] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ Symbol  src=[6,7)  text="<"
   ├─ Common  src=[7,8)  text="T"
   ├─ Symbol  src=[8,9)  text=">"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,21)  text="extends"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,27)  text="Array"
   ├─ Symbol  src=[27,28)  text="<"
   ├─ Common  src=[28,33)  text="infer"
   ├─ WrapSymbol  src=[33,34)  text=" "
   ├─ Common  src=[34,35)  text="U"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,43)  text="extends"
   ├─ WrapSymbol  src=[43,44)  text=" "
   ├─ Common  src=[44,50)  text="string"
   ├─ Symbol  src=[50,51)  text=">"
   ├─ WrapSymbol  src=[51,52)  text=" "
   ├─ Symbol  src=[52,53)  text="?"
   ├─ WrapSymbol  src=[53,54)  text=" "
   ├─ Common  src=[54,55)  text="U"
   ├─ WrapSymbol  src=[55,56)  text=" "
   ├─ Symbol  src=[56,57)  text=":"
   ├─ WrapSymbol  src=[57,58)  text=" "
   ├─ Common  src=[58,63)  text="never"
   └─ WrapSymbol  src=[63,64)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,64)
└─ TypeAliasDeclarationShape  pos=0  src=[0,63)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   └─ ConditionalTypeShape  pos=11  src=[12,63)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ TypeReferenceShape  pos=21  src=[22,51)
      │  ├─ IdentifierShape  pos=21  src=[22,27)  text="Array"
      │  └─ InferTypeShape  pos=28  src=[28,50)
      │     └─ TypeParameterShape  pos=33  src=[34,50)
      │        ├─ IdentifierShape  pos=33  src=[34,35)  text="U"
      │        └─ StringKeywordShape  pos=43  src=[44,50)  text="string"
      ├─ TypeReferenceShape  pos=53  src=[54,55)
      │  └─ IdentifierShape  pos=53  src=[54,55)  text="U"
      └─ NeverKeywordShape  pos=57  src=[58,63)  text="never"
```

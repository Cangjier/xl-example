# 预期 token 树（逐字）：`type A<T> = T extends Array<infer U> ? U : never`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48
t y p e   A < T >   =   T   e x t e n d s   A r r a y < i n f e r   U >   ?   U   :   n e v e r ⏎
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
   └─ TypeParameterListShape  pos=6  src=[6,...)
      └─ Symbol  src=[6,7)  text="<"
```

## [char 7] `"T"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ TypeParameterListShape  pos=6  src=[6,...)
      ├─ Symbol  src=[6,7)  text="<"
      └─ Common  src=[7,8)  text="T"
```

## [char 8] `">"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ TypeParameterShape  pos=7  src=[7,8)
      └─ IdentifierShape  pos=7  src=[7,8)  text="T"
```

## [char 9] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   └─ WrapSymbol  src=[9,10)  text=" "
```

## [char 10] `"="`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ Symbol  src=[10,11)  text="="
```

## [char 11] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ WrapSymbol  src=[11,12)  text=" "
```

## [char 12] `"T"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
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
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
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
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
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
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
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
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
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
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
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
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
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
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
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
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
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
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      └─ WrapSymbol  src=[21,22)  text=" "
```

## [char 22] `"A"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ Common  src=[22,23)  text="A"
```

## [char 23] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ Common  src=[22,24)  text="Ar"
```

## [char 24] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ Common  src=[22,25)  text="Arr"
```

## [char 25] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ Common  src=[22,26)  text="Arra"
```

## [char 26] `"y"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ Common  src=[22,27)  text="Array"
```

## [char 27] `"<"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ TypeReferenceShape  pos=21  src=[22,...)
         ├─ IdentifierShape  pos=21  src=[22,27)  text="Array"
         └─ Symbol  src=[27,28)  text="<"
```

## [char 28] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ TypeReferenceShape  pos=21  src=[22,...)
         ├─ IdentifierShape  pos=21  src=[22,27)  text="Array"
         ├─ Symbol  src=[27,28)  text="<"
         └─ Common  src=[28,29)  text="i"
```

## [char 29] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ TypeReferenceShape  pos=21  src=[22,...)
         ├─ IdentifierShape  pos=21  src=[22,27)  text="Array"
         ├─ Symbol  src=[27,28)  text="<"
         └─ Common  src=[28,30)  text="in"
```

## [char 30] `"f"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ TypeReferenceShape  pos=21  src=[22,...)
         ├─ IdentifierShape  pos=21  src=[22,27)  text="Array"
         ├─ Symbol  src=[27,28)  text="<"
         └─ Common  src=[28,31)  text="inf"
```

## [char 31] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ TypeReferenceShape  pos=21  src=[22,...)
         ├─ IdentifierShape  pos=21  src=[22,27)  text="Array"
         ├─ Symbol  src=[27,28)  text="<"
         └─ Common  src=[28,32)  text="infe"
```

## [char 32] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ TypeReferenceShape  pos=21  src=[22,...)
         ├─ IdentifierShape  pos=21  src=[22,27)  text="Array"
         ├─ Symbol  src=[27,28)  text="<"
         └─ Common  src=[28,33)  text="infer"
```

## [char 33] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ TypeReferenceShape  pos=21  src=[22,...)
         ├─ IdentifierShape  pos=21  src=[22,27)  text="Array"
         ├─ Symbol  src=[27,28)  text="<"
         ├─ Common  src=[28,33)  text="infer"
         └─ WrapSymbol  src=[33,34)  text=" "
```

## [char 34] `"U"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ TypeReferenceShape  pos=21  src=[22,...)
         ├─ IdentifierShape  pos=21  src=[22,27)  text="Array"
         ├─ Symbol  src=[27,28)  text="<"
         ├─ Common  src=[28,33)  text="infer"
         ├─ WrapSymbol  src=[33,34)  text=" "
         └─ Common  src=[34,35)  text="U"
```

## [char 35] `">"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ TypeReferenceShape  pos=21  src=[22,36)
         ├─ IdentifierShape  pos=21  src=[22,27)  text="Array"
         └─ InferTypeShape  pos=28  src=[28,35)
            └─ TypeParameterShape  pos=33  src=[34,35)
               └─ IdentifierShape  pos=33  src=[34,35)  text="U"
```

## [char 36] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      ├─ TypeReferenceShape  pos=21  src=[22,36)
      │  ├─ IdentifierShape  pos=21  src=[22,27)  text="Array"
      │  └─ InferTypeShape  pos=28  src=[28,35)
      │     └─ TypeParameterShape  pos=33  src=[34,35)
      │        └─ IdentifierShape  pos=33  src=[34,35)  text="U"
      └─ WrapSymbol  src=[36,37)  text=" "
```

## [char 37] `"?"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      ├─ TypeReferenceShape  pos=21  src=[22,36)
      │  ├─ IdentifierShape  pos=21  src=[22,27)  text="Array"
      │  └─ InferTypeShape  pos=28  src=[28,35)
      │     └─ TypeParameterShape  pos=33  src=[34,35)
      │        └─ IdentifierShape  pos=33  src=[34,35)  text="U"
      ├─ WrapSymbol  src=[36,37)  text=" "
      └─ Symbol  src=[37,38)  text="?"
```

## [char 38] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      ├─ TypeReferenceShape  pos=21  src=[22,36)
      │  ├─ IdentifierShape  pos=21  src=[22,27)  text="Array"
      │  └─ InferTypeShape  pos=28  src=[28,35)
      │     └─ TypeParameterShape  pos=33  src=[34,35)
      │        └─ IdentifierShape  pos=33  src=[34,35)  text="U"
      └─ WrapSymbol  src=[38,39)  text=" "
```

## [char 39] `"U"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      ├─ TypeReferenceShape  pos=21  src=[22,36)
      │  ├─ IdentifierShape  pos=21  src=[22,27)  text="Array"
      │  └─ InferTypeShape  pos=28  src=[28,35)
      │     └─ TypeParameterShape  pos=33  src=[34,35)
      │        └─ IdentifierShape  pos=33  src=[34,35)  text="U"
      ├─ WrapSymbol  src=[38,39)  text=" "
      └─ Common  src=[39,40)  text="U"
```

## [char 40] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      ├─ TypeReferenceShape  pos=21  src=[22,36)
      │  ├─ IdentifierShape  pos=21  src=[22,27)  text="Array"
      │  └─ InferTypeShape  pos=28  src=[28,35)
      │     └─ TypeParameterShape  pos=33  src=[34,35)
      │        └─ IdentifierShape  pos=33  src=[34,35)  text="U"
      ├─ WrapSymbol  src=[38,39)  text=" "
      ├─ Common  src=[39,40)  text="U"
      └─ WrapSymbol  src=[40,41)  text=" "
```

## [char 41] `":"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      ├─ TypeReferenceShape  pos=21  src=[22,36)
      │  ├─ IdentifierShape  pos=21  src=[22,27)  text="Array"
      │  └─ InferTypeShape  pos=28  src=[28,35)
      │     └─ TypeParameterShape  pos=33  src=[34,35)
      │        └─ IdentifierShape  pos=33  src=[34,35)  text="U"
      ├─ WrapSymbol  src=[38,39)  text=" "
      ├─ Common  src=[39,40)  text="U"
      ├─ WrapSymbol  src=[40,41)  text=" "
      └─ Symbol  src=[41,42)  text=":"
```

## [char 42] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      ├─ TypeReferenceShape  pos=21  src=[22,36)
      │  ├─ IdentifierShape  pos=21  src=[22,27)  text="Array"
      │  └─ InferTypeShape  pos=28  src=[28,35)
      │     └─ TypeParameterShape  pos=33  src=[34,35)
      │        └─ IdentifierShape  pos=33  src=[34,35)  text="U"
      ├─ TypeReferenceShape  pos=38  src=[39,40)
      │  └─ IdentifierShape  pos=38  src=[39,40)  text="U"
      └─ WrapSymbol  src=[42,43)  text=" "
```

## [char 43] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      ├─ TypeReferenceShape  pos=21  src=[22,36)
      │  ├─ IdentifierShape  pos=21  src=[22,27)  text="Array"
      │  └─ InferTypeShape  pos=28  src=[28,35)
      │     └─ TypeParameterShape  pos=33  src=[34,35)
      │        └─ IdentifierShape  pos=33  src=[34,35)  text="U"
      ├─ TypeReferenceShape  pos=38  src=[39,40)
      │  └─ IdentifierShape  pos=38  src=[39,40)  text="U"
      ├─ WrapSymbol  src=[42,43)  text=" "
      └─ Common  src=[43,44)  text="n"
```

## [char 44] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      ├─ TypeReferenceShape  pos=21  src=[22,36)
      │  ├─ IdentifierShape  pos=21  src=[22,27)  text="Array"
      │  └─ InferTypeShape  pos=28  src=[28,35)
      │     └─ TypeParameterShape  pos=33  src=[34,35)
      │        └─ IdentifierShape  pos=33  src=[34,35)  text="U"
      ├─ TypeReferenceShape  pos=38  src=[39,40)
      │  └─ IdentifierShape  pos=38  src=[39,40)  text="U"
      ├─ WrapSymbol  src=[42,43)  text=" "
      └─ Common  src=[43,45)  text="ne"
```

## [char 45] `"v"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      ├─ TypeReferenceShape  pos=21  src=[22,36)
      │  ├─ IdentifierShape  pos=21  src=[22,27)  text="Array"
      │  └─ InferTypeShape  pos=28  src=[28,35)
      │     └─ TypeParameterShape  pos=33  src=[34,35)
      │        └─ IdentifierShape  pos=33  src=[34,35)  text="U"
      ├─ TypeReferenceShape  pos=38  src=[39,40)
      │  └─ IdentifierShape  pos=38  src=[39,40)  text="U"
      ├─ WrapSymbol  src=[42,43)  text=" "
      └─ Common  src=[43,46)  text="nev"
```

## [char 46] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      ├─ TypeReferenceShape  pos=21  src=[22,36)
      │  ├─ IdentifierShape  pos=21  src=[22,27)  text="Array"
      │  └─ InferTypeShape  pos=28  src=[28,35)
      │     └─ TypeParameterShape  pos=33  src=[34,35)
      │        └─ IdentifierShape  pos=33  src=[34,35)  text="U"
      ├─ TypeReferenceShape  pos=38  src=[39,40)
      │  └─ IdentifierShape  pos=38  src=[39,40)  text="U"
      ├─ WrapSymbol  src=[42,43)  text=" "
      └─ Common  src=[43,47)  text="neve"
```

## [char 47] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      ├─ TypeReferenceShape  pos=21  src=[22,36)
      │  ├─ IdentifierShape  pos=21  src=[22,27)  text="Array"
      │  └─ InferTypeShape  pos=28  src=[28,35)
      │     └─ TypeParameterShape  pos=33  src=[34,35)
      │        └─ IdentifierShape  pos=33  src=[34,35)  text="U"
      ├─ TypeReferenceShape  pos=38  src=[39,40)
      │  └─ IdentifierShape  pos=38  src=[39,40)  text="U"
      ├─ WrapSymbol  src=[42,43)  text=" "
      └─ Common  src=[43,48)  text="never"
```

## [char 48] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      ├─ TypeReferenceShape  pos=21  src=[22,36)
      │  ├─ IdentifierShape  pos=21  src=[22,27)  text="Array"
      │  └─ InferTypeShape  pos=28  src=[28,35)
      │     └─ TypeParameterShape  pos=33  src=[34,35)
      │        └─ IdentifierShape  pos=33  src=[34,35)  text="U"
      ├─ TypeReferenceShape  pos=38  src=[39,40)
      │  └─ IdentifierShape  pos=38  src=[39,40)  text="U"
      ├─ NeverKeywordShape  pos=42  src=[43,48)  text="never"
      └─ WrapSymbol  src=[48,49)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,49)
└─ TypeAliasDeclarationShape  pos=0  src=[0,48)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   └─ ConditionalTypeShape  pos=11  src=[12,48)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ TypeReferenceShape  pos=21  src=[22,36)
      │  ├─ IdentifierShape  pos=21  src=[22,27)  text="Array"
      │  └─ InferTypeShape  pos=28  src=[28,35)
      │     └─ TypeParameterShape  pos=33  src=[34,35)
      │        └─ IdentifierShape  pos=33  src=[34,35)  text="U"
      ├─ TypeReferenceShape  pos=38  src=[39,40)
      │  └─ IdentifierShape  pos=38  src=[39,40)  text="U"
      └─ NeverKeywordShape  pos=42  src=[43,48)  text="never"
```

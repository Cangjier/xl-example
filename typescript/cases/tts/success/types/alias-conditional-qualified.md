# 预期 token 树（逐字）：`type A<T> = T extends NS.Array<infer U> ? U : never`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50 51
t y p e   A < T >   =   T   e x t e n d s   N S . A r r a y < i n f e r   U >   ?   U   :   n e v e r ⏎
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

## [char 22] `"N"`

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
      └─ Common  src=[22,23)  text="N"
```

## [char 23] `"S"`

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
      └─ Common  src=[22,24)  text="NS"
```

## [char 24] `"."`

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
      ├─ Common  src=[22,24)  text="NS"
      └─ Symbol  src=[24,25)  text="."
```

## [char 25] `"A"`

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
      ├─ Common  src=[22,24)  text="NS"
      ├─ Symbol  src=[24,25)  text="."
      └─ Common  src=[25,26)  text="A"
```

## [char 26] `"r"`

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
      ├─ Common  src=[22,24)  text="NS"
      ├─ Symbol  src=[24,25)  text="."
      └─ Common  src=[25,27)  text="Ar"
```

## [char 27] `"r"`

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
      ├─ Common  src=[22,24)  text="NS"
      ├─ Symbol  src=[24,25)  text="."
      └─ Common  src=[25,28)  text="Arr"
```

## [char 28] `"a"`

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
      ├─ Common  src=[22,24)  text="NS"
      ├─ Symbol  src=[24,25)  text="."
      └─ Common  src=[25,29)  text="Arra"
```

## [char 29] `"y"`

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
      ├─ Common  src=[22,24)  text="NS"
      ├─ Symbol  src=[24,25)  text="."
      └─ Common  src=[25,30)  text="Array"
```

## [char 30] `"<"`

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
         ├─ QualifiedNameShape  pos=21  src=[22,30)
         │  ├─ IdentifierShape  pos=21  src=[22,24)  text="NS"
         │  └─ IdentifierShape  pos=25  src=[25,30)  text="Array"
         └─ Symbol  src=[30,31)  text="<"
```

## [char 31] `"i"`

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
         ├─ QualifiedNameShape  pos=21  src=[22,30)
         │  ├─ IdentifierShape  pos=21  src=[22,24)  text="NS"
         │  └─ IdentifierShape  pos=25  src=[25,30)  text="Array"
         ├─ Symbol  src=[30,31)  text="<"
         └─ Common  src=[31,32)  text="i"
```

## [char 32] `"n"`

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
         ├─ QualifiedNameShape  pos=21  src=[22,30)
         │  ├─ IdentifierShape  pos=21  src=[22,24)  text="NS"
         │  └─ IdentifierShape  pos=25  src=[25,30)  text="Array"
         ├─ Symbol  src=[30,31)  text="<"
         └─ Common  src=[31,33)  text="in"
```

## [char 33] `"f"`

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
         ├─ QualifiedNameShape  pos=21  src=[22,30)
         │  ├─ IdentifierShape  pos=21  src=[22,24)  text="NS"
         │  └─ IdentifierShape  pos=25  src=[25,30)  text="Array"
         ├─ Symbol  src=[30,31)  text="<"
         └─ Common  src=[31,34)  text="inf"
```

## [char 34] `"e"`

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
         ├─ QualifiedNameShape  pos=21  src=[22,30)
         │  ├─ IdentifierShape  pos=21  src=[22,24)  text="NS"
         │  └─ IdentifierShape  pos=25  src=[25,30)  text="Array"
         ├─ Symbol  src=[30,31)  text="<"
         └─ Common  src=[31,35)  text="infe"
```

## [char 35] `"r"`

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
         ├─ QualifiedNameShape  pos=21  src=[22,30)
         │  ├─ IdentifierShape  pos=21  src=[22,24)  text="NS"
         │  └─ IdentifierShape  pos=25  src=[25,30)  text="Array"
         ├─ Symbol  src=[30,31)  text="<"
         └─ Common  src=[31,36)  text="infer"
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
      └─ TypeReferenceShape  pos=21  src=[22,...)
         ├─ QualifiedNameShape  pos=21  src=[22,30)
         │  ├─ IdentifierShape  pos=21  src=[22,24)  text="NS"
         │  └─ IdentifierShape  pos=25  src=[25,30)  text="Array"
         ├─ Symbol  src=[30,31)  text="<"
         ├─ Common  src=[31,36)  text="infer"
         └─ WrapSymbol  src=[36,37)  text=" "
```

## [char 37] `"U"`

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
         ├─ QualifiedNameShape  pos=21  src=[22,30)
         │  ├─ IdentifierShape  pos=21  src=[22,24)  text="NS"
         │  └─ IdentifierShape  pos=25  src=[25,30)  text="Array"
         ├─ Symbol  src=[30,31)  text="<"
         ├─ Common  src=[31,36)  text="infer"
         ├─ WrapSymbol  src=[36,37)  text=" "
         └─ Common  src=[37,38)  text="U"
```

## [char 38] `">"`

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
      └─ TypeReferenceShape  pos=21  src=[22,39)
         ├─ QualifiedNameShape  pos=21  src=[22,30)
         │  ├─ IdentifierShape  pos=21  src=[22,24)  text="NS"
         │  └─ IdentifierShape  pos=25  src=[25,30)  text="Array"
         └─ InferTypeShape  pos=31  src=[31,38)
            └─ TypeParameterShape  pos=36  src=[37,38)
               └─ IdentifierShape  pos=36  src=[37,38)  text="U"
```

## [char 39] `" "`

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
      ├─ TypeReferenceShape  pos=21  src=[22,39)
      │  ├─ QualifiedNameShape  pos=21  src=[22,30)
      │  │  ├─ IdentifierShape  pos=21  src=[22,24)  text="NS"
      │  │  └─ IdentifierShape  pos=25  src=[25,30)  text="Array"
      │  └─ InferTypeShape  pos=31  src=[31,38)
      │     └─ TypeParameterShape  pos=36  src=[37,38)
      │        └─ IdentifierShape  pos=36  src=[37,38)  text="U"
      └─ WrapSymbol  src=[39,40)  text=" "
```

## [char 40] `"?"`

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
      ├─ TypeReferenceShape  pos=21  src=[22,39)
      │  ├─ QualifiedNameShape  pos=21  src=[22,30)
      │  │  ├─ IdentifierShape  pos=21  src=[22,24)  text="NS"
      │  │  └─ IdentifierShape  pos=25  src=[25,30)  text="Array"
      │  └─ InferTypeShape  pos=31  src=[31,38)
      │     └─ TypeParameterShape  pos=36  src=[37,38)
      │        └─ IdentifierShape  pos=36  src=[37,38)  text="U"
      ├─ WrapSymbol  src=[39,40)  text=" "
      └─ Symbol  src=[40,41)  text="?"
```

## [char 41] `" "`

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
      ├─ TypeReferenceShape  pos=21  src=[22,39)
      │  ├─ QualifiedNameShape  pos=21  src=[22,30)
      │  │  ├─ IdentifierShape  pos=21  src=[22,24)  text="NS"
      │  │  └─ IdentifierShape  pos=25  src=[25,30)  text="Array"
      │  └─ InferTypeShape  pos=31  src=[31,38)
      │     └─ TypeParameterShape  pos=36  src=[37,38)
      │        └─ IdentifierShape  pos=36  src=[37,38)  text="U"
      └─ WrapSymbol  src=[41,42)  text=" "
```

## [char 42] `"U"`

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
      ├─ TypeReferenceShape  pos=21  src=[22,39)
      │  ├─ QualifiedNameShape  pos=21  src=[22,30)
      │  │  ├─ IdentifierShape  pos=21  src=[22,24)  text="NS"
      │  │  └─ IdentifierShape  pos=25  src=[25,30)  text="Array"
      │  └─ InferTypeShape  pos=31  src=[31,38)
      │     └─ TypeParameterShape  pos=36  src=[37,38)
      │        └─ IdentifierShape  pos=36  src=[37,38)  text="U"
      ├─ WrapSymbol  src=[41,42)  text=" "
      └─ Common  src=[42,43)  text="U"
```

## [char 43] `" "`

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
      ├─ TypeReferenceShape  pos=21  src=[22,39)
      │  ├─ QualifiedNameShape  pos=21  src=[22,30)
      │  │  ├─ IdentifierShape  pos=21  src=[22,24)  text="NS"
      │  │  └─ IdentifierShape  pos=25  src=[25,30)  text="Array"
      │  └─ InferTypeShape  pos=31  src=[31,38)
      │     └─ TypeParameterShape  pos=36  src=[37,38)
      │        └─ IdentifierShape  pos=36  src=[37,38)  text="U"
      ├─ WrapSymbol  src=[41,42)  text=" "
      ├─ Common  src=[42,43)  text="U"
      └─ WrapSymbol  src=[43,44)  text=" "
```

## [char 44] `":"`

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
      ├─ TypeReferenceShape  pos=21  src=[22,39)
      │  ├─ QualifiedNameShape  pos=21  src=[22,30)
      │  │  ├─ IdentifierShape  pos=21  src=[22,24)  text="NS"
      │  │  └─ IdentifierShape  pos=25  src=[25,30)  text="Array"
      │  └─ InferTypeShape  pos=31  src=[31,38)
      │     └─ TypeParameterShape  pos=36  src=[37,38)
      │        └─ IdentifierShape  pos=36  src=[37,38)  text="U"
      ├─ WrapSymbol  src=[41,42)  text=" "
      ├─ Common  src=[42,43)  text="U"
      ├─ WrapSymbol  src=[43,44)  text=" "
      └─ Symbol  src=[44,45)  text=":"
```

## [char 45] `" "`

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
      ├─ TypeReferenceShape  pos=21  src=[22,39)
      │  ├─ QualifiedNameShape  pos=21  src=[22,30)
      │  │  ├─ IdentifierShape  pos=21  src=[22,24)  text="NS"
      │  │  └─ IdentifierShape  pos=25  src=[25,30)  text="Array"
      │  └─ InferTypeShape  pos=31  src=[31,38)
      │     └─ TypeParameterShape  pos=36  src=[37,38)
      │        └─ IdentifierShape  pos=36  src=[37,38)  text="U"
      ├─ TypeReferenceShape  pos=41  src=[42,43)
      │  └─ IdentifierShape  pos=41  src=[42,43)  text="U"
      └─ WrapSymbol  src=[45,46)  text=" "
```

## [char 46] `"n"`

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
      ├─ TypeReferenceShape  pos=21  src=[22,39)
      │  ├─ QualifiedNameShape  pos=21  src=[22,30)
      │  │  ├─ IdentifierShape  pos=21  src=[22,24)  text="NS"
      │  │  └─ IdentifierShape  pos=25  src=[25,30)  text="Array"
      │  └─ InferTypeShape  pos=31  src=[31,38)
      │     └─ TypeParameterShape  pos=36  src=[37,38)
      │        └─ IdentifierShape  pos=36  src=[37,38)  text="U"
      ├─ TypeReferenceShape  pos=41  src=[42,43)
      │  └─ IdentifierShape  pos=41  src=[42,43)  text="U"
      ├─ WrapSymbol  src=[45,46)  text=" "
      └─ Common  src=[46,47)  text="n"
```

## [char 47] `"e"`

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
      ├─ TypeReferenceShape  pos=21  src=[22,39)
      │  ├─ QualifiedNameShape  pos=21  src=[22,30)
      │  │  ├─ IdentifierShape  pos=21  src=[22,24)  text="NS"
      │  │  └─ IdentifierShape  pos=25  src=[25,30)  text="Array"
      │  └─ InferTypeShape  pos=31  src=[31,38)
      │     └─ TypeParameterShape  pos=36  src=[37,38)
      │        └─ IdentifierShape  pos=36  src=[37,38)  text="U"
      ├─ TypeReferenceShape  pos=41  src=[42,43)
      │  └─ IdentifierShape  pos=41  src=[42,43)  text="U"
      ├─ WrapSymbol  src=[45,46)  text=" "
      └─ Common  src=[46,48)  text="ne"
```

## [char 48] `"v"`

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
      ├─ TypeReferenceShape  pos=21  src=[22,39)
      │  ├─ QualifiedNameShape  pos=21  src=[22,30)
      │  │  ├─ IdentifierShape  pos=21  src=[22,24)  text="NS"
      │  │  └─ IdentifierShape  pos=25  src=[25,30)  text="Array"
      │  └─ InferTypeShape  pos=31  src=[31,38)
      │     └─ TypeParameterShape  pos=36  src=[37,38)
      │        └─ IdentifierShape  pos=36  src=[37,38)  text="U"
      ├─ TypeReferenceShape  pos=41  src=[42,43)
      │  └─ IdentifierShape  pos=41  src=[42,43)  text="U"
      ├─ WrapSymbol  src=[45,46)  text=" "
      └─ Common  src=[46,49)  text="nev"
```

## [char 49] `"e"`

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
      ├─ TypeReferenceShape  pos=21  src=[22,39)
      │  ├─ QualifiedNameShape  pos=21  src=[22,30)
      │  │  ├─ IdentifierShape  pos=21  src=[22,24)  text="NS"
      │  │  └─ IdentifierShape  pos=25  src=[25,30)  text="Array"
      │  └─ InferTypeShape  pos=31  src=[31,38)
      │     └─ TypeParameterShape  pos=36  src=[37,38)
      │        └─ IdentifierShape  pos=36  src=[37,38)  text="U"
      ├─ TypeReferenceShape  pos=41  src=[42,43)
      │  └─ IdentifierShape  pos=41  src=[42,43)  text="U"
      ├─ WrapSymbol  src=[45,46)  text=" "
      └─ Common  src=[46,50)  text="neve"
```

## [char 50] `"r"`

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
      ├─ TypeReferenceShape  pos=21  src=[22,39)
      │  ├─ QualifiedNameShape  pos=21  src=[22,30)
      │  │  ├─ IdentifierShape  pos=21  src=[22,24)  text="NS"
      │  │  └─ IdentifierShape  pos=25  src=[25,30)  text="Array"
      │  └─ InferTypeShape  pos=31  src=[31,38)
      │     └─ TypeParameterShape  pos=36  src=[37,38)
      │        └─ IdentifierShape  pos=36  src=[37,38)  text="U"
      ├─ TypeReferenceShape  pos=41  src=[42,43)
      │  └─ IdentifierShape  pos=41  src=[42,43)  text="U"
      ├─ WrapSymbol  src=[45,46)  text=" "
      └─ Common  src=[46,51)  text="never"
```

## [char 51] `"\n"`

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
      ├─ TypeReferenceShape  pos=21  src=[22,39)
      │  ├─ QualifiedNameShape  pos=21  src=[22,30)
      │  │  ├─ IdentifierShape  pos=21  src=[22,24)  text="NS"
      │  │  └─ IdentifierShape  pos=25  src=[25,30)  text="Array"
      │  └─ InferTypeShape  pos=31  src=[31,38)
      │     └─ TypeParameterShape  pos=36  src=[37,38)
      │        └─ IdentifierShape  pos=36  src=[37,38)  text="U"
      ├─ TypeReferenceShape  pos=41  src=[42,43)
      │  └─ IdentifierShape  pos=41  src=[42,43)  text="U"
      ├─ NeverKeywordShape  pos=45  src=[46,51)  text="never"
      └─ WrapSymbol  src=[51,52)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,52)
└─ TypeAliasDeclarationShape  pos=0  src=[0,51)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   └─ ConditionalTypeShape  pos=11  src=[12,51)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ TypeReferenceShape  pos=21  src=[22,39)
      │  ├─ QualifiedNameShape  pos=21  src=[22,30)
      │  │  ├─ IdentifierShape  pos=21  src=[22,24)  text="NS"
      │  │  └─ IdentifierShape  pos=25  src=[25,30)  text="Array"
      │  └─ InferTypeShape  pos=31  src=[31,38)
      │     └─ TypeParameterShape  pos=36  src=[37,38)
      │        └─ IdentifierShape  pos=36  src=[37,38)  text="U"
      ├─ TypeReferenceShape  pos=41  src=[42,43)
      │  └─ IdentifierShape  pos=41  src=[42,43)  text="U"
      └─ NeverKeywordShape  pos=45  src=[46,51)  text="never"
```

# 预期 token 树（逐字）：`type A<T> = T extends string ? Array<T> : Map<string, T>`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50 51 52 53 54 55 56
t y p e   A < T >   =   T   e x t e n d s   s t r i n g   ?   A r r a y < T >   :   M a p < s t r i n g ,   T > ⏎
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

## [char 22] `"s"`

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
      └─ Common  src=[22,23)  text="s"
```

## [char 23] `"t"`

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
      └─ Common  src=[22,24)  text="st"
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
      └─ Common  src=[22,25)  text="str"
```

## [char 25] `"i"`

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
      └─ Common  src=[22,26)  text="stri"
```

## [char 26] `"n"`

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
      └─ Common  src=[22,27)  text="strin"
```

## [char 27] `"g"`

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
      └─ Common  src=[22,28)  text="string"
```

## [char 28] `" "`

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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      └─ WrapSymbol  src=[28,29)  text=" "
```

## [char 29] `"?"`

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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[28,29)  text=" "
      └─ Symbol  src=[29,30)  text="?"
```

## [char 30] `" "`

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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      └─ WrapSymbol  src=[30,31)  text=" "
```

## [char 31] `"A"`

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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      └─ Common  src=[31,32)  text="A"
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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      └─ Common  src=[31,33)  text="Ar"
```

## [char 33] `"r"`

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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      └─ Common  src=[31,34)  text="Arr"
```

## [char 34] `"a"`

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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      └─ Common  src=[31,35)  text="Arra"
```

## [char 35] `"y"`

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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      └─ Common  src=[31,36)  text="Array"
```

## [char 36] `"<"`

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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      └─ TypeReferenceShape  pos=30  src=[31,...)
         ├─ IdentifierShape  pos=30  src=[31,36)  text="Array"
         └─ TypeArgumentListShape  pos=36  src=[36,...)
            └─ Symbol  src=[36,37)  text="<"
```

## [char 37] `"T"`

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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      └─ TypeReferenceShape  pos=30  src=[31,...)
         ├─ IdentifierShape  pos=30  src=[31,36)  text="Array"
         └─ TypeArgumentListShape  pos=36  src=[36,...)
            ├─ Symbol  src=[36,37)  text="<"
            └─ Common  src=[37,38)  text="T"
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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      └─ TypeReferenceShape  pos=30  src=[31,39)
         ├─ IdentifierShape  pos=30  src=[31,36)  text="Array"
         └─ TypeReferenceShape  pos=37  src=[37,38)
            └─ IdentifierShape  pos=37  src=[37,38)  text="T"
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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      ├─ TypeReferenceShape  pos=30  src=[31,39)
      │  ├─ IdentifierShape  pos=30  src=[31,36)  text="Array"
      │  └─ TypeReferenceShape  pos=37  src=[37,38)
      │     └─ IdentifierShape  pos=37  src=[37,38)  text="T"
      └─ WrapSymbol  src=[39,40)  text=" "
```

## [char 40] `":"`

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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      ├─ TypeReferenceShape  pos=30  src=[31,39)
      │  ├─ IdentifierShape  pos=30  src=[31,36)  text="Array"
      │  └─ TypeReferenceShape  pos=37  src=[37,38)
      │     └─ IdentifierShape  pos=37  src=[37,38)  text="T"
      ├─ WrapSymbol  src=[39,40)  text=" "
      └─ Symbol  src=[40,41)  text=":"
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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      ├─ TypeReferenceShape  pos=30  src=[31,39)
      │  ├─ IdentifierShape  pos=30  src=[31,36)  text="Array"
      │  └─ TypeReferenceShape  pos=37  src=[37,38)
      │     └─ IdentifierShape  pos=37  src=[37,38)  text="T"
      └─ WrapSymbol  src=[41,42)  text=" "
```

## [char 42] `"M"`

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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      ├─ TypeReferenceShape  pos=30  src=[31,39)
      │  ├─ IdentifierShape  pos=30  src=[31,36)  text="Array"
      │  └─ TypeReferenceShape  pos=37  src=[37,38)
      │     └─ IdentifierShape  pos=37  src=[37,38)  text="T"
      ├─ WrapSymbol  src=[41,42)  text=" "
      └─ Common  src=[42,43)  text="M"
```

## [char 43] `"a"`

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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      ├─ TypeReferenceShape  pos=30  src=[31,39)
      │  ├─ IdentifierShape  pos=30  src=[31,36)  text="Array"
      │  └─ TypeReferenceShape  pos=37  src=[37,38)
      │     └─ IdentifierShape  pos=37  src=[37,38)  text="T"
      ├─ WrapSymbol  src=[41,42)  text=" "
      └─ Common  src=[42,44)  text="Ma"
```

## [char 44] `"p"`

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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      ├─ TypeReferenceShape  pos=30  src=[31,39)
      │  ├─ IdentifierShape  pos=30  src=[31,36)  text="Array"
      │  └─ TypeReferenceShape  pos=37  src=[37,38)
      │     └─ IdentifierShape  pos=37  src=[37,38)  text="T"
      ├─ WrapSymbol  src=[41,42)  text=" "
      └─ Common  src=[42,45)  text="Map"
```

## [char 45] `"<"`

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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      ├─ TypeReferenceShape  pos=30  src=[31,39)
      │  ├─ IdentifierShape  pos=30  src=[31,36)  text="Array"
      │  └─ TypeReferenceShape  pos=37  src=[37,38)
      │     └─ IdentifierShape  pos=37  src=[37,38)  text="T"
      ├─ WrapSymbol  src=[41,42)  text=" "
      └─ TypeReferenceShape  pos=41  src=[42,...)
         ├─ IdentifierShape  pos=41  src=[42,45)  text="Map"
         └─ TypeArgumentListShape  pos=45  src=[45,...)
            └─ Symbol  src=[45,46)  text="<"
```

## [char 46] `"s"`

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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      ├─ TypeReferenceShape  pos=30  src=[31,39)
      │  ├─ IdentifierShape  pos=30  src=[31,36)  text="Array"
      │  └─ TypeReferenceShape  pos=37  src=[37,38)
      │     └─ IdentifierShape  pos=37  src=[37,38)  text="T"
      ├─ WrapSymbol  src=[41,42)  text=" "
      └─ TypeReferenceShape  pos=41  src=[42,...)
         ├─ IdentifierShape  pos=41  src=[42,45)  text="Map"
         └─ TypeArgumentListShape  pos=45  src=[45,...)
            ├─ Symbol  src=[45,46)  text="<"
            └─ Common  src=[46,47)  text="s"
```

## [char 47] `"t"`

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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      ├─ TypeReferenceShape  pos=30  src=[31,39)
      │  ├─ IdentifierShape  pos=30  src=[31,36)  text="Array"
      │  └─ TypeReferenceShape  pos=37  src=[37,38)
      │     └─ IdentifierShape  pos=37  src=[37,38)  text="T"
      ├─ WrapSymbol  src=[41,42)  text=" "
      └─ TypeReferenceShape  pos=41  src=[42,...)
         ├─ IdentifierShape  pos=41  src=[42,45)  text="Map"
         └─ TypeArgumentListShape  pos=45  src=[45,...)
            ├─ Symbol  src=[45,46)  text="<"
            └─ Common  src=[46,48)  text="st"
```

## [char 48] `"r"`

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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      ├─ TypeReferenceShape  pos=30  src=[31,39)
      │  ├─ IdentifierShape  pos=30  src=[31,36)  text="Array"
      │  └─ TypeReferenceShape  pos=37  src=[37,38)
      │     └─ IdentifierShape  pos=37  src=[37,38)  text="T"
      ├─ WrapSymbol  src=[41,42)  text=" "
      └─ TypeReferenceShape  pos=41  src=[42,...)
         ├─ IdentifierShape  pos=41  src=[42,45)  text="Map"
         └─ TypeArgumentListShape  pos=45  src=[45,...)
            ├─ Symbol  src=[45,46)  text="<"
            └─ Common  src=[46,49)  text="str"
```

## [char 49] `"i"`

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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      ├─ TypeReferenceShape  pos=30  src=[31,39)
      │  ├─ IdentifierShape  pos=30  src=[31,36)  text="Array"
      │  └─ TypeReferenceShape  pos=37  src=[37,38)
      │     └─ IdentifierShape  pos=37  src=[37,38)  text="T"
      ├─ WrapSymbol  src=[41,42)  text=" "
      └─ TypeReferenceShape  pos=41  src=[42,...)
         ├─ IdentifierShape  pos=41  src=[42,45)  text="Map"
         └─ TypeArgumentListShape  pos=45  src=[45,...)
            ├─ Symbol  src=[45,46)  text="<"
            └─ Common  src=[46,50)  text="stri"
```

## [char 50] `"n"`

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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      ├─ TypeReferenceShape  pos=30  src=[31,39)
      │  ├─ IdentifierShape  pos=30  src=[31,36)  text="Array"
      │  └─ TypeReferenceShape  pos=37  src=[37,38)
      │     └─ IdentifierShape  pos=37  src=[37,38)  text="T"
      ├─ WrapSymbol  src=[41,42)  text=" "
      └─ TypeReferenceShape  pos=41  src=[42,...)
         ├─ IdentifierShape  pos=41  src=[42,45)  text="Map"
         └─ TypeArgumentListShape  pos=45  src=[45,...)
            ├─ Symbol  src=[45,46)  text="<"
            └─ Common  src=[46,51)  text="strin"
```

## [char 51] `"g"`

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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      ├─ TypeReferenceShape  pos=30  src=[31,39)
      │  ├─ IdentifierShape  pos=30  src=[31,36)  text="Array"
      │  └─ TypeReferenceShape  pos=37  src=[37,38)
      │     └─ IdentifierShape  pos=37  src=[37,38)  text="T"
      ├─ WrapSymbol  src=[41,42)  text=" "
      └─ TypeReferenceShape  pos=41  src=[42,...)
         ├─ IdentifierShape  pos=41  src=[42,45)  text="Map"
         └─ TypeArgumentListShape  pos=45  src=[45,...)
            ├─ Symbol  src=[45,46)  text="<"
            └─ Common  src=[46,52)  text="string"
```

## [char 52] `","`

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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      ├─ TypeReferenceShape  pos=30  src=[31,39)
      │  ├─ IdentifierShape  pos=30  src=[31,36)  text="Array"
      │  └─ TypeReferenceShape  pos=37  src=[37,38)
      │     └─ IdentifierShape  pos=37  src=[37,38)  text="T"
      ├─ WrapSymbol  src=[41,42)  text=" "
      └─ TypeReferenceShape  pos=41  src=[42,...)
         ├─ IdentifierShape  pos=41  src=[42,45)  text="Map"
         └─ TypeArgumentListShape  pos=45  src=[45,...)
            ├─ Symbol  src=[45,46)  text="<"
            ├─ Common  src=[46,52)  text="string"
            └─ Symbol  src=[52,53)  text=","
```

## [char 53] `" "`

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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      ├─ TypeReferenceShape  pos=30  src=[31,39)
      │  ├─ IdentifierShape  pos=30  src=[31,36)  text="Array"
      │  └─ TypeReferenceShape  pos=37  src=[37,38)
      │     └─ IdentifierShape  pos=37  src=[37,38)  text="T"
      ├─ WrapSymbol  src=[41,42)  text=" "
      └─ TypeReferenceShape  pos=41  src=[42,...)
         ├─ IdentifierShape  pos=41  src=[42,45)  text="Map"
         └─ TypeArgumentListShape  pos=45  src=[45,...)
            ├─ Symbol  src=[45,46)  text="<"
            ├─ Common  src=[46,52)  text="string"
            ├─ Symbol  src=[52,53)  text=","
            └─ WrapSymbol  src=[53,54)  text=" "
```

## [char 54] `"T"`

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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      ├─ TypeReferenceShape  pos=30  src=[31,39)
      │  ├─ IdentifierShape  pos=30  src=[31,36)  text="Array"
      │  └─ TypeReferenceShape  pos=37  src=[37,38)
      │     └─ IdentifierShape  pos=37  src=[37,38)  text="T"
      ├─ WrapSymbol  src=[41,42)  text=" "
      └─ TypeReferenceShape  pos=41  src=[42,...)
         ├─ IdentifierShape  pos=41  src=[42,45)  text="Map"
         └─ TypeArgumentListShape  pos=45  src=[45,...)
            ├─ Symbol  src=[45,46)  text="<"
            ├─ Common  src=[46,52)  text="string"
            ├─ Symbol  src=[52,53)  text=","
            ├─ WrapSymbol  src=[53,54)  text=" "
            └─ Common  src=[54,55)  text="T"
```

## [char 55] `">"`

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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      ├─ TypeReferenceShape  pos=30  src=[31,39)
      │  ├─ IdentifierShape  pos=30  src=[31,36)  text="Array"
      │  └─ TypeReferenceShape  pos=37  src=[37,38)
      │     └─ IdentifierShape  pos=37  src=[37,38)  text="T"
      ├─ WrapSymbol  src=[41,42)  text=" "
      └─ TypeReferenceShape  pos=41  src=[42,56)
         ├─ IdentifierShape  pos=41  src=[42,45)  text="Map"
         ├─ StringKeywordShape  pos=46  src=[46,52)  text="string"
         └─ TypeReferenceShape  pos=53  src=[54,55)
            └─ IdentifierShape  pos=53  src=[54,55)  text="T"
```

## [char 56] `"\n"`

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
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ WrapSymbol  src=[30,31)  text=" "
      ├─ TypeReferenceShape  pos=30  src=[31,39)
      │  ├─ IdentifierShape  pos=30  src=[31,36)  text="Array"
      │  └─ TypeReferenceShape  pos=37  src=[37,38)
      │     └─ IdentifierShape  pos=37  src=[37,38)  text="T"
      ├─ WrapSymbol  src=[41,42)  text=" "
      ├─ TypeReferenceShape  pos=41  src=[42,56)
      │  ├─ IdentifierShape  pos=41  src=[42,45)  text="Map"
      │  ├─ StringKeywordShape  pos=46  src=[46,52)  text="string"
      │  └─ TypeReferenceShape  pos=53  src=[54,55)
      │     └─ IdentifierShape  pos=53  src=[54,55)  text="T"
      └─ WrapSymbol  src=[56,57)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,57)
└─ TypeAliasDeclarationShape  pos=0  src=[0,56)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   └─ ConditionalTypeShape  pos=11  src=[12,56)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ StringKeywordShape  pos=21  src=[22,28)  text="string"
      ├─ TypeReferenceShape  pos=30  src=[31,39)
      │  ├─ IdentifierShape  pos=30  src=[31,36)  text="Array"
      │  └─ TypeReferenceShape  pos=37  src=[37,38)
      │     └─ IdentifierShape  pos=37  src=[37,38)  text="T"
      └─ TypeReferenceShape  pos=41  src=[42,56)
         ├─ IdentifierShape  pos=41  src=[42,45)  text="Map"
         ├─ StringKeywordShape  pos=46  src=[46,52)  text="string"
         └─ TypeReferenceShape  pos=53  src=[54,55)
            └─ IdentifierShape  pos=53  src=[54,55)  text="T"
```

# 预期 token 树（逐字）：`type A<T = string> = T[]`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24
t y p e   A < T   =   s t r i n g >   =   T [ ] ⏎
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

## [char 8] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ TypeParameterListShape  pos=6  src=[6,...)
      ├─ Symbol  src=[6,7)  text="<"
      ├─ Common  src=[7,8)  text="T"
      └─ WrapSymbol  src=[8,9)  text=" "
```

## [char 9] `"="`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ TypeParameterListShape  pos=6  src=[6,...)
      ├─ Symbol  src=[6,7)  text="<"
      ├─ Common  src=[7,8)  text="T"
      ├─ WrapSymbol  src=[8,9)  text=" "
      └─ Symbol  src=[9,10)  text="="
```

## [char 10] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ TypeParameterListShape  pos=6  src=[6,...)
      ├─ Symbol  src=[6,7)  text="<"
      ├─ Common  src=[7,8)  text="T"
      ├─ WrapSymbol  src=[8,9)  text=" "
      ├─ Symbol  src=[9,10)  text="="
      └─ WrapSymbol  src=[10,11)  text=" "
```

## [char 11] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ TypeParameterListShape  pos=6  src=[6,...)
      ├─ Symbol  src=[6,7)  text="<"
      ├─ Common  src=[7,8)  text="T"
      ├─ WrapSymbol  src=[8,9)  text=" "
      ├─ Symbol  src=[9,10)  text="="
      ├─ WrapSymbol  src=[10,11)  text=" "
      └─ Common  src=[11,12)  text="s"
```

## [char 12] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ TypeParameterListShape  pos=6  src=[6,...)
      ├─ Symbol  src=[6,7)  text="<"
      ├─ Common  src=[7,8)  text="T"
      ├─ WrapSymbol  src=[8,9)  text=" "
      ├─ Symbol  src=[9,10)  text="="
      ├─ WrapSymbol  src=[10,11)  text=" "
      └─ Common  src=[11,13)  text="st"
```

## [char 13] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ TypeParameterListShape  pos=6  src=[6,...)
      ├─ Symbol  src=[6,7)  text="<"
      ├─ Common  src=[7,8)  text="T"
      ├─ WrapSymbol  src=[8,9)  text=" "
      ├─ Symbol  src=[9,10)  text="="
      ├─ WrapSymbol  src=[10,11)  text=" "
      └─ Common  src=[11,14)  text="str"
```

## [char 14] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ TypeParameterListShape  pos=6  src=[6,...)
      ├─ Symbol  src=[6,7)  text="<"
      ├─ Common  src=[7,8)  text="T"
      ├─ WrapSymbol  src=[8,9)  text=" "
      ├─ Symbol  src=[9,10)  text="="
      ├─ WrapSymbol  src=[10,11)  text=" "
      └─ Common  src=[11,15)  text="stri"
```

## [char 15] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ TypeParameterListShape  pos=6  src=[6,...)
      ├─ Symbol  src=[6,7)  text="<"
      ├─ Common  src=[7,8)  text="T"
      ├─ WrapSymbol  src=[8,9)  text=" "
      ├─ Symbol  src=[9,10)  text="="
      ├─ WrapSymbol  src=[10,11)  text=" "
      └─ Common  src=[11,16)  text="strin"
```

## [char 16] `"g"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ TypeParameterListShape  pos=6  src=[6,...)
      ├─ Symbol  src=[6,7)  text="<"
      ├─ Common  src=[7,8)  text="T"
      ├─ WrapSymbol  src=[8,9)  text=" "
      ├─ Symbol  src=[9,10)  text="="
      ├─ WrapSymbol  src=[10,11)  text=" "
      └─ Common  src=[11,17)  text="string"
```

## [char 17] `">"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ TypeParameterShape  pos=7  src=[7,17)
      ├─ IdentifierShape  pos=7  src=[7,8)  text="T"
      └─ StringKeywordShape  pos=10  src=[11,17)  text="string"
```

## [char 18] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,17)
   │  ├─ IdentifierShape  pos=7  src=[7,8)  text="T"
   │  └─ StringKeywordShape  pos=10  src=[11,17)  text="string"
   └─ WrapSymbol  src=[18,19)  text=" "
```

## [char 19] `"="`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,17)
   │  ├─ IdentifierShape  pos=7  src=[7,8)  text="T"
   │  └─ StringKeywordShape  pos=10  src=[11,17)  text="string"
   ├─ WrapSymbol  src=[18,19)  text=" "
   └─ Symbol  src=[19,20)  text="="
```

## [char 20] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,17)
   │  ├─ IdentifierShape  pos=7  src=[7,8)  text="T"
   │  └─ StringKeywordShape  pos=10  src=[11,17)  text="string"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ Symbol  src=[19,20)  text="="
   └─ WrapSymbol  src=[20,21)  text=" "
```

## [char 21] `"T"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,17)
   │  ├─ IdentifierShape  pos=7  src=[7,8)  text="T"
   │  └─ StringKeywordShape  pos=10  src=[11,17)  text="string"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ Symbol  src=[19,20)  text="="
   ├─ WrapSymbol  src=[20,21)  text=" "
   └─ Common  src=[21,22)  text="T"
```

## [char 22] `"["`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,17)
   │  ├─ IdentifierShape  pos=7  src=[7,8)  text="T"
   │  └─ StringKeywordShape  pos=10  src=[11,17)  text="string"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ Symbol  src=[19,20)  text="="
   ├─ WrapSymbol  src=[20,21)  text=" "
   ├─ Common  src=[21,22)  text="T"
   └─ Symbol  src=[22,23)  text="["
```

## [char 23] `"]"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,17)
   │  ├─ IdentifierShape  pos=7  src=[7,8)  text="T"
   │  └─ StringKeywordShape  pos=10  src=[11,17)  text="string"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ Symbol  src=[19,20)  text="="
   ├─ WrapSymbol  src=[20,21)  text=" "
   ├─ Common  src=[21,22)  text="T"
   ├─ Symbol  src=[22,23)  text="["
   └─ Symbol  src=[23,24)  text="]"
```

## [char 24] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,17)
   │  ├─ IdentifierShape  pos=7  src=[7,8)  text="T"
   │  └─ StringKeywordShape  pos=10  src=[11,17)  text="string"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ Symbol  src=[19,20)  text="="
   ├─ WrapSymbol  src=[20,21)  text=" "
   ├─ Common  src=[21,22)  text="T"
   ├─ Symbol  src=[22,23)  text="["
   ├─ Symbol  src=[23,24)  text="]"
   └─ WrapSymbol  src=[24,25)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,25)
└─ TypeAliasDeclarationShape  pos=0  src=[0,24)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,17)
   │  ├─ IdentifierShape  pos=7  src=[7,8)  text="T"
   │  └─ StringKeywordShape  pos=10  src=[11,17)  text="string"
   └─ ArrayTypeShape  pos=20  src=[21,24)
      └─ TypeReferenceShape  pos=20  src=[21,22)
         └─ IdentifierShape  pos=20  src=[21,22)  text="T"
```

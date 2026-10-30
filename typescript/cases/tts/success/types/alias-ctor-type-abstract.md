# 预期 token 树（逐字）：`type A = abstract new () => Foo`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31
t y p e   A   =   a b s t r a c t   n e w   ( )   = >   F o o ⏎
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

## [char 9] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ Common  src=[9,10)  text="a"
```

## [char 10] `"b"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ Common  src=[9,11)  text="ab"
```

## [char 11] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ Common  src=[9,12)  text="abs"
```

## [char 12] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ Common  src=[9,13)  text="abst"
```

## [char 13] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ Common  src=[9,14)  text="abstr"
```

## [char 14] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ Common  src=[9,15)  text="abstra"
```

## [char 15] `"c"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ Common  src=[9,16)  text="abstrac"
```

## [char 16] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ Common  src=[9,17)  text="abstract"
```

## [char 17] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,17)  text="abstract"
   └─ WrapSymbol  src=[17,18)  text=" "
```

## [char 18] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,17)  text="abstract"
   ├─ WrapSymbol  src=[17,18)  text=" "
   └─ Common  src=[18,19)  text="n"
```

## [char 19] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,17)  text="abstract"
   ├─ WrapSymbol  src=[17,18)  text=" "
   └─ Common  src=[18,20)  text="ne"
```

## [char 20] `"w"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,17)  text="abstract"
   ├─ WrapSymbol  src=[17,18)  text=" "
   └─ Common  src=[18,21)  text="new"
```

## [char 21] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,17)  text="abstract"
   ├─ WrapSymbol  src=[17,18)  text=" "
   ├─ Common  src=[18,21)  text="new"
   └─ WrapSymbol  src=[21,22)  text=" "
```

## [char 22] `"("`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,17)  text="abstract"
   ├─ WrapSymbol  src=[17,18)  text=" "
   ├─ Common  src=[18,21)  text="new"
   ├─ WrapSymbol  src=[21,22)  text=" "
   └─ Symbol  src=[22,23)  text="("
```

## [char 23] `")"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,17)  text="abstract"
   ├─ WrapSymbol  src=[17,18)  text=" "
   ├─ Common  src=[18,21)  text="new"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Symbol  src=[22,23)  text="("
   └─ Symbol  src=[23,24)  text=")"
```

## [char 24] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,17)  text="abstract"
   ├─ WrapSymbol  src=[17,18)  text=" "
   ├─ Common  src=[18,21)  text="new"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Symbol  src=[22,23)  text="("
   ├─ Symbol  src=[23,24)  text=")"
   └─ WrapSymbol  src=[24,25)  text=" "
```

## [char 25] `"="`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,17)  text="abstract"
   ├─ WrapSymbol  src=[17,18)  text=" "
   ├─ Common  src=[18,21)  text="new"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Symbol  src=[22,23)  text="("
   ├─ Symbol  src=[23,24)  text=")"
   ├─ WrapSymbol  src=[24,25)  text=" "
   └─ Symbol  src=[25,26)  text="="
```

## [char 26] `">"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,17)  text="abstract"
   ├─ WrapSymbol  src=[17,18)  text=" "
   ├─ Common  src=[18,21)  text="new"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Symbol  src=[22,23)  text="("
   ├─ Symbol  src=[23,24)  text=")"
   ├─ WrapSymbol  src=[24,25)  text=" "
   └─ Symbol  src=[25,27)  text="=>"
```

## [char 27] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,17)  text="abstract"
   ├─ WrapSymbol  src=[17,18)  text=" "
   ├─ Common  src=[18,21)  text="new"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Symbol  src=[22,23)  text="("
   ├─ Symbol  src=[23,24)  text=")"
   ├─ WrapSymbol  src=[24,25)  text=" "
   ├─ Symbol  src=[25,27)  text="=>"
   └─ WrapSymbol  src=[27,28)  text=" "
```

## [char 28] `"F"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,17)  text="abstract"
   ├─ WrapSymbol  src=[17,18)  text=" "
   ├─ Common  src=[18,21)  text="new"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Symbol  src=[22,23)  text="("
   ├─ Symbol  src=[23,24)  text=")"
   ├─ WrapSymbol  src=[24,25)  text=" "
   ├─ Symbol  src=[25,27)  text="=>"
   ├─ WrapSymbol  src=[27,28)  text=" "
   └─ Common  src=[28,29)  text="F"
```

## [char 29] `"o"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,17)  text="abstract"
   ├─ WrapSymbol  src=[17,18)  text=" "
   ├─ Common  src=[18,21)  text="new"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Symbol  src=[22,23)  text="("
   ├─ Symbol  src=[23,24)  text=")"
   ├─ WrapSymbol  src=[24,25)  text=" "
   ├─ Symbol  src=[25,27)  text="=>"
   ├─ WrapSymbol  src=[27,28)  text=" "
   └─ Common  src=[28,30)  text="Fo"
```

## [char 30] `"o"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,17)  text="abstract"
   ├─ WrapSymbol  src=[17,18)  text=" "
   ├─ Common  src=[18,21)  text="new"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Symbol  src=[22,23)  text="("
   ├─ Symbol  src=[23,24)  text=")"
   ├─ WrapSymbol  src=[24,25)  text=" "
   ├─ Symbol  src=[25,27)  text="=>"
   ├─ WrapSymbol  src=[27,28)  text=" "
   └─ Common  src=[28,31)  text="Foo"
```

## [char 31] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Common  src=[9,17)  text="abstract"
   ├─ WrapSymbol  src=[17,18)  text=" "
   ├─ Common  src=[18,21)  text="new"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Symbol  src=[22,23)  text="("
   ├─ Symbol  src=[23,24)  text=")"
   ├─ WrapSymbol  src=[24,25)  text=" "
   ├─ Symbol  src=[25,27)  text="=>"
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,31)  text="Foo"
   └─ WrapSymbol  src=[31,32)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,32)
└─ TypeAliasDeclarationShape  pos=0  src=[0,31)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ ConstructorTypeShape  pos=8  src=[9,31)
      ├─ AbstractKeywordShape  pos=8  src=[9,17)  text="abstract"
      └─ TypeReferenceShape  pos=27  src=[28,31)
         └─ IdentifierShape  pos=27  src=[28,31)  text="Foo"
```

# 预期 token 树（逐字）：`type A = [string, number]`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25
t y p e   A   =   [ s t r i n g ,   n u m b e r ] ⏎
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

## [char 9] `"["`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ Symbol  src=[9,10)  text="["
```

## [char 10] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   └─ Common  src=[10,11)  text="s"
```

## [char 11] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   └─ Common  src=[10,12)  text="st"
```

## [char 12] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   └─ Common  src=[10,13)  text="str"
```

## [char 13] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   └─ Common  src=[10,14)  text="stri"
```

## [char 14] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   └─ Common  src=[10,15)  text="strin"
```

## [char 15] `"g"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   └─ Common  src=[10,16)  text="string"
```

## [char 16] `","`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,16)  text="string"
   └─ Symbol  src=[16,17)  text=","
```

## [char 17] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,16)  text="string"
   ├─ Symbol  src=[16,17)  text=","
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
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,16)  text="string"
   ├─ Symbol  src=[16,17)  text=","
   ├─ WrapSymbol  src=[17,18)  text=" "
   └─ Common  src=[18,19)  text="n"
```

## [char 19] `"u"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,16)  text="string"
   ├─ Symbol  src=[16,17)  text=","
   ├─ WrapSymbol  src=[17,18)  text=" "
   └─ Common  src=[18,20)  text="nu"
```

## [char 20] `"m"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,16)  text="string"
   ├─ Symbol  src=[16,17)  text=","
   ├─ WrapSymbol  src=[17,18)  text=" "
   └─ Common  src=[18,21)  text="num"
```

## [char 21] `"b"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,16)  text="string"
   ├─ Symbol  src=[16,17)  text=","
   ├─ WrapSymbol  src=[17,18)  text=" "
   └─ Common  src=[18,22)  text="numb"
```

## [char 22] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,16)  text="string"
   ├─ Symbol  src=[16,17)  text=","
   ├─ WrapSymbol  src=[17,18)  text=" "
   └─ Common  src=[18,23)  text="numbe"
```

## [char 23] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,16)  text="string"
   ├─ Symbol  src=[16,17)  text=","
   ├─ WrapSymbol  src=[17,18)  text=" "
   └─ Common  src=[18,24)  text="number"
```

## [char 24] `"]"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,16)  text="string"
   ├─ Symbol  src=[16,17)  text=","
   ├─ WrapSymbol  src=[17,18)  text=" "
   ├─ Common  src=[18,24)  text="number"
   └─ Symbol  src=[24,25)  text="]"
```

## [char 25] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,16)  text="string"
   ├─ Symbol  src=[16,17)  text=","
   ├─ WrapSymbol  src=[17,18)  text=" "
   ├─ Common  src=[18,24)  text="number"
   ├─ Symbol  src=[24,25)  text="]"
   └─ WrapSymbol  src=[25,26)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,26)
└─ TypeAliasDeclarationShape  pos=0  src=[0,25)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ TupleTypeShape  pos=8  src=[9,25)
      ├─ StringKeywordShape  pos=10  src=[10,16)  text="string"
      └─ NumberKeywordShape  pos=17  src=[18,24)  text="number"
```

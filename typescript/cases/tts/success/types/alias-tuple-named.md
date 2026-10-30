# 预期 token 树（逐字）：`type A = [a: string, b: number]`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31
t y p e   A   =   [ a :   s t r i n g ,   b :   n u m b e r ] ⏎
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

## [char 10] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   └─ Common  src=[10,11)  text="a"
```

## [char 11] `":"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,11)  text="a"
   └─ Symbol  src=[11,12)  text=":"
```

## [char 12] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,11)  text="a"
   ├─ Symbol  src=[11,12)  text=":"
   └─ WrapSymbol  src=[12,13)  text=" "
```

## [char 13] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,11)  text="a"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   └─ Common  src=[13,14)  text="s"
```

## [char 14] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,11)  text="a"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   └─ Common  src=[13,15)  text="st"
```

## [char 15] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,11)  text="a"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   └─ Common  src=[13,16)  text="str"
```

## [char 16] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,11)  text="a"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   └─ Common  src=[13,17)  text="stri"
```

## [char 17] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,11)  text="a"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   └─ Common  src=[13,18)  text="strin"
```

## [char 18] `"g"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,11)  text="a"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   └─ Common  src=[13,19)  text="string"
```

## [char 19] `","`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,11)  text="a"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   ├─ Common  src=[13,19)  text="string"
   └─ Symbol  src=[19,20)  text=","
```

## [char 20] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,11)  text="a"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   ├─ Common  src=[13,19)  text="string"
   ├─ Symbol  src=[19,20)  text=","
   └─ WrapSymbol  src=[20,21)  text=" "
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
   ├─ Common  src=[10,11)  text="a"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   ├─ Common  src=[13,19)  text="string"
   ├─ Symbol  src=[19,20)  text=","
   ├─ WrapSymbol  src=[20,21)  text=" "
   └─ Common  src=[21,22)  text="b"
```

## [char 22] `":"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,11)  text="a"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   ├─ Common  src=[13,19)  text="string"
   ├─ Symbol  src=[19,20)  text=","
   ├─ WrapSymbol  src=[20,21)  text=" "
   ├─ Common  src=[21,22)  text="b"
   └─ Symbol  src=[22,23)  text=":"
```

## [char 23] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,11)  text="a"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   ├─ Common  src=[13,19)  text="string"
   ├─ Symbol  src=[19,20)  text=","
   ├─ WrapSymbol  src=[20,21)  text=" "
   ├─ Common  src=[21,22)  text="b"
   ├─ Symbol  src=[22,23)  text=":"
   └─ WrapSymbol  src=[23,24)  text=" "
```

## [char 24] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,11)  text="a"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   ├─ Common  src=[13,19)  text="string"
   ├─ Symbol  src=[19,20)  text=","
   ├─ WrapSymbol  src=[20,21)  text=" "
   ├─ Common  src=[21,22)  text="b"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   └─ Common  src=[24,25)  text="n"
```

## [char 25] `"u"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,11)  text="a"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   ├─ Common  src=[13,19)  text="string"
   ├─ Symbol  src=[19,20)  text=","
   ├─ WrapSymbol  src=[20,21)  text=" "
   ├─ Common  src=[21,22)  text="b"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   └─ Common  src=[24,26)  text="nu"
```

## [char 26] `"m"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,11)  text="a"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   ├─ Common  src=[13,19)  text="string"
   ├─ Symbol  src=[19,20)  text=","
   ├─ WrapSymbol  src=[20,21)  text=" "
   ├─ Common  src=[21,22)  text="b"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   └─ Common  src=[24,27)  text="num"
```

## [char 27] `"b"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,11)  text="a"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   ├─ Common  src=[13,19)  text="string"
   ├─ Symbol  src=[19,20)  text=","
   ├─ WrapSymbol  src=[20,21)  text=" "
   ├─ Common  src=[21,22)  text="b"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   └─ Common  src=[24,28)  text="numb"
```

## [char 28] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,11)  text="a"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   ├─ Common  src=[13,19)  text="string"
   ├─ Symbol  src=[19,20)  text=","
   ├─ WrapSymbol  src=[20,21)  text=" "
   ├─ Common  src=[21,22)  text="b"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   └─ Common  src=[24,29)  text="numbe"
```

## [char 29] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,11)  text="a"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   ├─ Common  src=[13,19)  text="string"
   ├─ Symbol  src=[19,20)  text=","
   ├─ WrapSymbol  src=[20,21)  text=" "
   ├─ Common  src=[21,22)  text="b"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   └─ Common  src=[24,30)  text="number"
```

## [char 30] `"]"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,11)  text="a"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   ├─ Common  src=[13,19)  text="string"
   ├─ Symbol  src=[19,20)  text=","
   ├─ WrapSymbol  src=[20,21)  text=" "
   ├─ Common  src=[21,22)  text="b"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   └─ Symbol  src=[30,31)  text="]"
```

## [char 31] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="["
   ├─ Common  src=[10,11)  text="a"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   ├─ Common  src=[13,19)  text="string"
   ├─ Symbol  src=[19,20)  text=","
   ├─ WrapSymbol  src=[20,21)  text=" "
   ├─ Common  src=[21,22)  text="b"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   ├─ Symbol  src=[30,31)  text="]"
   └─ WrapSymbol  src=[31,32)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,32)
└─ TypeAliasDeclarationShape  pos=0  src=[0,31)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ TupleTypeShape  pos=8  src=[9,31)
      ├─ NamedTupleMemberShape  pos=10  src=[10,19)
      │  ├─ IdentifierShape  pos=10  src=[10,11)  text="a"
      │  └─ StringKeywordShape  pos=12  src=[13,19)  text="string"
      └─ NamedTupleMemberShape  pos=20  src=[21,30)
         ├─ IdentifierShape  pos=20  src=[21,22)  text="b"
         └─ NumberKeywordShape  pos=23  src=[24,30)  text="number"
```

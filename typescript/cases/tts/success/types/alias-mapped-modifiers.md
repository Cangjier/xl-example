# 预期 token 树（逐字）：`type A<T> = { +readonly [K in keyof T]+?: T[K] }`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48
t y p e   A < T >   =   {   + r e a d o n l y   [ K   i n   k e y o f   T ] + ? :   T [ K ]   } ⏎
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

## [char 12] `"{"`

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
   └─ Symbol  src=[12,13)  text="{"
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
   ├─ Symbol  src=[12,13)  text="{"
   └─ WrapSymbol  src=[13,14)  text=" "
```

## [char 14] `"+"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Symbol  src=[14,15)  text="+"
```

## [char 15] `"r"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   └─ Common  src=[15,16)  text="r"
```

## [char 16] `"e"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   └─ Common  src=[15,17)  text="re"
```

## [char 17] `"a"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   └─ Common  src=[15,18)  text="rea"
```

## [char 18] `"d"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   └─ Common  src=[15,19)  text="read"
```

## [char 19] `"o"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   └─ Common  src=[15,20)  text="reado"
```

## [char 20] `"n"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   └─ Common  src=[15,21)  text="readon"
```

## [char 21] `"l"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   └─ Common  src=[15,22)  text="readonl"
```

## [char 22] `"y"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   └─ Common  src=[15,23)  text="readonly"
```

## [char 23] `" "`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   └─ WrapSymbol  src=[23,24)  text=" "
```

## [char 24] `"["`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   ├─ WrapSymbol  src=[23,24)  text=" "
   └─ Symbol  src=[24,25)  text="["
```

## [char 25] `"K"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Symbol  src=[24,25)  text="["
   └─ Common  src=[25,26)  text="K"
```

## [char 26] `" "`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Symbol  src=[24,25)  text="["
   ├─ Common  src=[25,26)  text="K"
   └─ WrapSymbol  src=[26,27)  text=" "
```

## [char 27] `"i"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Symbol  src=[24,25)  text="["
   ├─ Common  src=[25,26)  text="K"
   ├─ WrapSymbol  src=[26,27)  text=" "
   └─ Common  src=[27,28)  text="i"
```

## [char 28] `"n"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Symbol  src=[24,25)  text="["
   ├─ Common  src=[25,26)  text="K"
   ├─ WrapSymbol  src=[26,27)  text=" "
   └─ Common  src=[27,29)  text="in"
```

## [char 29] `" "`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Symbol  src=[24,25)  text="["
   ├─ Common  src=[25,26)  text="K"
   ├─ WrapSymbol  src=[26,27)  text=" "
   ├─ Common  src=[27,29)  text="in"
   └─ WrapSymbol  src=[29,30)  text=" "
```

## [char 30] `"k"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Symbol  src=[24,25)  text="["
   ├─ Common  src=[25,26)  text="K"
   ├─ WrapSymbol  src=[26,27)  text=" "
   ├─ Common  src=[27,29)  text="in"
   ├─ WrapSymbol  src=[29,30)  text=" "
   └─ Common  src=[30,31)  text="k"
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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Symbol  src=[24,25)  text="["
   ├─ Common  src=[25,26)  text="K"
   ├─ WrapSymbol  src=[26,27)  text=" "
   ├─ Common  src=[27,29)  text="in"
   ├─ WrapSymbol  src=[29,30)  text=" "
   └─ Common  src=[30,32)  text="ke"
```

## [char 32] `"y"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Symbol  src=[24,25)  text="["
   ├─ Common  src=[25,26)  text="K"
   ├─ WrapSymbol  src=[26,27)  text=" "
   ├─ Common  src=[27,29)  text="in"
   ├─ WrapSymbol  src=[29,30)  text=" "
   └─ Common  src=[30,33)  text="key"
```

## [char 33] `"o"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Symbol  src=[24,25)  text="["
   ├─ Common  src=[25,26)  text="K"
   ├─ WrapSymbol  src=[26,27)  text=" "
   ├─ Common  src=[27,29)  text="in"
   ├─ WrapSymbol  src=[29,30)  text=" "
   └─ Common  src=[30,34)  text="keyo"
```

## [char 34] `"f"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Symbol  src=[24,25)  text="["
   ├─ Common  src=[25,26)  text="K"
   ├─ WrapSymbol  src=[26,27)  text=" "
   ├─ Common  src=[27,29)  text="in"
   ├─ WrapSymbol  src=[29,30)  text=" "
   └─ Common  src=[30,35)  text="keyof"
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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Symbol  src=[24,25)  text="["
   ├─ Common  src=[25,26)  text="K"
   ├─ WrapSymbol  src=[26,27)  text=" "
   ├─ Common  src=[27,29)  text="in"
   ├─ WrapSymbol  src=[29,30)  text=" "
   ├─ Common  src=[30,35)  text="keyof"
   └─ WrapSymbol  src=[35,36)  text=" "
```

## [char 36] `"T"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Symbol  src=[24,25)  text="["
   ├─ Common  src=[25,26)  text="K"
   ├─ WrapSymbol  src=[26,27)  text=" "
   ├─ Common  src=[27,29)  text="in"
   ├─ WrapSymbol  src=[29,30)  text=" "
   ├─ Common  src=[30,35)  text="keyof"
   ├─ WrapSymbol  src=[35,36)  text=" "
   └─ Common  src=[36,37)  text="T"
```

## [char 37] `"]"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Symbol  src=[24,25)  text="["
   ├─ Common  src=[25,26)  text="K"
   ├─ WrapSymbol  src=[26,27)  text=" "
   ├─ Common  src=[27,29)  text="in"
   ├─ WrapSymbol  src=[29,30)  text=" "
   ├─ Common  src=[30,35)  text="keyof"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,37)  text="T"
   └─ Symbol  src=[37,38)  text="]"
```

## [char 38] `"+"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Symbol  src=[24,25)  text="["
   ├─ Common  src=[25,26)  text="K"
   ├─ WrapSymbol  src=[26,27)  text=" "
   ├─ Common  src=[27,29)  text="in"
   ├─ WrapSymbol  src=[29,30)  text=" "
   ├─ Common  src=[30,35)  text="keyof"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,37)  text="T"
   ├─ Symbol  src=[37,38)  text="]"
   └─ Symbol  src=[38,39)  text="+"
```

## [char 39] `"?"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Symbol  src=[24,25)  text="["
   ├─ Common  src=[25,26)  text="K"
   ├─ WrapSymbol  src=[26,27)  text=" "
   ├─ Common  src=[27,29)  text="in"
   ├─ WrapSymbol  src=[29,30)  text=" "
   ├─ Common  src=[30,35)  text="keyof"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,37)  text="T"
   ├─ Symbol  src=[37,38)  text="]"
   ├─ Symbol  src=[38,39)  text="+"
   └─ Symbol  src=[39,40)  text="?"
```

## [char 40] `":"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Symbol  src=[24,25)  text="["
   ├─ Common  src=[25,26)  text="K"
   ├─ WrapSymbol  src=[26,27)  text=" "
   ├─ Common  src=[27,29)  text="in"
   ├─ WrapSymbol  src=[29,30)  text=" "
   ├─ Common  src=[30,35)  text="keyof"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,37)  text="T"
   ├─ Symbol  src=[37,38)  text="]"
   ├─ Symbol  src=[38,39)  text="+"
   ├─ Symbol  src=[39,40)  text="?"
   └─ Symbol  src=[40,41)  text=":"
```

## [char 41] `" "`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Symbol  src=[24,25)  text="["
   ├─ Common  src=[25,26)  text="K"
   ├─ WrapSymbol  src=[26,27)  text=" "
   ├─ Common  src=[27,29)  text="in"
   ├─ WrapSymbol  src=[29,30)  text=" "
   ├─ Common  src=[30,35)  text="keyof"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,37)  text="T"
   ├─ Symbol  src=[37,38)  text="]"
   ├─ Symbol  src=[38,39)  text="+"
   ├─ Symbol  src=[39,40)  text="?"
   ├─ Symbol  src=[40,41)  text=":"
   └─ WrapSymbol  src=[41,42)  text=" "
```

## [char 42] `"T"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Symbol  src=[24,25)  text="["
   ├─ Common  src=[25,26)  text="K"
   ├─ WrapSymbol  src=[26,27)  text=" "
   ├─ Common  src=[27,29)  text="in"
   ├─ WrapSymbol  src=[29,30)  text=" "
   ├─ Common  src=[30,35)  text="keyof"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,37)  text="T"
   ├─ Symbol  src=[37,38)  text="]"
   ├─ Symbol  src=[38,39)  text="+"
   ├─ Symbol  src=[39,40)  text="?"
   ├─ Symbol  src=[40,41)  text=":"
   ├─ WrapSymbol  src=[41,42)  text=" "
   └─ Common  src=[42,43)  text="T"
```

## [char 43] `"["`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Symbol  src=[24,25)  text="["
   ├─ Common  src=[25,26)  text="K"
   ├─ WrapSymbol  src=[26,27)  text=" "
   ├─ Common  src=[27,29)  text="in"
   ├─ WrapSymbol  src=[29,30)  text=" "
   ├─ Common  src=[30,35)  text="keyof"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,37)  text="T"
   ├─ Symbol  src=[37,38)  text="]"
   ├─ Symbol  src=[38,39)  text="+"
   ├─ Symbol  src=[39,40)  text="?"
   ├─ Symbol  src=[40,41)  text=":"
   ├─ WrapSymbol  src=[41,42)  text=" "
   ├─ Common  src=[42,43)  text="T"
   └─ Symbol  src=[43,44)  text="["
```

## [char 44] `"K"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Symbol  src=[24,25)  text="["
   ├─ Common  src=[25,26)  text="K"
   ├─ WrapSymbol  src=[26,27)  text=" "
   ├─ Common  src=[27,29)  text="in"
   ├─ WrapSymbol  src=[29,30)  text=" "
   ├─ Common  src=[30,35)  text="keyof"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,37)  text="T"
   ├─ Symbol  src=[37,38)  text="]"
   ├─ Symbol  src=[38,39)  text="+"
   ├─ Symbol  src=[39,40)  text="?"
   ├─ Symbol  src=[40,41)  text=":"
   ├─ WrapSymbol  src=[41,42)  text=" "
   ├─ Common  src=[42,43)  text="T"
   ├─ Symbol  src=[43,44)  text="["
   └─ Common  src=[44,45)  text="K"
```

## [char 45] `"]"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Symbol  src=[24,25)  text="["
   ├─ Common  src=[25,26)  text="K"
   ├─ WrapSymbol  src=[26,27)  text=" "
   ├─ Common  src=[27,29)  text="in"
   ├─ WrapSymbol  src=[29,30)  text=" "
   ├─ Common  src=[30,35)  text="keyof"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,37)  text="T"
   ├─ Symbol  src=[37,38)  text="]"
   ├─ Symbol  src=[38,39)  text="+"
   ├─ Symbol  src=[39,40)  text="?"
   ├─ Symbol  src=[40,41)  text=":"
   ├─ WrapSymbol  src=[41,42)  text=" "
   ├─ Common  src=[42,43)  text="T"
   ├─ Symbol  src=[43,44)  text="["
   ├─ Common  src=[44,45)  text="K"
   └─ Symbol  src=[45,46)  text="]"
```

## [char 46] `" "`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Symbol  src=[24,25)  text="["
   ├─ Common  src=[25,26)  text="K"
   ├─ WrapSymbol  src=[26,27)  text=" "
   ├─ Common  src=[27,29)  text="in"
   ├─ WrapSymbol  src=[29,30)  text=" "
   ├─ Common  src=[30,35)  text="keyof"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,37)  text="T"
   ├─ Symbol  src=[37,38)  text="]"
   ├─ Symbol  src=[38,39)  text="+"
   ├─ Symbol  src=[39,40)  text="?"
   ├─ Symbol  src=[40,41)  text=":"
   ├─ WrapSymbol  src=[41,42)  text=" "
   ├─ Common  src=[42,43)  text="T"
   ├─ Symbol  src=[43,44)  text="["
   ├─ Common  src=[44,45)  text="K"
   ├─ Symbol  src=[45,46)  text="]"
   └─ WrapSymbol  src=[46,47)  text=" "
```

## [char 47] `"}"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Symbol  src=[24,25)  text="["
   ├─ Common  src=[25,26)  text="K"
   ├─ WrapSymbol  src=[26,27)  text=" "
   ├─ Common  src=[27,29)  text="in"
   ├─ WrapSymbol  src=[29,30)  text=" "
   ├─ Common  src=[30,35)  text="keyof"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,37)  text="T"
   ├─ Symbol  src=[37,38)  text="]"
   ├─ Symbol  src=[38,39)  text="+"
   ├─ Symbol  src=[39,40)  text="?"
   ├─ Symbol  src=[40,41)  text=":"
   ├─ WrapSymbol  src=[41,42)  text=" "
   ├─ Common  src=[42,43)  text="T"
   ├─ Symbol  src=[43,44)  text="["
   ├─ Common  src=[44,45)  text="K"
   ├─ Symbol  src=[45,46)  text="]"
   ├─ WrapSymbol  src=[46,47)  text=" "
   └─ Symbol  src=[47,48)  text="}"
```

## [char 48] `"\n"`

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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="+"
   ├─ Common  src=[15,23)  text="readonly"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Symbol  src=[24,25)  text="["
   ├─ Common  src=[25,26)  text="K"
   ├─ WrapSymbol  src=[26,27)  text=" "
   ├─ Common  src=[27,29)  text="in"
   ├─ WrapSymbol  src=[29,30)  text=" "
   ├─ Common  src=[30,35)  text="keyof"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Common  src=[36,37)  text="T"
   ├─ Symbol  src=[37,38)  text="]"
   ├─ Symbol  src=[38,39)  text="+"
   ├─ Symbol  src=[39,40)  text="?"
   ├─ Symbol  src=[40,41)  text=":"
   ├─ WrapSymbol  src=[41,42)  text=" "
   ├─ Common  src=[42,43)  text="T"
   ├─ Symbol  src=[43,44)  text="["
   ├─ Common  src=[44,45)  text="K"
   ├─ Symbol  src=[45,46)  text="]"
   ├─ WrapSymbol  src=[46,47)  text=" "
   ├─ Symbol  src=[47,48)  text="}"
   └─ WrapSymbol  src=[48,49)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,49)
└─ TypeAliasDeclarationShape  pos=0  src=[0,48)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   └─ MappedTypeShape  pos=11  src=[12,48)
      ├─ PlusTokenShape  pos=13  src=[14,15)  op="+"
      ├─ TypeParameterShape  pos=25  src=[25,37)
      │  ├─ IdentifierShape  pos=25  src=[25,26)  text="K"
      │  └─ TypeOperatorShape  pos=29  src=[30,37)
      │     └─ TypeReferenceShape  pos=35  src=[36,37)
      │        └─ IdentifierShape  pos=35  src=[36,37)  text="T"
      ├─ PlusTokenShape  pos=38  src=[38,39)  op="+"
      └─ IndexedAccessTypeShape  pos=41  src=[42,46)
         ├─ TypeReferenceShape  pos=41  src=[42,43)
         │  └─ IdentifierShape  pos=41  src=[42,43)  text="T"
         └─ TypeReferenceShape  pos=44  src=[44,45)
            └─ IdentifierShape  pos=44  src=[44,45)  text="K"
```

# 预期 token 树（逐字）：`type A = { (a: string): number; new (a: string): Foo }`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50 51 52 53 54
t y p e   A   =   {   ( a :   s t r i n g ) :   n u m b e r ;   n e w   ( a :   s t r i n g ) :   F o o   } ⏎
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

## [char 9] `"{"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ Symbol  src=[9,10)  text="{"
```

## [char 10] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   └─ WrapSymbol  src=[10,11)  text=" "
```

## [char 11] `"("`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Symbol  src=[11,12)  text="("
```

## [char 12] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   └─ Common  src=[12,13)  text="a"
```

## [char 13] `":"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   └─ Symbol  src=[13,14)  text=":"
```

## [char 14] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   └─ WrapSymbol  src=[14,15)  text=" "
```

## [char 15] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ Common  src=[15,16)  text="s"
```

## [char 16] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ Common  src=[15,17)  text="st"
```

## [char 17] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ Common  src=[15,18)  text="str"
```

## [char 18] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ Common  src=[15,19)  text="stri"
```

## [char 19] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ Common  src=[15,20)  text="strin"
```

## [char 20] `"g"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   └─ Common  src=[15,21)  text="string"
```

## [char 21] `")"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   └─ Symbol  src=[21,22)  text=")"
```

## [char 22] `":"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
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
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
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
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
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
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
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
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
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
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
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
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
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
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   └─ Common  src=[24,30)  text="number"
```

## [char 30] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   └─ Symbol  src=[30,31)  text=";"
```

## [char 31] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   ├─ Symbol  src=[30,31)  text=";"
   └─ WrapSymbol  src=[31,32)  text=" "
```

## [char 32] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   ├─ Symbol  src=[30,31)  text=";"
   ├─ WrapSymbol  src=[31,32)  text=" "
   └─ Common  src=[32,33)  text="n"
```

## [char 33] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   ├─ Symbol  src=[30,31)  text=";"
   ├─ WrapSymbol  src=[31,32)  text=" "
   └─ Common  src=[32,34)  text="ne"
```

## [char 34] `"w"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   ├─ Symbol  src=[30,31)  text=";"
   ├─ WrapSymbol  src=[31,32)  text=" "
   └─ Common  src=[32,35)  text="new"
```

## [char 35] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   ├─ Symbol  src=[30,31)  text=";"
   ├─ WrapSymbol  src=[31,32)  text=" "
   ├─ Common  src=[32,35)  text="new"
   └─ WrapSymbol  src=[35,36)  text=" "
```

## [char 36] `"("`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   ├─ Symbol  src=[30,31)  text=";"
   ├─ WrapSymbol  src=[31,32)  text=" "
   ├─ Common  src=[32,35)  text="new"
   ├─ WrapSymbol  src=[35,36)  text=" "
   └─ Symbol  src=[36,37)  text="("
```

## [char 37] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   ├─ Symbol  src=[30,31)  text=";"
   ├─ WrapSymbol  src=[31,32)  text=" "
   ├─ Common  src=[32,35)  text="new"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Symbol  src=[36,37)  text="("
   └─ Common  src=[37,38)  text="a"
```

## [char 38] `":"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   ├─ Symbol  src=[30,31)  text=";"
   ├─ WrapSymbol  src=[31,32)  text=" "
   ├─ Common  src=[32,35)  text="new"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Symbol  src=[36,37)  text="("
   ├─ Common  src=[37,38)  text="a"
   └─ Symbol  src=[38,39)  text=":"
```

## [char 39] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   ├─ Symbol  src=[30,31)  text=";"
   ├─ WrapSymbol  src=[31,32)  text=" "
   ├─ Common  src=[32,35)  text="new"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Symbol  src=[36,37)  text="("
   ├─ Common  src=[37,38)  text="a"
   ├─ Symbol  src=[38,39)  text=":"
   └─ WrapSymbol  src=[39,40)  text=" "
```

## [char 40] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   ├─ Symbol  src=[30,31)  text=";"
   ├─ WrapSymbol  src=[31,32)  text=" "
   ├─ Common  src=[32,35)  text="new"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Symbol  src=[36,37)  text="("
   ├─ Common  src=[37,38)  text="a"
   ├─ Symbol  src=[38,39)  text=":"
   ├─ WrapSymbol  src=[39,40)  text=" "
   └─ Common  src=[40,41)  text="s"
```

## [char 41] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   ├─ Symbol  src=[30,31)  text=";"
   ├─ WrapSymbol  src=[31,32)  text=" "
   ├─ Common  src=[32,35)  text="new"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Symbol  src=[36,37)  text="("
   ├─ Common  src=[37,38)  text="a"
   ├─ Symbol  src=[38,39)  text=":"
   ├─ WrapSymbol  src=[39,40)  text=" "
   └─ Common  src=[40,42)  text="st"
```

## [char 42] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   ├─ Symbol  src=[30,31)  text=";"
   ├─ WrapSymbol  src=[31,32)  text=" "
   ├─ Common  src=[32,35)  text="new"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Symbol  src=[36,37)  text="("
   ├─ Common  src=[37,38)  text="a"
   ├─ Symbol  src=[38,39)  text=":"
   ├─ WrapSymbol  src=[39,40)  text=" "
   └─ Common  src=[40,43)  text="str"
```

## [char 43] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   ├─ Symbol  src=[30,31)  text=";"
   ├─ WrapSymbol  src=[31,32)  text=" "
   ├─ Common  src=[32,35)  text="new"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Symbol  src=[36,37)  text="("
   ├─ Common  src=[37,38)  text="a"
   ├─ Symbol  src=[38,39)  text=":"
   ├─ WrapSymbol  src=[39,40)  text=" "
   └─ Common  src=[40,44)  text="stri"
```

## [char 44] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   ├─ Symbol  src=[30,31)  text=";"
   ├─ WrapSymbol  src=[31,32)  text=" "
   ├─ Common  src=[32,35)  text="new"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Symbol  src=[36,37)  text="("
   ├─ Common  src=[37,38)  text="a"
   ├─ Symbol  src=[38,39)  text=":"
   ├─ WrapSymbol  src=[39,40)  text=" "
   └─ Common  src=[40,45)  text="strin"
```

## [char 45] `"g"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   ├─ Symbol  src=[30,31)  text=";"
   ├─ WrapSymbol  src=[31,32)  text=" "
   ├─ Common  src=[32,35)  text="new"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Symbol  src=[36,37)  text="("
   ├─ Common  src=[37,38)  text="a"
   ├─ Symbol  src=[38,39)  text=":"
   ├─ WrapSymbol  src=[39,40)  text=" "
   └─ Common  src=[40,46)  text="string"
```

## [char 46] `")"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   ├─ Symbol  src=[30,31)  text=";"
   ├─ WrapSymbol  src=[31,32)  text=" "
   ├─ Common  src=[32,35)  text="new"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Symbol  src=[36,37)  text="("
   ├─ Common  src=[37,38)  text="a"
   ├─ Symbol  src=[38,39)  text=":"
   ├─ WrapSymbol  src=[39,40)  text=" "
   ├─ Common  src=[40,46)  text="string"
   └─ Symbol  src=[46,47)  text=")"
```

## [char 47] `":"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   ├─ Symbol  src=[30,31)  text=";"
   ├─ WrapSymbol  src=[31,32)  text=" "
   ├─ Common  src=[32,35)  text="new"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Symbol  src=[36,37)  text="("
   ├─ Common  src=[37,38)  text="a"
   ├─ Symbol  src=[38,39)  text=":"
   ├─ WrapSymbol  src=[39,40)  text=" "
   ├─ Common  src=[40,46)  text="string"
   ├─ Symbol  src=[46,47)  text=")"
   └─ Symbol  src=[47,48)  text=":"
```

## [char 48] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   ├─ Symbol  src=[30,31)  text=";"
   ├─ WrapSymbol  src=[31,32)  text=" "
   ├─ Common  src=[32,35)  text="new"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Symbol  src=[36,37)  text="("
   ├─ Common  src=[37,38)  text="a"
   ├─ Symbol  src=[38,39)  text=":"
   ├─ WrapSymbol  src=[39,40)  text=" "
   ├─ Common  src=[40,46)  text="string"
   ├─ Symbol  src=[46,47)  text=")"
   ├─ Symbol  src=[47,48)  text=":"
   └─ WrapSymbol  src=[48,49)  text=" "
```

## [char 49] `"F"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   ├─ Symbol  src=[30,31)  text=";"
   ├─ WrapSymbol  src=[31,32)  text=" "
   ├─ Common  src=[32,35)  text="new"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Symbol  src=[36,37)  text="("
   ├─ Common  src=[37,38)  text="a"
   ├─ Symbol  src=[38,39)  text=":"
   ├─ WrapSymbol  src=[39,40)  text=" "
   ├─ Common  src=[40,46)  text="string"
   ├─ Symbol  src=[46,47)  text=")"
   ├─ Symbol  src=[47,48)  text=":"
   ├─ WrapSymbol  src=[48,49)  text=" "
   └─ Common  src=[49,50)  text="F"
```

## [char 50] `"o"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   ├─ Symbol  src=[30,31)  text=";"
   ├─ WrapSymbol  src=[31,32)  text=" "
   ├─ Common  src=[32,35)  text="new"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Symbol  src=[36,37)  text="("
   ├─ Common  src=[37,38)  text="a"
   ├─ Symbol  src=[38,39)  text=":"
   ├─ WrapSymbol  src=[39,40)  text=" "
   ├─ Common  src=[40,46)  text="string"
   ├─ Symbol  src=[46,47)  text=")"
   ├─ Symbol  src=[47,48)  text=":"
   ├─ WrapSymbol  src=[48,49)  text=" "
   └─ Common  src=[49,51)  text="Fo"
```

## [char 51] `"o"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   ├─ Symbol  src=[30,31)  text=";"
   ├─ WrapSymbol  src=[31,32)  text=" "
   ├─ Common  src=[32,35)  text="new"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Symbol  src=[36,37)  text="("
   ├─ Common  src=[37,38)  text="a"
   ├─ Symbol  src=[38,39)  text=":"
   ├─ WrapSymbol  src=[39,40)  text=" "
   ├─ Common  src=[40,46)  text="string"
   ├─ Symbol  src=[46,47)  text=")"
   ├─ Symbol  src=[47,48)  text=":"
   ├─ WrapSymbol  src=[48,49)  text=" "
   └─ Common  src=[49,52)  text="Foo"
```

## [char 52] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   ├─ Symbol  src=[30,31)  text=";"
   ├─ WrapSymbol  src=[31,32)  text=" "
   ├─ Common  src=[32,35)  text="new"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Symbol  src=[36,37)  text="("
   ├─ Common  src=[37,38)  text="a"
   ├─ Symbol  src=[38,39)  text=":"
   ├─ WrapSymbol  src=[39,40)  text=" "
   ├─ Common  src=[40,46)  text="string"
   ├─ Symbol  src=[46,47)  text=")"
   ├─ Symbol  src=[47,48)  text=":"
   ├─ WrapSymbol  src=[48,49)  text=" "
   ├─ Common  src=[49,52)  text="Foo"
   └─ WrapSymbol  src=[52,53)  text=" "
```

## [char 53] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   ├─ Symbol  src=[30,31)  text=";"
   ├─ WrapSymbol  src=[31,32)  text=" "
   ├─ Common  src=[32,35)  text="new"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Symbol  src=[36,37)  text="("
   ├─ Common  src=[37,38)  text="a"
   ├─ Symbol  src=[38,39)  text=":"
   ├─ WrapSymbol  src=[39,40)  text=" "
   ├─ Common  src=[40,46)  text="string"
   ├─ Symbol  src=[46,47)  text=")"
   ├─ Symbol  src=[47,48)  text=":"
   ├─ WrapSymbol  src=[48,49)  text=" "
   ├─ Common  src=[49,52)  text="Foo"
   ├─ WrapSymbol  src=[52,53)  text=" "
   └─ Symbol  src=[53,54)  text="}"
```

## [char 54] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Symbol  src=[11,12)  text="("
   ├─ Common  src=[12,13)  text="a"
   ├─ Symbol  src=[13,14)  text=":"
   ├─ WrapSymbol  src=[14,15)  text=" "
   ├─ Common  src=[15,21)  text="string"
   ├─ Symbol  src=[21,22)  text=")"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="number"
   ├─ Symbol  src=[30,31)  text=";"
   ├─ WrapSymbol  src=[31,32)  text=" "
   ├─ Common  src=[32,35)  text="new"
   ├─ WrapSymbol  src=[35,36)  text=" "
   ├─ Symbol  src=[36,37)  text="("
   ├─ Common  src=[37,38)  text="a"
   ├─ Symbol  src=[38,39)  text=":"
   ├─ WrapSymbol  src=[39,40)  text=" "
   ├─ Common  src=[40,46)  text="string"
   ├─ Symbol  src=[46,47)  text=")"
   ├─ Symbol  src=[47,48)  text=":"
   ├─ WrapSymbol  src=[48,49)  text=" "
   ├─ Common  src=[49,52)  text="Foo"
   ├─ WrapSymbol  src=[52,53)  text=" "
   ├─ Symbol  src=[53,54)  text="}"
   └─ WrapSymbol  src=[54,55)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,55)
└─ TypeAliasDeclarationShape  pos=0  src=[0,54)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ TypeLiteralShape  pos=8  src=[9,54)
      ├─ CallSignatureShape  pos=10  src=[11,31)
      │  ├─ ParameterShape  pos=12  src=[12,21)
      │  │  ├─ IdentifierShape  pos=12  src=[12,13)  text="a"
      │  │  └─ StringKeywordShape  pos=14  src=[15,21)  text="string"
      │  └─ NumberKeywordShape  pos=23  src=[24,30)  text="number"
      └─ ConstructSignatureShape  pos=31  src=[32,52)
         ├─ ParameterShape  pos=37  src=[37,46)
         │  ├─ IdentifierShape  pos=37  src=[37,38)  text="a"
         │  └─ StringKeywordShape  pos=39  src=[40,46)  text="string"
         └─ TypeReferenceShape  pos=48  src=[49,52)
            └─ IdentifierShape  pos=48  src=[49,52)  text="Foo"
```

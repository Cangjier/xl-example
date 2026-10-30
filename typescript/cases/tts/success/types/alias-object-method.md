# 预期 token 树（逐字）：`type A = { m(a: string): void }`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31
t y p e   A   =   {   m ( a :   s t r i n g ) :   v o i d   } ⏎
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

## [char 11] `"m"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,12)  text="m"
```

## [char 12] `"("`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="m"
   └─ Symbol  src=[12,13)  text="("
```

## [char 13] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="m"
   ├─ Symbol  src=[12,13)  text="("
   └─ Common  src=[13,14)  text="a"
```

## [char 14] `":"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="m"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   └─ Symbol  src=[14,15)  text=":"
```

## [char 15] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="m"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   └─ WrapSymbol  src=[15,16)  text=" "
```

## [char 16] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="m"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   ├─ WrapSymbol  src=[15,16)  text=" "
   └─ Common  src=[16,17)  text="s"
```

## [char 17] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="m"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   ├─ WrapSymbol  src=[15,16)  text=" "
   └─ Common  src=[16,18)  text="st"
```

## [char 18] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="m"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   ├─ WrapSymbol  src=[15,16)  text=" "
   └─ Common  src=[16,19)  text="str"
```

## [char 19] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="m"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   ├─ WrapSymbol  src=[15,16)  text=" "
   └─ Common  src=[16,20)  text="stri"
```

## [char 20] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="m"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   ├─ WrapSymbol  src=[15,16)  text=" "
   └─ Common  src=[16,21)  text="strin"
```

## [char 21] `"g"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="m"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   ├─ WrapSymbol  src=[15,16)  text=" "
   └─ Common  src=[16,22)  text="string"
```

## [char 22] `")"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="m"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ Common  src=[16,22)  text="string"
   └─ Symbol  src=[22,23)  text=")"
```

## [char 23] `":"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="m"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ Common  src=[16,22)  text="string"
   ├─ Symbol  src=[22,23)  text=")"
   └─ Symbol  src=[23,24)  text=":"
```

## [char 24] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="m"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ Common  src=[16,22)  text="string"
   ├─ Symbol  src=[22,23)  text=")"
   ├─ Symbol  src=[23,24)  text=":"
   └─ WrapSymbol  src=[24,25)  text=" "
```

## [char 25] `"v"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="m"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ Common  src=[16,22)  text="string"
   ├─ Symbol  src=[22,23)  text=")"
   ├─ Symbol  src=[23,24)  text=":"
   ├─ WrapSymbol  src=[24,25)  text=" "
   └─ Common  src=[25,26)  text="v"
```

## [char 26] `"o"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="m"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ Common  src=[16,22)  text="string"
   ├─ Symbol  src=[22,23)  text=")"
   ├─ Symbol  src=[23,24)  text=":"
   ├─ WrapSymbol  src=[24,25)  text=" "
   └─ Common  src=[25,27)  text="vo"
```

## [char 27] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="m"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ Common  src=[16,22)  text="string"
   ├─ Symbol  src=[22,23)  text=")"
   ├─ Symbol  src=[23,24)  text=":"
   ├─ WrapSymbol  src=[24,25)  text=" "
   └─ Common  src=[25,28)  text="voi"
```

## [char 28] `"d"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="m"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ Common  src=[16,22)  text="string"
   ├─ Symbol  src=[22,23)  text=")"
   ├─ Symbol  src=[23,24)  text=":"
   ├─ WrapSymbol  src=[24,25)  text=" "
   └─ Common  src=[25,29)  text="void"
```

## [char 29] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="m"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ Common  src=[16,22)  text="string"
   ├─ Symbol  src=[22,23)  text=")"
   ├─ Symbol  src=[23,24)  text=":"
   ├─ WrapSymbol  src=[24,25)  text=" "
   ├─ Common  src=[25,29)  text="void"
   └─ WrapSymbol  src=[29,30)  text=" "
```

## [char 30] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="m"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ Common  src=[16,22)  text="string"
   ├─ Symbol  src=[22,23)  text=")"
   ├─ Symbol  src=[23,24)  text=":"
   ├─ WrapSymbol  src=[24,25)  text=" "
   ├─ Common  src=[25,29)  text="void"
   ├─ WrapSymbol  src=[29,30)  text=" "
   └─ Symbol  src=[30,31)  text="}"
```

## [char 31] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="m"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ Common  src=[16,22)  text="string"
   ├─ Symbol  src=[22,23)  text=")"
   ├─ Symbol  src=[23,24)  text=":"
   ├─ WrapSymbol  src=[24,25)  text=" "
   ├─ Common  src=[25,29)  text="void"
   ├─ WrapSymbol  src=[29,30)  text=" "
   ├─ Symbol  src=[30,31)  text="}"
   └─ WrapSymbol  src=[31,32)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,32)
└─ TypeAliasDeclarationShape  pos=0  src=[0,31)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ TypeLiteralShape  pos=8  src=[9,31)
      └─ MethodSignatureShape  pos=10  src=[11,29)
         ├─ IdentifierShape  pos=10  src=[11,12)  text="m"
         ├─ ParameterShape  pos=13  src=[13,22)
         │  ├─ IdentifierShape  pos=13  src=[13,14)  text="a"
         │  └─ StringKeywordShape  pos=15  src=[16,22)  text="string"
         └─ VoidKeywordShape  pos=24  src=[25,29)  text="void"
```

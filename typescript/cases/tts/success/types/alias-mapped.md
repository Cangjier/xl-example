# 预期 token 树（逐字）：`type A<T> = { [K in keyof T]: T[K] }`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36
t y p e   A < T >   =   {   [ K   i n   k e y o f   T ] :   T [ K ]   } ⏎
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

## [char 12] `"{"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
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
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Symbol  src=[12,13)  text="{"
   └─ WrapSymbol  src=[13,14)  text=" "
```

## [char 14] `"["`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Symbol  src=[14,15)  text="["
```

## [char 15] `"K"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="["
   └─ Common  src=[15,16)  text="K"
```

## [char 16] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="["
   ├─ Common  src=[15,16)  text="K"
   └─ WrapSymbol  src=[16,17)  text=" "
```

## [char 17] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="["
   ├─ Common  src=[15,16)  text="K"
   ├─ WrapSymbol  src=[16,17)  text=" "
   └─ Common  src=[17,18)  text="i"
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
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="["
   ├─ Common  src=[15,16)  text="K"
   ├─ WrapSymbol  src=[16,17)  text=" "
   └─ Common  src=[17,19)  text="in"
```

## [char 19] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="["
   ├─ Common  src=[15,16)  text="K"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,19)  text="in"
   └─ WrapSymbol  src=[19,20)  text=" "
```

## [char 20] `"k"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="["
   ├─ Common  src=[15,16)  text="K"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,19)  text="in"
   ├─ WrapSymbol  src=[19,20)  text=" "
   └─ Common  src=[20,21)  text="k"
```

## [char 21] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="["
   ├─ Common  src=[15,16)  text="K"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,19)  text="in"
   ├─ WrapSymbol  src=[19,20)  text=" "
   └─ Common  src=[20,22)  text="ke"
```

## [char 22] `"y"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="["
   ├─ Common  src=[15,16)  text="K"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,19)  text="in"
   ├─ WrapSymbol  src=[19,20)  text=" "
   └─ Common  src=[20,23)  text="key"
```

## [char 23] `"o"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="["
   ├─ Common  src=[15,16)  text="K"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,19)  text="in"
   ├─ WrapSymbol  src=[19,20)  text=" "
   └─ Common  src=[20,24)  text="keyo"
```

## [char 24] `"f"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="["
   ├─ Common  src=[15,16)  text="K"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,19)  text="in"
   ├─ WrapSymbol  src=[19,20)  text=" "
   └─ Common  src=[20,25)  text="keyof"
```

## [char 25] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="["
   ├─ Common  src=[15,16)  text="K"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,19)  text="in"
   ├─ WrapSymbol  src=[19,20)  text=" "
   ├─ Common  src=[20,25)  text="keyof"
   └─ WrapSymbol  src=[25,26)  text=" "
```

## [char 26] `"T"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="["
   ├─ Common  src=[15,16)  text="K"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,19)  text="in"
   ├─ WrapSymbol  src=[19,20)  text=" "
   ├─ Common  src=[20,25)  text="keyof"
   ├─ WrapSymbol  src=[25,26)  text=" "
   └─ Common  src=[26,27)  text="T"
```

## [char 27] `"]"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="["
   ├─ Common  src=[15,16)  text="K"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,19)  text="in"
   ├─ WrapSymbol  src=[19,20)  text=" "
   ├─ Common  src=[20,25)  text="keyof"
   ├─ WrapSymbol  src=[25,26)  text=" "
   ├─ Common  src=[26,27)  text="T"
   └─ Symbol  src=[27,28)  text="]"
```

## [char 28] `":"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="["
   ├─ Common  src=[15,16)  text="K"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,19)  text="in"
   ├─ WrapSymbol  src=[19,20)  text=" "
   ├─ Common  src=[20,25)  text="keyof"
   ├─ WrapSymbol  src=[25,26)  text=" "
   ├─ Common  src=[26,27)  text="T"
   ├─ Symbol  src=[27,28)  text="]"
   └─ Symbol  src=[28,29)  text=":"
```

## [char 29] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="["
   ├─ Common  src=[15,16)  text="K"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,19)  text="in"
   ├─ WrapSymbol  src=[19,20)  text=" "
   ├─ Common  src=[20,25)  text="keyof"
   ├─ WrapSymbol  src=[25,26)  text=" "
   ├─ Common  src=[26,27)  text="T"
   ├─ Symbol  src=[27,28)  text="]"
   ├─ Symbol  src=[28,29)  text=":"
   └─ WrapSymbol  src=[29,30)  text=" "
```

## [char 30] `"T"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="["
   ├─ Common  src=[15,16)  text="K"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,19)  text="in"
   ├─ WrapSymbol  src=[19,20)  text=" "
   ├─ Common  src=[20,25)  text="keyof"
   ├─ WrapSymbol  src=[25,26)  text=" "
   ├─ Common  src=[26,27)  text="T"
   ├─ Symbol  src=[27,28)  text="]"
   ├─ Symbol  src=[28,29)  text=":"
   ├─ WrapSymbol  src=[29,30)  text=" "
   └─ Common  src=[30,31)  text="T"
```

## [char 31] `"["`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="["
   ├─ Common  src=[15,16)  text="K"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,19)  text="in"
   ├─ WrapSymbol  src=[19,20)  text=" "
   ├─ Common  src=[20,25)  text="keyof"
   ├─ WrapSymbol  src=[25,26)  text=" "
   ├─ Common  src=[26,27)  text="T"
   ├─ Symbol  src=[27,28)  text="]"
   ├─ Symbol  src=[28,29)  text=":"
   ├─ WrapSymbol  src=[29,30)  text=" "
   ├─ Common  src=[30,31)  text="T"
   └─ Symbol  src=[31,32)  text="["
```

## [char 32] `"K"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="["
   ├─ Common  src=[15,16)  text="K"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,19)  text="in"
   ├─ WrapSymbol  src=[19,20)  text=" "
   ├─ Common  src=[20,25)  text="keyof"
   ├─ WrapSymbol  src=[25,26)  text=" "
   ├─ Common  src=[26,27)  text="T"
   ├─ Symbol  src=[27,28)  text="]"
   ├─ Symbol  src=[28,29)  text=":"
   ├─ WrapSymbol  src=[29,30)  text=" "
   ├─ Common  src=[30,31)  text="T"
   ├─ Symbol  src=[31,32)  text="["
   └─ Common  src=[32,33)  text="K"
```

## [char 33] `"]"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="["
   ├─ Common  src=[15,16)  text="K"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,19)  text="in"
   ├─ WrapSymbol  src=[19,20)  text=" "
   ├─ Common  src=[20,25)  text="keyof"
   ├─ WrapSymbol  src=[25,26)  text=" "
   ├─ Common  src=[26,27)  text="T"
   ├─ Symbol  src=[27,28)  text="]"
   ├─ Symbol  src=[28,29)  text=":"
   ├─ WrapSymbol  src=[29,30)  text=" "
   ├─ Common  src=[30,31)  text="T"
   ├─ Symbol  src=[31,32)  text="["
   ├─ Common  src=[32,33)  text="K"
   └─ Symbol  src=[33,34)  text="]"
```

## [char 34] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="["
   ├─ Common  src=[15,16)  text="K"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,19)  text="in"
   ├─ WrapSymbol  src=[19,20)  text=" "
   ├─ Common  src=[20,25)  text="keyof"
   ├─ WrapSymbol  src=[25,26)  text=" "
   ├─ Common  src=[26,27)  text="T"
   ├─ Symbol  src=[27,28)  text="]"
   ├─ Symbol  src=[28,29)  text=":"
   ├─ WrapSymbol  src=[29,30)  text=" "
   ├─ Common  src=[30,31)  text="T"
   ├─ Symbol  src=[31,32)  text="["
   ├─ Common  src=[32,33)  text="K"
   ├─ Symbol  src=[33,34)  text="]"
   └─ WrapSymbol  src=[34,35)  text=" "
```

## [char 35] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="["
   ├─ Common  src=[15,16)  text="K"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,19)  text="in"
   ├─ WrapSymbol  src=[19,20)  text=" "
   ├─ Common  src=[20,25)  text="keyof"
   ├─ WrapSymbol  src=[25,26)  text=" "
   ├─ Common  src=[26,27)  text="T"
   ├─ Symbol  src=[27,28)  text="]"
   ├─ Symbol  src=[28,29)  text=":"
   ├─ WrapSymbol  src=[29,30)  text=" "
   ├─ Common  src=[30,31)  text="T"
   ├─ Symbol  src=[31,32)  text="["
   ├─ Common  src=[32,33)  text="K"
   ├─ Symbol  src=[33,34)  text="]"
   ├─ WrapSymbol  src=[34,35)  text=" "
   └─ Symbol  src=[35,36)  text="}"
```

## [char 36] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Symbol  src=[12,13)  text="{"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Symbol  src=[14,15)  text="["
   ├─ Common  src=[15,16)  text="K"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,19)  text="in"
   ├─ WrapSymbol  src=[19,20)  text=" "
   ├─ Common  src=[20,25)  text="keyof"
   ├─ WrapSymbol  src=[25,26)  text=" "
   ├─ Common  src=[26,27)  text="T"
   ├─ Symbol  src=[27,28)  text="]"
   ├─ Symbol  src=[28,29)  text=":"
   ├─ WrapSymbol  src=[29,30)  text=" "
   ├─ Common  src=[30,31)  text="T"
   ├─ Symbol  src=[31,32)  text="["
   ├─ Common  src=[32,33)  text="K"
   ├─ Symbol  src=[33,34)  text="]"
   ├─ WrapSymbol  src=[34,35)  text=" "
   ├─ Symbol  src=[35,36)  text="}"
   └─ WrapSymbol  src=[36,37)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,37)
└─ TypeAliasDeclarationShape  pos=0  src=[0,36)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   └─ MappedTypeShape  pos=11  src=[12,36)
      ├─ TypeParameterShape  pos=15  src=[15,27)
      │  ├─ IdentifierShape  pos=15  src=[15,16)  text="K"
      │  └─ TypeOperatorShape  pos=19  src=[20,27)
      │     └─ TypeReferenceShape  pos=25  src=[26,27)
      │        └─ IdentifierShape  pos=25  src=[26,27)  text="T"
      └─ IndexedAccessTypeShape  pos=29  src=[30,34)
         ├─ TypeReferenceShape  pos=29  src=[30,31)
         │  └─ IdentifierShape  pos=29  src=[30,31)  text="T"
         └─ TypeReferenceShape  pos=32  src=[32,33)
            └─ IdentifierShape  pos=32  src=[32,33)  text="K"
```

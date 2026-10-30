# 预期 token 树（逐字）：`type A<T> = { [K in keyof T as `get${K}`]: T[K] }`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49
t y p e   A < T >   =   {   [ K   i n   k e y o f   T   a s   ` g e t $ { K } ` ] :   T [ K ]   } ⏎
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

## [char 27] `" "`

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
   └─ WrapSymbol  src=[27,28)  text=" "
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
   ├─ WrapSymbol  src=[27,28)  text=" "
   └─ Common  src=[28,29)  text="a"
```

## [char 29] `"s"`

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
   ├─ WrapSymbol  src=[27,28)  text=" "
   └─ Common  src=[28,30)  text="as"
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
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,30)  text="as"
   └─ WrapSymbol  src=[30,31)  text=" "
```

## [char 31] `"`"`

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
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,30)  text="as"
   ├─ WrapSymbol  src=[30,31)  text=" "
   └─ String  src=[31,...)
```

## [char 32] `"g"`

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
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,30)  text="as"
   ├─ WrapSymbol  src=[30,31)  text=" "
   └─ String  src=[31,...)
      └─ ConstString  src=[32,33)  text="g"
```

## [char 33] `"e"`

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
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,30)  text="as"
   ├─ WrapSymbol  src=[30,31)  text=" "
   └─ String  src=[31,...)
      └─ ConstString  src=[32,34)  text="ge"
```

## [char 34] `"t"`

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
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,30)  text="as"
   ├─ WrapSymbol  src=[30,31)  text=" "
   └─ String  src=[31,...)
      └─ ConstString  src=[32,35)  text="get"
```

## [char 35] `"$"`

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
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,30)  text="as"
   ├─ WrapSymbol  src=[30,31)  text=" "
   └─ String  src=[31,...)
      └─ ConstString  src=[32,35)  text="get"
```

## [char 36] `"{"`

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
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,30)  text="as"
   ├─ WrapSymbol  src=[30,31)  text=" "
   └─ String  src=[31,...)
      ├─ ConstString  src=[32,35)  text="get"
      └─ InterpolationString  src=[36,...)
```

## [char 37] `"K"`

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
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,30)  text="as"
   ├─ WrapSymbol  src=[30,31)  text=" "
   └─ String  src=[31,...)
      ├─ ConstString  src=[32,35)  text="get"
      └─ InterpolationString  src=[36,...)
         └─ Common  src=[37,38)  text="K"
```

## [char 38] `"}"`

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
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,30)  text="as"
   ├─ WrapSymbol  src=[30,31)  text=" "
   └─ String  src=[31,...)
      ├─ ConstString  src=[32,35)  text="get"
      └─ InterpolationString  src=[36,39)
         └─ Common  src=[37,38)  text="K"
```

## [char 39] `"`"`

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
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,30)  text="as"
   ├─ WrapSymbol  src=[30,31)  text=" "
   └─ String  src=[31,40)
      ├─ ConstString  src=[32,35)  text="get"
      └─ InterpolationString  src=[36,39)
         └─ Common  src=[37,38)  text="K"
```

## [char 40] `"]"`

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
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,30)  text="as"
   ├─ WrapSymbol  src=[30,31)  text=" "
   ├─ String  src=[31,40)
   │  ├─ ConstString  src=[32,35)  text="get"
   │  └─ InterpolationString  src=[36,39)
   │     └─ Common  src=[37,38)  text="K"
   └─ Symbol  src=[40,41)  text="]"
```

## [char 41] `":"`

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
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,30)  text="as"
   ├─ WrapSymbol  src=[30,31)  text=" "
   ├─ String  src=[31,40)
   │  ├─ ConstString  src=[32,35)  text="get"
   │  └─ InterpolationString  src=[36,39)
   │     └─ Common  src=[37,38)  text="K"
   ├─ Symbol  src=[40,41)  text="]"
   └─ Symbol  src=[41,42)  text=":"
```

## [char 42] `" "`

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
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,30)  text="as"
   ├─ WrapSymbol  src=[30,31)  text=" "
   ├─ String  src=[31,40)
   │  ├─ ConstString  src=[32,35)  text="get"
   │  └─ InterpolationString  src=[36,39)
   │     └─ Common  src=[37,38)  text="K"
   ├─ Symbol  src=[40,41)  text="]"
   ├─ Symbol  src=[41,42)  text=":"
   └─ WrapSymbol  src=[42,43)  text=" "
```

## [char 43] `"T"`

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
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,30)  text="as"
   ├─ WrapSymbol  src=[30,31)  text=" "
   ├─ String  src=[31,40)
   │  ├─ ConstString  src=[32,35)  text="get"
   │  └─ InterpolationString  src=[36,39)
   │     └─ Common  src=[37,38)  text="K"
   ├─ Symbol  src=[40,41)  text="]"
   ├─ Symbol  src=[41,42)  text=":"
   ├─ WrapSymbol  src=[42,43)  text=" "
   └─ Common  src=[43,44)  text="T"
```

## [char 44] `"["`

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
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,30)  text="as"
   ├─ WrapSymbol  src=[30,31)  text=" "
   ├─ String  src=[31,40)
   │  ├─ ConstString  src=[32,35)  text="get"
   │  └─ InterpolationString  src=[36,39)
   │     └─ Common  src=[37,38)  text="K"
   ├─ Symbol  src=[40,41)  text="]"
   ├─ Symbol  src=[41,42)  text=":"
   ├─ WrapSymbol  src=[42,43)  text=" "
   ├─ Common  src=[43,44)  text="T"
   └─ Symbol  src=[44,45)  text="["
```

## [char 45] `"K"`

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
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,30)  text="as"
   ├─ WrapSymbol  src=[30,31)  text=" "
   ├─ String  src=[31,40)
   │  ├─ ConstString  src=[32,35)  text="get"
   │  └─ InterpolationString  src=[36,39)
   │     └─ Common  src=[37,38)  text="K"
   ├─ Symbol  src=[40,41)  text="]"
   ├─ Symbol  src=[41,42)  text=":"
   ├─ WrapSymbol  src=[42,43)  text=" "
   ├─ Common  src=[43,44)  text="T"
   ├─ Symbol  src=[44,45)  text="["
   └─ Common  src=[45,46)  text="K"
```

## [char 46] `"]"`

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
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,30)  text="as"
   ├─ WrapSymbol  src=[30,31)  text=" "
   ├─ String  src=[31,40)
   │  ├─ ConstString  src=[32,35)  text="get"
   │  └─ InterpolationString  src=[36,39)
   │     └─ Common  src=[37,38)  text="K"
   ├─ Symbol  src=[40,41)  text="]"
   ├─ Symbol  src=[41,42)  text=":"
   ├─ WrapSymbol  src=[42,43)  text=" "
   ├─ Common  src=[43,44)  text="T"
   ├─ Symbol  src=[44,45)  text="["
   ├─ Common  src=[45,46)  text="K"
   └─ Symbol  src=[46,47)  text="]"
```

## [char 47] `" "`

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
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,30)  text="as"
   ├─ WrapSymbol  src=[30,31)  text=" "
   ├─ String  src=[31,40)
   │  ├─ ConstString  src=[32,35)  text="get"
   │  └─ InterpolationString  src=[36,39)
   │     └─ Common  src=[37,38)  text="K"
   ├─ Symbol  src=[40,41)  text="]"
   ├─ Symbol  src=[41,42)  text=":"
   ├─ WrapSymbol  src=[42,43)  text=" "
   ├─ Common  src=[43,44)  text="T"
   ├─ Symbol  src=[44,45)  text="["
   ├─ Common  src=[45,46)  text="K"
   ├─ Symbol  src=[46,47)  text="]"
   └─ WrapSymbol  src=[47,48)  text=" "
```

## [char 48] `"}"`

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
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,30)  text="as"
   ├─ WrapSymbol  src=[30,31)  text=" "
   ├─ String  src=[31,40)
   │  ├─ ConstString  src=[32,35)  text="get"
   │  └─ InterpolationString  src=[36,39)
   │     └─ Common  src=[37,38)  text="K"
   ├─ Symbol  src=[40,41)  text="]"
   ├─ Symbol  src=[41,42)  text=":"
   ├─ WrapSymbol  src=[42,43)  text=" "
   ├─ Common  src=[43,44)  text="T"
   ├─ Symbol  src=[44,45)  text="["
   ├─ Common  src=[45,46)  text="K"
   ├─ Symbol  src=[46,47)  text="]"
   ├─ WrapSymbol  src=[47,48)  text=" "
   └─ Symbol  src=[48,49)  text="}"
```

## [char 49] `"\n"`

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
   ├─ WrapSymbol  src=[27,28)  text=" "
   ├─ Common  src=[28,30)  text="as"
   ├─ WrapSymbol  src=[30,31)  text=" "
   ├─ String  src=[31,40)
   │  ├─ ConstString  src=[32,35)  text="get"
   │  └─ InterpolationString  src=[36,39)
   │     └─ Common  src=[37,38)  text="K"
   ├─ Symbol  src=[40,41)  text="]"
   ├─ Symbol  src=[41,42)  text=":"
   ├─ WrapSymbol  src=[42,43)  text=" "
   ├─ Common  src=[43,44)  text="T"
   ├─ Symbol  src=[44,45)  text="["
   ├─ Common  src=[45,46)  text="K"
   ├─ Symbol  src=[46,47)  text="]"
   ├─ WrapSymbol  src=[47,48)  text=" "
   ├─ Symbol  src=[48,49)  text="}"
   └─ WrapSymbol  src=[49,50)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,50)
└─ TypeAliasDeclarationShape  pos=0  src=[0,49)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   └─ MappedTypeShape  pos=11  src=[12,49)
      ├─ TypeParameterShape  pos=15  src=[15,27)
      │  ├─ IdentifierShape  pos=15  src=[15,16)  text="K"
      │  └─ TypeOperatorShape  pos=19  src=[20,27)
      │     └─ TypeReferenceShape  pos=25  src=[26,27)
      │        └─ IdentifierShape  pos=25  src=[26,27)  text="T"
      ├─ TemplateLiteralTypeShape  pos=30  src=[31,40)
      │  ├─ TemplateHeadShape  pos=30  src=[31,37)
      │  └─ TemplateLiteralTypeSpanShape  pos=37  src=[37,40)
      │     ├─ TypeReferenceShape  pos=37  src=[37,38)
      │     │  └─ IdentifierShape  pos=37  src=[37,38)  text="K"
      │     └─ TemplateTailShape  pos=38  src=[38,40)
      └─ IndexedAccessTypeShape  pos=42  src=[43,47)
         ├─ TypeReferenceShape  pos=42  src=[43,44)
         │  └─ IdentifierShape  pos=42  src=[43,44)  text="T"
         └─ TypeReferenceShape  pos=45  src=[45,46)
            └─ IdentifierShape  pos=45  src=[45,46)  text="K"
```

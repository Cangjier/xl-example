# 预期 token 树（逐字）：`type A = { next: A | null }`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27
t y p e   A   =   {   n e x t :   A   |   n u l l   } ⏎
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

## [char 11] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,12)  text="n"
```

## [char 12] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,13)  text="ne"
```

## [char 13] `"x"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,14)  text="nex"
```

## [char 14] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,15)  text="next"
```

## [char 15] `":"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,15)  text="next"
   └─ Symbol  src=[15,16)  text=":"
```

## [char 16] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,15)  text="next"
   ├─ Symbol  src=[15,16)  text=":"
   └─ WrapSymbol  src=[16,17)  text=" "
```

## [char 17] `"A"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,15)  text="next"
   ├─ Symbol  src=[15,16)  text=":"
   ├─ WrapSymbol  src=[16,17)  text=" "
   └─ Common  src=[17,18)  text="A"
```

## [char 18] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,15)  text="next"
   ├─ Symbol  src=[15,16)  text=":"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,18)  text="A"
   └─ WrapSymbol  src=[18,19)  text=" "
```

## [char 19] `"|"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,15)  text="next"
   ├─ Symbol  src=[15,16)  text=":"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,18)  text="A"
   ├─ WrapSymbol  src=[18,19)  text=" "
   └─ Symbol  src=[19,20)  text="|"
```

## [char 20] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,15)  text="next"
   ├─ Symbol  src=[15,16)  text=":"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,18)  text="A"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ Symbol  src=[19,20)  text="|"
   └─ WrapSymbol  src=[20,21)  text=" "
```

## [char 21] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,15)  text="next"
   ├─ Symbol  src=[15,16)  text=":"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,18)  text="A"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ Symbol  src=[19,20)  text="|"
   ├─ WrapSymbol  src=[20,21)  text=" "
   └─ Common  src=[21,22)  text="n"
```

## [char 22] `"u"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,15)  text="next"
   ├─ Symbol  src=[15,16)  text=":"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,18)  text="A"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ Symbol  src=[19,20)  text="|"
   ├─ WrapSymbol  src=[20,21)  text=" "
   └─ Common  src=[21,23)  text="nu"
```

## [char 23] `"l"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,15)  text="next"
   ├─ Symbol  src=[15,16)  text=":"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,18)  text="A"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ Symbol  src=[19,20)  text="|"
   ├─ WrapSymbol  src=[20,21)  text=" "
   └─ Common  src=[21,24)  text="nul"
```

## [char 24] `"l"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,15)  text="next"
   ├─ Symbol  src=[15,16)  text=":"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,18)  text="A"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ Symbol  src=[19,20)  text="|"
   ├─ WrapSymbol  src=[20,21)  text=" "
   └─ Common  src=[21,25)  text="null"
```

## [char 25] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,15)  text="next"
   ├─ Symbol  src=[15,16)  text=":"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,18)  text="A"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ Symbol  src=[19,20)  text="|"
   ├─ WrapSymbol  src=[20,21)  text=" "
   ├─ Common  src=[21,25)  text="null"
   └─ WrapSymbol  src=[25,26)  text=" "
```

## [char 26] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,15)  text="next"
   ├─ Symbol  src=[15,16)  text=":"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,18)  text="A"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ Symbol  src=[19,20)  text="|"
   ├─ WrapSymbol  src=[20,21)  text=" "
   ├─ Common  src=[21,25)  text="null"
   ├─ WrapSymbol  src=[25,26)  text=" "
   └─ Symbol  src=[26,27)  text="}"
```

## [char 27] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,15)  text="next"
   ├─ Symbol  src=[15,16)  text=":"
   ├─ WrapSymbol  src=[16,17)  text=" "
   ├─ Common  src=[17,18)  text="A"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ Symbol  src=[19,20)  text="|"
   ├─ WrapSymbol  src=[20,21)  text=" "
   ├─ Common  src=[21,25)  text="null"
   ├─ WrapSymbol  src=[25,26)  text=" "
   ├─ Symbol  src=[26,27)  text="}"
   └─ WrapSymbol  src=[27,28)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,28)
└─ TypeAliasDeclarationShape  pos=0  src=[0,27)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ TypeLiteralShape  pos=8  src=[9,27)
      └─ PropertySignatureShape  pos=10  src=[11,25)
         ├─ IdentifierShape  pos=10  src=[11,15)  text="next"
         └─ UnionTypeShape  pos=16  src=[17,25)
            ├─ TypeReferenceShape  pos=16  src=[17,18)
            │  └─ IdentifierShape  pos=16  src=[17,18)  text="A"
            └─ LiteralTypeShape  pos=20  src=[21,25)
               └─ NullKeywordShape  pos=20  src=[21,25)  text="null"
```

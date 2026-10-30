# 预期 token 树（逐字）：`type A = { readonly a?: string }`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32
t y p e   A   =   {   r e a d o n l y   a ? :   s t r i n g   } ⏎
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

## [char 11] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,12)  text="r"
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
   └─ Common  src=[11,13)  text="re"
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
   └─ Common  src=[11,14)  text="rea"
```

## [char 14] `"d"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,15)  text="read"
```

## [char 15] `"o"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,16)  text="reado"
```

## [char 16] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,17)  text="readon"
```

## [char 17] `"l"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,18)  text="readonl"
```

## [char 18] `"y"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,19)  text="readonly"
```

## [char 19] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,19)  text="readonly"
   └─ WrapSymbol  src=[19,20)  text=" "
```

## [char 20] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,19)  text="readonly"
   ├─ WrapSymbol  src=[19,20)  text=" "
   └─ Common  src=[20,21)  text="a"
```

## [char 21] `"?"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,19)  text="readonly"
   ├─ WrapSymbol  src=[19,20)  text=" "
   ├─ Common  src=[20,21)  text="a"
   └─ Symbol  src=[21,22)  text="?"
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
   ├─ Common  src=[11,19)  text="readonly"
   ├─ WrapSymbol  src=[19,20)  text=" "
   ├─ Common  src=[20,21)  text="a"
   ├─ Symbol  src=[21,22)  text="?"
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
   ├─ Common  src=[11,19)  text="readonly"
   ├─ WrapSymbol  src=[19,20)  text=" "
   ├─ Common  src=[20,21)  text="a"
   ├─ Symbol  src=[21,22)  text="?"
   ├─ Symbol  src=[22,23)  text=":"
   └─ WrapSymbol  src=[23,24)  text=" "
```

## [char 24] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,19)  text="readonly"
   ├─ WrapSymbol  src=[19,20)  text=" "
   ├─ Common  src=[20,21)  text="a"
   ├─ Symbol  src=[21,22)  text="?"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   └─ Common  src=[24,25)  text="s"
```

## [char 25] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,19)  text="readonly"
   ├─ WrapSymbol  src=[19,20)  text=" "
   ├─ Common  src=[20,21)  text="a"
   ├─ Symbol  src=[21,22)  text="?"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   └─ Common  src=[24,26)  text="st"
```

## [char 26] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,19)  text="readonly"
   ├─ WrapSymbol  src=[19,20)  text=" "
   ├─ Common  src=[20,21)  text="a"
   ├─ Symbol  src=[21,22)  text="?"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   └─ Common  src=[24,27)  text="str"
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
   ├─ Common  src=[11,19)  text="readonly"
   ├─ WrapSymbol  src=[19,20)  text=" "
   ├─ Common  src=[20,21)  text="a"
   ├─ Symbol  src=[21,22)  text="?"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   └─ Common  src=[24,28)  text="stri"
```

## [char 28] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,19)  text="readonly"
   ├─ WrapSymbol  src=[19,20)  text=" "
   ├─ Common  src=[20,21)  text="a"
   ├─ Symbol  src=[21,22)  text="?"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   └─ Common  src=[24,29)  text="strin"
```

## [char 29] `"g"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,19)  text="readonly"
   ├─ WrapSymbol  src=[19,20)  text=" "
   ├─ Common  src=[20,21)  text="a"
   ├─ Symbol  src=[21,22)  text="?"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   └─ Common  src=[24,30)  text="string"
```

## [char 30] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,19)  text="readonly"
   ├─ WrapSymbol  src=[19,20)  text=" "
   ├─ Common  src=[20,21)  text="a"
   ├─ Symbol  src=[21,22)  text="?"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="string"
   └─ WrapSymbol  src=[30,31)  text=" "
```

## [char 31] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,19)  text="readonly"
   ├─ WrapSymbol  src=[19,20)  text=" "
   ├─ Common  src=[20,21)  text="a"
   ├─ Symbol  src=[21,22)  text="?"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="string"
   ├─ WrapSymbol  src=[30,31)  text=" "
   └─ Symbol  src=[31,32)  text="}"
```

## [char 32] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,19)  text="readonly"
   ├─ WrapSymbol  src=[19,20)  text=" "
   ├─ Common  src=[20,21)  text="a"
   ├─ Symbol  src=[21,22)  text="?"
   ├─ Symbol  src=[22,23)  text=":"
   ├─ WrapSymbol  src=[23,24)  text=" "
   ├─ Common  src=[24,30)  text="string"
   ├─ WrapSymbol  src=[30,31)  text=" "
   ├─ Symbol  src=[31,32)  text="}"
   └─ WrapSymbol  src=[32,33)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,33)
└─ TypeAliasDeclarationShape  pos=0  src=[0,32)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ TypeLiteralShape  pos=8  src=[9,32)
      └─ PropertySignatureShape  pos=10  src=[11,30)
         ├─ ReadonlyKeywordShape  pos=10  src=[11,19)  text="readonly"
         ├─ IdentifierShape  pos=19  src=[20,21)  text="a"
         ├─ QuestionTokenShape  pos=21  src=[21,22)  text="?"  op="?"
         └─ StringKeywordShape  pos=23  src=[24,30)  text="string"
```

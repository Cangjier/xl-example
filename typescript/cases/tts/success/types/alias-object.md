# 预期 token 树（逐字）：`type A = { a: string }`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22
t y p e   A   =   {   a :   s t r i n g   } ⏎
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

## [char 11] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,12)  text="a"
```

## [char 12] `":"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="a"
   └─ Symbol  src=[12,13)  text=":"
```

## [char 13] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="a"
   ├─ Symbol  src=[12,13)  text=":"
   └─ WrapSymbol  src=[13,14)  text=" "
```

## [char 14] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="a"
   ├─ Symbol  src=[12,13)  text=":"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Common  src=[14,15)  text="s"
```

## [char 15] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="a"
   ├─ Symbol  src=[12,13)  text=":"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Common  src=[14,16)  text="st"
```

## [char 16] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="a"
   ├─ Symbol  src=[12,13)  text=":"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Common  src=[14,17)  text="str"
```

## [char 17] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="a"
   ├─ Symbol  src=[12,13)  text=":"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Common  src=[14,18)  text="stri"
```

## [char 18] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="a"
   ├─ Symbol  src=[12,13)  text=":"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Common  src=[14,19)  text="strin"
```

## [char 19] `"g"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="a"
   ├─ Symbol  src=[12,13)  text=":"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Common  src=[14,20)  text="string"
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
   ├─ Common  src=[11,12)  text="a"
   ├─ Symbol  src=[12,13)  text=":"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,20)  text="string"
   └─ WrapSymbol  src=[20,21)  text=" "
```

## [char 21] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="a"
   ├─ Symbol  src=[12,13)  text=":"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,20)  text="string"
   ├─ WrapSymbol  src=[20,21)  text=" "
   └─ Symbol  src=[21,22)  text="}"
```

## [char 22] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="{"
   ├─ WrapSymbol  src=[10,11)  text=" "
   ├─ Common  src=[11,12)  text="a"
   ├─ Symbol  src=[12,13)  text=":"
   ├─ WrapSymbol  src=[13,14)  text=" "
   ├─ Common  src=[14,20)  text="string"
   ├─ WrapSymbol  src=[20,21)  text=" "
   ├─ Symbol  src=[21,22)  text="}"
   └─ WrapSymbol  src=[22,23)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,23)
└─ TypeAliasDeclarationShape  pos=0  src=[0,22)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ TypeLiteralShape  pos=8  src=[9,22)
      └─ PropertySignatureShape  pos=10  src=[11,20)
         ├─ IdentifierShape  pos=10  src=[11,12)  text="a"
         └─ StringKeywordShape  pos=13  src=[14,20)  text="string"
```

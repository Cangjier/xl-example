# 预期 token 树（逐字）：`type A = <T>(a: T) => T`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23
t y p e   A   =   < T > ( a :   T )   = >   T ⏎
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

## [char 9] `"<"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ Symbol  src=[9,10)  text="<"
```

## [char 10] `"T"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="<"
   └─ Common  src=[10,11)  text="T"
```

## [char 11] `">"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="<"
   ├─ Common  src=[10,11)  text="T"
   └─ Symbol  src=[11,12)  text=">"
```

## [char 12] `"("`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="<"
   ├─ Common  src=[10,11)  text="T"
   ├─ Symbol  src=[11,12)  text=">"
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
   ├─ Symbol  src=[9,10)  text="<"
   ├─ Common  src=[10,11)  text="T"
   ├─ Symbol  src=[11,12)  text=">"
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
   ├─ Symbol  src=[9,10)  text="<"
   ├─ Common  src=[10,11)  text="T"
   ├─ Symbol  src=[11,12)  text=">"
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
   ├─ Symbol  src=[9,10)  text="<"
   ├─ Common  src=[10,11)  text="T"
   ├─ Symbol  src=[11,12)  text=">"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   └─ WrapSymbol  src=[15,16)  text=" "
```

## [char 16] `"T"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="<"
   ├─ Common  src=[10,11)  text="T"
   ├─ Symbol  src=[11,12)  text=">"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   ├─ WrapSymbol  src=[15,16)  text=" "
   └─ Common  src=[16,17)  text="T"
```

## [char 17] `")"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="<"
   ├─ Common  src=[10,11)  text="T"
   ├─ Symbol  src=[11,12)  text=">"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ Common  src=[16,17)  text="T"
   └─ Symbol  src=[17,18)  text=")"
```

## [char 18] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="<"
   ├─ Common  src=[10,11)  text="T"
   ├─ Symbol  src=[11,12)  text=">"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ Common  src=[16,17)  text="T"
   ├─ Symbol  src=[17,18)  text=")"
   └─ WrapSymbol  src=[18,19)  text=" "
```

## [char 19] `"="`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="<"
   ├─ Common  src=[10,11)  text="T"
   ├─ Symbol  src=[11,12)  text=">"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ Common  src=[16,17)  text="T"
   ├─ Symbol  src=[17,18)  text=")"
   ├─ WrapSymbol  src=[18,19)  text=" "
   └─ Symbol  src=[19,20)  text="="
```

## [char 20] `">"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="<"
   ├─ Common  src=[10,11)  text="T"
   ├─ Symbol  src=[11,12)  text=">"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ Common  src=[16,17)  text="T"
   ├─ Symbol  src=[17,18)  text=")"
   ├─ WrapSymbol  src=[18,19)  text=" "
   └─ Symbol  src=[19,21)  text="=>"
```

## [char 21] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="<"
   ├─ Common  src=[10,11)  text="T"
   ├─ Symbol  src=[11,12)  text=">"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ Common  src=[16,17)  text="T"
   ├─ Symbol  src=[17,18)  text=")"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ Symbol  src=[19,21)  text="=>"
   └─ WrapSymbol  src=[21,22)  text=" "
```

## [char 22] `"T"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="<"
   ├─ Common  src=[10,11)  text="T"
   ├─ Symbol  src=[11,12)  text=">"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ Common  src=[16,17)  text="T"
   ├─ Symbol  src=[17,18)  text=")"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ Symbol  src=[19,21)  text="=>"
   ├─ WrapSymbol  src=[21,22)  text=" "
   └─ Common  src=[22,23)  text="T"
```

## [char 23] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="<"
   ├─ Common  src=[10,11)  text="T"
   ├─ Symbol  src=[11,12)  text=">"
   ├─ Symbol  src=[12,13)  text="("
   ├─ Common  src=[13,14)  text="a"
   ├─ Symbol  src=[14,15)  text=":"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ Common  src=[16,17)  text="T"
   ├─ Symbol  src=[17,18)  text=")"
   ├─ WrapSymbol  src=[18,19)  text=" "
   ├─ Symbol  src=[19,21)  text="=>"
   ├─ WrapSymbol  src=[21,22)  text=" "
   ├─ Common  src=[22,23)  text="T"
   └─ WrapSymbol  src=[23,24)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,24)
└─ TypeAliasDeclarationShape  pos=0  src=[0,23)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ FunctionTypeShape  pos=8  src=[9,23)
      ├─ TypeParameterShape  pos=10  src=[10,11)
      │  └─ IdentifierShape  pos=10  src=[10,11)  text="T"
      ├─ ParameterShape  pos=13  src=[13,17)
      │  ├─ IdentifierShape  pos=13  src=[13,14)  text="a"
      │  └─ TypeReferenceShape  pos=15  src=[16,17)
      │     └─ IdentifierShape  pos=15  src=[16,17)  text="T"
      └─ TypeReferenceShape  pos=21  src=[22,23)
         └─ IdentifierShape  pos=21  src=[22,23)  text="T"
```

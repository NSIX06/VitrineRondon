# Certificado do banco (Aiven)

Coloque aqui o certificado da autoridade (CA) do seu serviço MySQL no Aiven, com o
nome `aiven-ca.pem`. Ele é baixado no painel do Aiven, na página do serviço, em
**Connection information → CA certificate → Download**.

O arquivo é público (serve só para conferir que o servidor é mesmo o do Aiven, sem
nenhuma senha dentro), então pode ir para o git. É ele que permite a conexão com
`sslaccept=strict`: o Prisma recusa qualquer servidor que não apresente um
certificado assinado por essa CA.

O caminho na `DATABASE_URL` é relativo à pasta `prisma/`:

```
...?sslcert=certificados/aiven-ca.pem&sslaccept=strict
```

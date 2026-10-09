# Certificado do banco (Aiven ou Clever Cloud)

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

## Clever Cloud

O Clever Cloud não oferece a CA para download. Com o `backend/.env.nuvem` preenchido, rode
`npm run nuvem:certificado` (ou `node scripts/certificado-banco.js HOST PORTA`): o script lê a
cadeia que o servidor apresenta, salva a CA como `nuvem-ca.pem` e avisa se o nome do certificado
confere com o endereço do banco, que o Prisma também exige com `sslaccept=strict`.

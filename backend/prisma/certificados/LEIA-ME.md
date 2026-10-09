# Certificados do banco

O banco de produção (TiDB Cloud Starter) **não precisa de arquivo aqui**: o certificado dele é de
uma autoridade pública (Let's Encrypt), e a URL só com `?sslaccept=strict` já faz o Prisma conferir
a autoridade e o nome do servidor.

Esta pasta fica para um provedor que use CA própria. Nesse caso, salve aqui o certificado da CA
(é público, sem senha dentro, e pode ir para o git) e aponte na URL, com o caminho relativo à pasta
`prisma/`:

```
...?sslcert=certificados/NOME-ca.pem&sslaccept=strict
```

Se o provedor não oferecer o arquivo para baixar, `node scripts/certificado-banco.js HOST PORTA`
lê a cadeia que o servidor apresenta, salva a CA aqui e avisa se o nome do certificado confere com
o endereço do banco (o Prisma também exige isso com `sslaccept=strict`).

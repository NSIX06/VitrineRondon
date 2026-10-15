// Abertura da primeira visita: na mesma sessão, a próxima visita já começa sem
// ela. Fica num arquivo do próprio site (e não inline no index.html) porque a
// política de conteúdo (CSP) só deixa rodar script de 'self'.
try {
  if (sessionStorage.getItem('vitrine-abertura') === '1') document.documentElement.classList.add('sem-abertura')
} catch (e) {
  // sem armazenamento: a abertura aparece normalmente
}

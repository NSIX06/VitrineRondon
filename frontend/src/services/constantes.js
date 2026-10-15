// Constantes compartilhadas entre páginas e componentes

/** Categorias de negócio aceitas na vitrine. A mesma lista é validada no servidor. */
export const CATEGORIAS = ['Artesanato', 'Alimentação', 'Serviços', 'Moda', 'Beleza']

/**
 * Foco automático só com mouse: no celular, focar um campo ao abrir a tela
 * sobe o teclado na hora e faz o iPhone dar zoom, sem a pessoa ter tocado
 * em nada. Lido uma vez, ao carregar.
 */
export const FOCAR_AO_ABRIR =
  typeof window !== 'undefined' && Boolean(window.matchMedia?.('(pointer: fine)').matches)

// Enquadramento das fotos: "x% y%" (o ponto que fica à vista no corte), com x
// e y de 0 a 100, e um zoom opcional de 1 a 3 com uma casa ("50% 30% 1.4").
// O valor vai direto para o CSS, então nada além desse formato passa.
import { z } from 'zod';

export const FORMATO_FOCO = /^(100|\d{1,2})% (100|\d{1,2})%( ([12](\.\d)?|3(\.0)?))?$/;

export const campoFoco = z.string().trim().regex(FORMATO_FOCO, 'Enquadramento inválido');

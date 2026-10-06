// Middleware de validação do corpo da requisição com Zod
export function validateBody(schema) {
  return (req, res, next) => {
    try {
      // parse lança ZodError em caso de falha; o errorHandler cuida da resposta
      req.body = schema.parse(req.body);
      next();
    } catch (erro) {
      next(erro);
    }
  };
}

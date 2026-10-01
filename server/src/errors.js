/** Erro com status HTTP; a mensagem é exibida ao cliente como { error }. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

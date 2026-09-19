type stateError = 400 | 401 | 403 | 404 | 409

export class AppError extends Error {
    readonly statusCode: stateError

    constructor(statusCode: stateError, message: string) {
        super(message)
        this.name = 'AppError'
        this.statusCode = statusCode
    }
}
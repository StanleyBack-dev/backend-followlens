import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";

interface ErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

// Normalizes every error into `{ statusCode, code, message, details }` so the
// BFF can map failures without knowing Nest's internal error shapes, and makes
// sure unexpected errors never leak stack traces or driver messages.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);

    // Known business errors (e.g. 503 "not configured") log one line; only
    // unexpected failures get a stack trace.
    if (!(exception instanceof HttpException)) {
      const reason =
        exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`${body.code}: ${reason}`);
    } else if (body.statusCode >= 500) {
      this.logger.warn(`${body.code}: ${body.message}`);
    }

    response.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ErrorBody {
    if (!(exception instanceof HttpException)) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: "INTERNAL_UNEXPECTED",
        message: "Erro interno inesperado.",
      };
    }

    const statusCode = exception.getStatus();
    const payload = exception.getResponse();

    if (typeof payload === "object" && payload !== null && "code" in payload) {
      const { code, message, details } = payload as Record<string, unknown>;
      return {
        statusCode,
        code: String(code),
        message: String(message),
        details,
      };
    }

    // Nest built-ins (ValidationPipe, unknown route, ...)
    const raw =
      typeof payload === "object" && payload !== null
        ? (payload as Record<string, unknown>).message
        : payload;
    const isValidation = statusCode === HttpStatus.BAD_REQUEST;

    return {
      statusCode,
      code: isValidation ? "VALIDATION_FAILED" : `HTTP_${statusCode}`,
      message: Array.isArray(raw)
        ? "Dados inválidos."
        : String(raw ?? exception.message),
      details: Array.isArray(raw) ? raw : undefined,
    };
  }
}

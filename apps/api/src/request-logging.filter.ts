import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

type RequestWithId = Request & { requestId?: string };

@Catch()
export class RequestLoggingFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpError');

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithId>();
    const response = context.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const requestId = request.requestId ?? 'unknown';
    const path = request.path || request.url.split('?')[0];

    this.logger.error(`${request.method} ${path} status=${status} requestId=${requestId}`);

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        response.status(status).json({ statusCode: status, message: body, requestId });
        return;
      }
      const safeBody = body && typeof body === 'object' ? body : { message: 'Request failed' };
      response.status(status).json({ ...(safeBody as Record<string, unknown>), requestId });
      return;
    }

    response.status(500).json({ statusCode: 500, message: 'Internal server error', requestId });
  }
}

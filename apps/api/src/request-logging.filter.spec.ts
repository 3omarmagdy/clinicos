import { BadRequestException } from '@nestjs/common';
import { RequestLoggingFilter } from './request-logging.filter';

describe('RequestLoggingFilter', () => {
  const hostFor = (exception: unknown) => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status };
    const request = { method: 'GET', path: '/api/v1/users/me', url: '/api/v1/users/me?debug=true', requestId: 'req-test-123' };
    const host = { switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }) };
    return { filter: new RequestLoggingFilter(), host: host as never, json, status, exception };
  };

  it('returns request id with a known HTTP error', () => {
    const { filter, host, status, json } = hostFor(new BadRequestException('Invalid input'));
    filter.catch(new BadRequestException('Invalid input'), host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, message: 'Invalid input', requestId: 'req-test-123' }));
  });

  it('hides unknown exception details', () => {
    const { filter, host, status, json } = hostFor(new Error('secret database details'));
    filter.catch(new Error('secret database details'), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ statusCode: 500, message: 'Internal server error', requestId: 'req-test-123' });
  });
});

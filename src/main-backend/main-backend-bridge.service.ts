import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import * as https from 'https';
import { Request } from 'express';

function getMainBackendUrl(): string {
  return (process.env.MAIN_BACKEND_URL || 'http://localhost:5040').replace(/\/+$/, '');
}

function getOriginForMainBackend(): string {
  return process.env.IFRAME_MAIN_ORIGIN || process.env.MAIN_APP_ORIGIN || 'http://localhost:5050';
}

/**
 * Server-to-server calls to the main (ADIB) API using the browser Cookie header
 * forwarded from the reporting frontend request.
 */
@Injectable()
export class MainBackendBridgeService {
  private readonly logger = new Logger(MainBackendBridgeService.name);

  private axiosConfig(incomingReq: Request): AxiosRequestConfig {
    const cookie = incomingReq.headers['cookie'] as string | undefined;
    const config: AxiosRequestConfig = {
      headers: {
        Origin: getOriginForMainBackend(),
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      validateStatus: () => true,
      timeout: 15_000,
    };

    const mainUrl = getMainBackendUrl();
    const allowSelfSigned =
      process.env.NODE_ENV === 'development' || process.env.ALLOW_SELF_SIGNED_CERTS === 'true';
    if (allowSelfSigned && mainUrl.startsWith('https://') && https?.Agent) {
      config.httpsAgent = new https.Agent({ rejectUnauthorized: false });
    }

    return config;
  }

  async forwardGet(path: string, queryString: string, incomingReq: Request): Promise<{ status: number; data: unknown }> {
    const base = getMainBackendUrl();
    const url = `${base}${path.startsWith('/') ? path : `/${path}`}${queryString ? `?${queryString}` : ''}`;
    try {
      const res = await axios.get(url, this.axiosConfig(incomingReq));
      return { status: res.status, data: res.data };
    } catch (err) {
      this.logger.warn(`Main backend GET failed: ${(err as Error)?.message ?? err}`);
      return { status: 502, data: { success: false } };
    }
  }
}

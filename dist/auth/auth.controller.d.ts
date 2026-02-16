import { Response } from 'express';
import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    private readonly logger;
    constructor(authService: AuthService);
    createEntryToken(body: {
        iet?: string;
        module_id?: string;
        redirect_uri?: string;
    }, origin: string, referer: string, res: Response): Promise<void>;
    getProfile(req: any): Promise<{
        id: any;
        email: any;
        name: any;
        role: any;
    }>;
    validateToken(body: {
        token: string;
    }): Promise<any>;
    logoutGet(origin: string, referer: string, res: Response): Promise<void>;
    logoutPost(origin: string, referer: string, res: Response): Promise<void>;
    private clearReportingCookies;
}

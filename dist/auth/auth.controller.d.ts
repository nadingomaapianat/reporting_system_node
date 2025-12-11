export declare class AuthController {
    getProfile(req: any): Promise<{
        id: any;
        email: any;
        name: any;
        role: any;
    }>;
    validateToken(body: {
        token: string;
    }): Promise<any>;
    logout(req: any): Promise<any>;
}

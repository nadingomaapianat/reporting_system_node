import { AuthService } from './auth.service';
import { Response } from 'express';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(loginDto: {
        email: string;
        password: string;
    }, res: Response): Promise<{
        user: {
            id: string;
            email: string;
            name: string;
            role: string;
        };
        token: string;
        expiresIn: string;
    }>;
    register(registerDto: {
        email: string;
        password: string;
        name: string;
    }): Promise<{
        user: {
            id: string;
            email: string;
            name: string;
            role: string;
        };
        token: string;
        expiresIn: string;
        message: string;
    }>;
    getProfile(): Promise<{
        id: string;
        email: string;
        name: string;
        role: string;
    }>;
    logout(res: Response): Promise<{
        message: string;
    }>;
}

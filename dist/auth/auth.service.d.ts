export declare class AuthService {
    login(email: string, password: string): Promise<{
        user: {
            id: string;
            email: string;
            name: string;
            role: string;
        };
        token: string;
        expiresIn: string;
    }>;
    register(email: string, password: string, name: string): Promise<{
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
    validateUser(email: string, password: string): Promise<{
        id: string;
        email: string;
        name: string;
        role: string;
    }>;
}

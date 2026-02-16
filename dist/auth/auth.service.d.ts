import { JwtService } from '@nestjs/jwt';
export declare class AuthService {
    private readonly jwtService;
    constructor(jwtService: JwtService);
    createTokenFromIet(iet: string, moduleId: string, _origin: string): Promise<{
        token: string;
        expiresIn: number;
        userId: string;
    } | null>;
}

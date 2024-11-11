declare module 'jsonwebtoken' {
    interface DecodedToken {
        user: {
            id: string;
            username: string;
            role: string;
        };
        iat: number;
        exp: number;
    }

    export interface SignOptions {
        expiresIn?: string | number;
        notBefore?: string | number;
        audience?: string | string[];
        subject?: string;
        issuer?: string;
        jwtid?: string;
        noTimestamp?: boolean;
        header?: Record<string, unknown>;
        keyid?: string;
    }

    export interface VerifyOptions {
        algorithms?: string[];
        audience?: string | RegExp | Array<string | RegExp>;
        complete?: boolean;
        issuer?: string | string[];
        jwtid?: string;
        ignoreExpiration?: boolean;
        ignoreNotBefore?: boolean;
        subject?: string;
        clockTolerance?: number;
        maxAge?: string | number;
        clockTimestamp?: number;
        nonce?: string;
    }

    export interface DecodeOptions {
        complete?: boolean;
        json?: boolean;
    }

    export interface VerifyCallback {
        (err: Error | null, decoded: DecodedToken | undefined): void;
    }

    export function sign(
        payload: string | Buffer | Record<string, unknown>,
        secretOrPrivateKey: string | Buffer,
        options?: SignOptions
    ): string;

    export function verify(
        token: string,
        secretOrPublicKey: string | Buffer,
        options?: VerifyOptions
    ): DecodedToken;

    export function decode(
        token: string,
        options?: DecodeOptions
    ): null | DecodedToken;
}

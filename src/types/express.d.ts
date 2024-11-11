declare namespace Express {
    interface User {
        id: string;
        username: string;
        role: string;
    }

    export interface Request {
        user?: User;
    }
}

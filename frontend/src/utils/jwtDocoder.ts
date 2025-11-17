import type { Role } from "@/interfaces/user";

interface token_payload {
    user_id: string;
    email: string;
    role: Role;
    exp: number; // timestamp de expiración
    iat: number; // timestamp de emisión
}


export const decodeJWT = (token: string): token_payload | null => {
    try {
        const payloadBase64 = token.split('.')[1];
        const payloadJson = atob(payloadBase64);
        const payload: token_payload = JSON.parse(payloadJson);
        return payload;
    } catch (error) {
        console.error("Error decoding JWT:", error);
        return null;
    }
}
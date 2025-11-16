type resource = 'AUTH_URL' | 'WS_URL';

const envMap: Record<resource, string> = {
    AUTH_URL: 'VITE_API_URL_AUTH',
    WS_URL: 'VITE_API_URL_WS',
};

export function loadEnv(resource: resource): string {
    const envVar = envMap[resource];
    const value = import.meta.env[envVar];
    if (!value) {
        throw new Error(`Environment variable ${envVar} is not set`);
    }
    return value;
}
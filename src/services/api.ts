export const API_BASE_URL = 'https://shadow-system-1086471329115.asia-southeast1.run.app/shadow-system';

interface RequestOptions extends RequestInit {
    useMultipart?: boolean;
}

export async function apiRequest<T = any>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<T> {
    const token = localStorage.getItem('token');
    
    const headers: Record<string, string> = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (!options.useMultipart) {
        headers['Content-Type'] = 'application/json';
    }

    // Clean up options
    const { useMultipart, ...restOptions } = options;
    const finalHeaders = {
        ...headers,
        ...restOptions.headers,
    };

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
        ...restOptions,
        headers: finalHeaders,
    });

    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }

    if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
            const errorObj = JSON.parse(errorText);
            if (errorObj.message) {
                errorMessage = errorObj.message;
            }
        } catch {
            if (errorText) errorMessage = errorText;
        }
        throw new Error(errorMessage);
    }

    return response.json();
}

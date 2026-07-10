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

export const DEFAULT_AVATAR = "https://lh3.googleusercontent.com/aida-public/AB6AXuDEKLlUzRvvpISR-0lZQmXWsGgz22UXc-gHzCFcQtKfGVHo7IGdf3rvsPV3VG5nrVWtkOfLglpFzBu1Nf-ZsYOutA_vy8m2hVcZ33uhYgVLcXWyD0He0f3hKqVX1pT7DwiEOzTaEFWPx01LHY5M_Nzo6qvarZbEz5KOpggoekfDdEhJ9Zpx5MlGXwZOjA8gHpjdhbNSnJ-82ZtsJa7e7hIST_UKMXTfrMHEH_0FdgiCaLKPUFpvDsYNkbmZ8l43HezLZwDRYlV_PJw";

export function getAvatarUrl(avatarPath?: string): string {
    if (!avatarPath) return DEFAULT_AVATAR;
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://') || avatarPath.startsWith('data:')) {
        return avatarPath;
    }
    const path = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;
    return `${API_BASE_URL}${path}`;
}


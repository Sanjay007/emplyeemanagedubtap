import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options?: RequestInit
): Promise<any> {
  console.log("API Request:", url, options);
  const res = await fetch(url, {
    method: options?.method || 'GET',
    headers: options?.body ? { "Content-Type": "application/json", ...options?.headers } : options?.headers || {},
    body: options?.body,
    credentials: "include",
    ...options
  });

  if (!res.ok) {
    console.error("API Error:", url, res.status, res.statusText);
    const text = await res.text();
    console.error("Error Details:", text);
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
  
  const data = await res.json();
  console.log("API Response:", url, data);
  return data;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

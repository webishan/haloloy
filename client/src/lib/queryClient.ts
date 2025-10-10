import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  method: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Check for all possible token types (prioritize customerToken for customer routes)
  const globalToken = localStorage.getItem('globalAdminToken');
  const localToken = localStorage.getItem('localAdminToken');
  const merchantToken = localStorage.getItem('merchantToken');
  const userToken = localStorage.getItem('token');
  const adminToken = localStorage.getItem('adminToken');
  const customerToken = localStorage.getItem('customerToken');
  
  // Prioritize customerToken for customer API routes
  const token = customerToken || globalToken || localToken || merchantToken || userToken || adminToken;
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Check for all possible token types (prioritize customerToken for customer routes)
    const globalToken = localStorage.getItem('globalAdminToken');
    const localToken = localStorage.getItem('localAdminToken');
    const merchantToken = localStorage.getItem('merchantToken');
    const userToken = localStorage.getItem('token');
    const adminToken = localStorage.getItem('adminToken');
    const customerToken = localStorage.getItem('customerToken');
    
    // Prioritize customerToken for customer API routes
    const token = customerToken || globalToken || localToken || merchantToken || userToken || adminToken;
    const headers: Record<string, string> = {};
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey.join("/") as string, {
      headers,
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
      refetchOnWindowFocus: true, // Enable refetch on window focus for analytics updates
      staleTime: 30000, // Data becomes stale after 30 seconds instead of never
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

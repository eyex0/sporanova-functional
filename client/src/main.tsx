import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { trpc } from "./lib/trpc";
import "./index.css";

const queryClient = new QueryClient();
function redirectUnauthorized(error: unknown) {
  if (error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED" && window.location.pathname !== "/login") window.location.assign("/login");
}
queryClient.getQueryCache().subscribe(event => { if (event.type === "updated" && event.action.type === "error") redirectUnauthorized(event.query.state.error); });
queryClient.getMutationCache().subscribe(event => { if (event.type === "updated" && event.action.type === "error") redirectUnauthorized(event.mutation.state.error); });
const trpcClient = trpc.createClient({ links: [httpBatchLink({ url: import.meta.env.VITE_API_URL || "/api/trpc", transformer: superjson, fetch: (input, init) => fetch(input, { ...(init ?? {}), credentials: "include" }) })] });
createRoot(document.getElementById("root")!).render(<trpc.Provider client={trpcClient} queryClient={queryClient}><QueryClientProvider client={queryClient}><App /></QueryClientProvider></trpc.Provider>);

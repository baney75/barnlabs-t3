import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000,
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query: unknown) => {
          const q = query as { state?: { status?: string } };
          return (
            defaultShouldDehydrateQuery(query as any) ||
            q.state?.status === "pending"
          );
        },
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });

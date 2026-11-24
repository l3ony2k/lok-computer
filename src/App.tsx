import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Index from "./pages/Index";
import { UserSettingsProvider } from "./hooks/useUserSettings";
import { ThemeProvider } from "./hooks/useTheme";
import { isOfflineError, onCacheRevalidated } from "./lib/cachedRequest";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Loaders consult the persistent cache first, so they run even offline
      // and can serve a saved copy; a genuine miss offline fails once, quietly,
      // and refetches when the connection returns.
      networkMode: "offlineFirst",
      retry: (failureCount, error) => failureCount < 1 && navigator.onLine && !isOfflineError(error),
      refetchOnWindowFocus: false,
    },
  },
});

// A background refresh stored a newer copy than an open window is showing.
// Every query loads through cachedRequest, so refetching the active ones only
// re-reads IndexedDB, and structural sharing leaves unchanged data untouched.
// Refreshes that land together (a feed's pages) share one pass.
let invalidateTimer: ReturnType<typeof setTimeout> | undefined;
onCacheRevalidated(() => {
  clearTimeout(invalidateTimer);
  invalidateTimer = setTimeout(() => void queryClient.invalidateQueries(), 100);
});

// The desktop is one page; RouteInterpreter reads the arrival URL for deep links.
const App = () => (
  <UserSettingsProvider>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Toaster position="top-center" />
        <Index />
      </QueryClientProvider>
    </ThemeProvider>
  </UserSettingsProvider>
);

export default App;

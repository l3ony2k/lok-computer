import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Index from "./pages/Index";
import { UserSettingsProvider } from "./hooks/useUserSettings";
import { ThemeProvider } from "./hooks/useTheme";
import { isOfflineError } from "./lib/cachedRequest";

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

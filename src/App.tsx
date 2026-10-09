import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
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

const App = () => (
  <UserSettingsProvider>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster position="top-center" />
          <BrowserRouter>
            <Routes>
              {/* All paths render Index - RouteInterpreter handles deep links */}
              <Route path="/*" element={<Index />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </UserSettingsProvider>
);

export default App;

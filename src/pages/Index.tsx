import { WindowManagerProvider } from "@/components/WindowManager";
import { WindowTransitionProvider } from "@/components/window/WindowTransitionProvider";
import Desktop from "@/core/Desktop";
import { RouteInterpreter } from "@/components/RouteInterpreter";
import { SystemStartup } from "@/components/system/SystemStartup";
import { SystemUpdateMonitor } from "@/components/system/SystemUpdateMonitor";
import { ConnectivityMonitor } from "@/components/system/ConnectivityMonitor";

const IndexPage = () => {
  return (
    <WindowManagerProvider>
      <WindowTransitionProvider>
        <SystemStartup>
          <RouteInterpreter />
          <Desktop />
          <SystemUpdateMonitor />
          <ConnectivityMonitor />
        </SystemStartup>
      </WindowTransitionProvider>
    </WindowManagerProvider>
  );
};

export default IndexPage;

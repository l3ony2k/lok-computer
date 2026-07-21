import { WindowManagerProvider } from "@/components/WindowManager";
import { WindowTransitionProvider } from "@/components/window/WindowTransitionProvider";
import Desktop from "@/core/Desktop";
import { RouteInterpreter } from "@/components/RouteInterpreter";
import { SystemStartup } from "@/components/system/SystemStartup";
import { SystemUpdateMonitor } from "@/components/system/SystemUpdateMonitor";

const IndexPage = () => {
  return (
    <WindowManagerProvider>
      <WindowTransitionProvider>
        <SystemStartup>
          <RouteInterpreter />
          <Desktop />
          <SystemUpdateMonitor />
        </SystemStartup>
      </WindowTransitionProvider>
    </WindowManagerProvider>
  );
};

export default IndexPage;

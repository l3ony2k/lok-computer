import { WindowManagerProvider } from "@/components/WindowManager";
import Desktop from "@/core/Desktop";
import { RouteInterpreter } from "@/components/RouteInterpreter";

const IndexPage = () => {
  return (
    <WindowManagerProvider>
      <RouteInterpreter />
      <Desktop />
    </WindowManagerProvider>
  );
};

export default IndexPage;

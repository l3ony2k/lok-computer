import { WindowManagerProvider } from "@/components/WindowManager";
import Desktop from "@/core/Desktop";

const IndexPage = () => {
  return (
    <WindowManagerProvider>
      <Desktop />
    </WindowManagerProvider>
  );
};

export default IndexPage;

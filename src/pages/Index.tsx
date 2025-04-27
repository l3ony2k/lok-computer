import { ThemeProvider } from "@/components/ThemeProvider";
import { WindowManagerProvider } from "@/components/WindowManager";
import Desktop from "@/core/Desktop";

const IndexPage = () => {
  return (
    <ThemeProvider>
      <WindowManagerProvider>
        <Desktop />
      </WindowManagerProvider>
    </ThemeProvider>
  );
};

export default IndexPage;

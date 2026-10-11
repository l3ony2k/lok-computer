import { ArenaBlock, ArenaChannel, ArenaConnection } from "@/types/arena";
import { APP_CONFIG } from "@/config/constants";
import { ArenaDetailPanel } from "../components/ArenaDetailPanel";
import { WindowLayout } from "@/components/window/WindowLayout";
import { useApplicationLauncher } from "@/hooks/useApplicationLauncher";

interface BlockViewerProps {
  blockId: number | string;
  mode?: "window" | "embedded";
  initialBlock?: ArenaBlock;
  initialConnection?: ArenaConnection | null;
}

export const BlockViewer = ({
  blockId,
  mode = "window",
  initialBlock,
  initialConnection,
}: BlockViewerProps) => {
  const openApplication = useApplicationLauncher();

  const openImage = (imageUrl: string, title: string) => {
    openApplication('ImageViewer', {
      title,
      props: { imageUrl },
    });
  };

  const openChannel = (channel: ArenaChannel) => {
    openApplication('ChannelExplorer', {
      title: channel.title || "Channel",
      iconType: "other-channel",
      props: { channelSlug: channel.slug, username: channel.owner?.slug || APP_CONFIG.ARENA_USERNAME },
    });
  };

  const panel = (
    <ArenaDetailPanel
      item={initialBlock}
      blockId={blockId}
      initialConnection={initialConnection}
      onOpenChannel={openChannel}
      onOpenImage={openImage}
    />
  );

  if (mode === "embedded") return panel;

  // The detail panel manages its own padding and split scroll areas.
  return <WindowLayout hasPadding={false}>{panel}</WindowLayout>;
};

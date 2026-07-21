import { ArenaBlock, ArenaChannel, ArenaConnection } from "@/types/arena";
import { ArenaDetailPanel } from "../components/ArenaDetailPanel";
import { ArenaWindowLayout } from "../components/ArenaWindowLayout";
import { useWindowActions } from "@/hooks/useWindowManager";
import { ARENA_WINDOW_DEFAULTS } from "@/config/arenaWindows";
import { ImageViewerApp } from "@/apps/imageviewer/ImageViewerApp";
import { ChannelExplorer } from "@/config/lazyApps";

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
  const { addWindow } = useWindowActions();

  const openImage = (imageUrl: string, title: string) => {
    addWindow({
      title,
      content: <ImageViewerApp imageUrl={imageUrl} />,
      width: 800,
      height: 600,
      iconType: "image",
      componentType: "ImageViewer",
      props: { imageUrl },
    });
  };

  const openChannel = (channel: ArenaChannel) => {
    addWindow({
      title: channel.title || "Channel",
      content: <ChannelExplorer channelSlug={channel.slug} username={channel.owner?.slug || "lok"} />,
      width: ARENA_WINDOW_DEFAULTS.channelExplorer.width,
      height: ARENA_WINDOW_DEFAULTS.channelExplorer.height,
      iconType: "other-channel",
      componentType: "ChannelExplorer",
      props: { channelSlug: channel.slug, username: channel.owner?.slug || "lok" },
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

  return (
    <ArenaWindowLayout toolbar={null}>
      {panel}
    </ArenaWindowLayout>
  );
};

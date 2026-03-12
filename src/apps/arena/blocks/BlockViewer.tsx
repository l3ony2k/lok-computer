import { useEffect, useState } from "react";
import { ArenaBlock, ArenaConnection } from "@/types/arena";
import { getBlock } from "@/lib/api";
import { StateMessage } from "@/components/ui/StateMessage";
import { ArenaWindowLayout } from "../components/ArenaWindowLayout";
import { useWindowManager } from "@/hooks/useWindowManager";
import { ImageViewerApp } from "@/apps/imageviewer/ImageViewerApp";
import { getPreviewImageUrl } from "../utils/contentItemHelpers";

const getBestImageSource = (block: ArenaBlock): string => {
  return block.image?.large?.src ?? block.image?.medium?.src ?? block.image?.original.src ?? "";
};

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const titleCase = (value: string) => {
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const mergeConnection = (block: ArenaBlock, connection?: ArenaConnection | null): ArenaBlock => {
  if (block.connection || !connection) {
    return block;
  }

  return {
    ...block,
    connection,
  };
};

const renderAttachment = (block: ArenaBlock) => {
  const previewImage = getPreviewImageUrl(block.image);

  if (previewImage) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[200px]">
        <img
          src={previewImage}
          alt={block.title || "Attachment preview"}
          className="max-w-full object-contain"
        />
      </div>
    );
  }

  if (!block.attachment?.url) {
    return <p>This attachment does not include a downloadable file.</p>;
  }

  return (
    <a
      href={block.attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center justify-center w-full p-8 border border-dashed border-border hover:bg-muted transition-colors"
    >
      <span className="text-4xl mb-2">📎</span>
      <span className="underline break-all">{block.attachment.fileName || "Download attachment"}</span>
    </a>
  );
};

const renderEmbed = (block: ArenaBlock) => {
  if (block.embed?.html) {
    return (
      <div
        className="max-w-full [&>iframe]:max-w-full"
        dangerouslySetInnerHTML={{ __html: block.embed.html }}
      />
    );
  }

  const previewImage = getPreviewImageUrl(block.image);
  if (previewImage) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[200px]">
        <img
          src={previewImage}
          alt={block.title || "Embed preview"}
          className="max-w-full object-contain"
        />
      </div>
    );
  }

  if (block.embed?.url) {
    return (
      <a href={block.embed.url} target="_blank" rel="noopener noreferrer" className="underline">
        Open embed source
      </a>
    );
  }

  return <p>This embed does not include a preview.</p>;
};

const createBlockRenderers = (onImageClick?: (imageUrl: string, title: string) => void) => ({
  image: (block: ArenaBlock) => {
    const imageUrl = getBestImageSource(block);
    return (
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[200px]">
        <img
          src={imageUrl}
          alt={block.title || "Image"}
          className="max-w-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => onImageClick?.(imageUrl, block.title || "Image")}
        />
      </div>
    );
  },
  text: (block: ArenaBlock) => (
    <div
      className="prose dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-a:text-[var(--link-color)] prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground prose-blockquote:text-foreground"
      dangerouslySetInnerHTML={{ __html: block.textHtml || "" }}
    />
  ),
  link: (block: ArenaBlock) => {
    const imageUrl = getBestImageSource(block);
    return (
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[200px]">
        {block.image ? (
          <img
            src={imageUrl}
            alt={block.title || "Link thumbnail"}
            className="max-w-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => onImageClick?.(imageUrl, block.title || "Link thumbnail")}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-40 bg-muted text-muted-foreground">
            No Thumbnail
          </div>
        )}
      </div>
    );
  },
  attachment: (block: ArenaBlock) => renderAttachment(block),
  embed: (block: ArenaBlock) => renderEmbed(block),
});

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
  const [loading, setLoading] = useState(!initialBlock);
  const [block, setBlock] = useState<ArenaBlock | null>(initialBlock ?? null);
  const [error, setError] = useState<string | null>(null);
  const { addWindow } = useWindowManager();

  const handleImageClick = (imageUrl: string, title: string) => {
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

  const blockRenderers = createBlockRenderers(handleImageClick);

  useEffect(() => {
    let isActive = true;

    const fetchBlock = async () => {
      try {
        setLoading(true);
        const data = await getBlock(blockId, initialBlock ?? null);
        if (isActive) {
          setBlock(mergeConnection(data, initialConnection ?? initialBlock?.connection ?? null));
          setError(null);
        }
      } catch (fetchError) {
        if (isActive) {
          setError("Failed to load block");
          console.error(fetchError);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchBlock();

    return () => {
      isActive = false;
    };
  }, [blockId, initialBlock, initialConnection]);

  if (loading && !block) {
    return <StateMessage>Loading...</StateMessage>;
  }

  if (error || !block) {
    return <div className="p-4 text-center text-red-500">{error || "Block not found"}</div>;
  }

  const renderBlockContent = () => {
    const renderer = blockRenderers[block.kind];
    if (renderer) {
      return renderer(block);
    }

    return <p>This block type ({block.kind}) is not supported in the viewer.</p>;
  };

  const hasDescription = Boolean(block.descriptionHtml || block.descriptionPlain);
  const connectedBy = block.connection?.connectedBy ?? block.owner;
  const connectedAt = block.connection?.connectedAt ?? block.createdAt;

  const content = (
    <div className="flex flex-col min-h-full w-full">
      <div className="w-full flex justify-center p-2 max-w-4xl mx-auto">
        {renderBlockContent()}
      </div>

      <div className="mt-auto w-full">
        {hasDescription && (
          <>
            <hr className="w-full border-border" />
            <div
              className="w-full prose dark:prose-invert max-w-none text-sm p-2 overflow-hidden"
              dangerouslySetInnerHTML={{ __html: block.descriptionHtml || "" }}
            />
          </>
        )}

        <hr className="w-full border-border" />
        <div className="w-full flex flex-wrap gap-x-8 gap-y-4 text-xs text-muted-foreground p-2">
          <div className="flex flex-col gap-1">
            <span className="font-bold text-foreground/70 uppercase tracking-wider text-[10px]">Type</span>
            <span>{titleCase(block.kind)}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-bold text-foreground/70 uppercase tracking-wider text-[10px]">Block ID</span>
            <a
              href={block.arenaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary hover:underline w-fit"
            >
              #{block.id}
            </a>
          </div>

          {block.source?.url && (
            <div className="flex flex-col gap-1 max-w-[200px]">
              <span className="font-bold text-foreground/70 uppercase tracking-wider text-[10px]">Source</span>
              <a
                href={block.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary hover:underline truncate block w-full"
                title={block.source.url}
              >
                {block.source.title || block.source.url}
              </a>
            </div>
          )}

          {connectedBy && (
            <div className="flex flex-col gap-1">
              <span className="font-bold text-foreground/70 uppercase tracking-wider text-[10px]">Connected By</span>
              <a
                href={`https://www.are.na/${connectedBy.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary hover:underline w-fit"
              >
                {connectedBy.name}
              </a>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <span className="font-bold text-foreground/70 uppercase tracking-wider text-[10px]">Connected Time</span>
            <span>{formatDateTime(connectedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (mode === "embedded") {
    return <div className="h-full overflow-y-auto bg-background">{content}</div>;
  }

  return (
    <ArenaWindowLayout toolbar={null}>
      {content}
    </ArenaWindowLayout>
  );
};

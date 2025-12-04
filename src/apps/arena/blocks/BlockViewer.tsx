import { useState, useEffect } from "react";
import { ArenaBlock } from "@/types/arena";
import { getBlock } from "@/lib/api";
import { ArenaWindowLayout } from "../components/ArenaWindowLayout";

// Helper functions for image source determination
const getImageSource = (block: ArenaBlock): string => {
  if (!block.image) return "";

  const image = block.image as any;

  if (image.large?.url) return image.large.url;
  if (image.display?.url) return image.display.url;
  if (image.original?.url) return image.original.url;

  return "";
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

// Shared renderer for Media and Attachment types
const renderMediaOrAttachment = (block: ArenaBlock) => (
  <div className="flex flex-col items-center justify-center w-full">
    {block.embed?.html && (
      <div
        className="max-w-full [&>iframe]:max-w-full"
        dangerouslySetInnerHTML={{ __html: block.embed.html }}
      />
    )}
    {!block.embed?.html && block.attachment?.url && (
      <a
        href={block.attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center justify-center w-full p-8 border border-dashed border-border hover:bg-muted transition-colors"
      >
        <span className="text-4xl mb-2">📎</span>
        <span className="underline break-all">{block.attachment.file_name || "Download attachment"}</span>
      </a>
    )}
  </div>
);

// Block type renderers
const renderBlockByType = {
  Image: (block: ArenaBlock) => (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[200px]">
      <img
        src={getImageSource(block)}
        alt={block.title || "Image"}
        // removed max-h-[60vh]
        className="max-w-full object-contain"
      />
    </div>
  ),

  Text: (block: ArenaBlock) => (
    <div
      className="prose dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-a:text-[var(--link-color)] prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground prose-blockquote:text-foreground"
      dangerouslySetInnerHTML={{
        __html: block.content_html || block.content || ""
      }}
    />
  ),

  Link: (block: ArenaBlock) => (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[200px]">
      {block.image ? (
        <img
          src={getImageSource(block)}
          alt={block.title || "Link thumbnail"}
          // removed max-h-[60vh]
          className="max-w-full object-contain"
        />
      ) : (
        <div className="flex items-center justify-center w-full h-40 bg-muted text-muted-foreground">
          No Thumbnail
        </div>
      )}
    </div>
  ),

  Media: (block: ArenaBlock) => renderMediaOrAttachment(block),
  Attachment: (block: ArenaBlock) => renderMediaOrAttachment(block)
};

export const BlockViewer = ({ blockId, mode = "window" }: { blockId: number | string, mode?: "window" | "embedded" }) => {
  const [loading, setLoading] = useState(true);
  const [block, setBlock] = useState<ArenaBlock | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlock = async () => {
      try {
        setLoading(true);
        const data = await getBlock(blockId);
        setBlock(data);
        setError(null);
      } catch (err) {
        setError("Failed to load block");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBlock();
  }, [blockId]);

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (error || !block) {
    return <div className="p-4 text-center text-red-500">{error || "Block not found"}</div>;
  }

  const renderBlockContent = () => {
    const blockClass = block.class as keyof typeof renderBlockByType;

    // Use the type-specific renderer if available
    if (renderBlockByType[blockClass]) {
      return renderBlockByType[blockClass](block);
    }

    // Fallback for unsupported block types
    return <p>This block type ({block.class}) is not supported in the viewer.</p>;
  };

  const hasDescription = Boolean(block.description_html || block.description);

  const content = (
    <div className="flex flex-col min-h-full w-full">

      {/* Content Section */}
      <div className="w-full flex justify-center p-2 max-w-4xl mx-auto">
        {renderBlockContent()}
      </div>

      {/* Metadata Area (Description + Metadata) */}
      <div className="mt-auto w-full">
        {/* Description Section (Optional) */}
        {hasDescription && (
          <>
            <hr className="w-full border-border" />
            <div
              className="w-full prose dark:prose-invert max-w-none text-sm p-2 overflow-hidden"
              dangerouslySetInnerHTML={{
                __html: block.description_html || block.description || ""
              }}
            />
          </>
        )}

        {/* Metadata Section */}
        <hr className="w-full border-border" />
        <div className="w-full flex flex-wrap gap-x-8 gap-y-4 text-xs text-muted-foreground p-2">
          <div className="flex flex-col gap-1">
            <span className="font-bold text-foreground/70 uppercase tracking-wider text-[10px]">Type</span>
            <span>{block.class}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-bold text-foreground/70 uppercase tracking-wider text-[10px]">Block ID</span>
            <a
              href={`https://www.are.na/block/${block.id}`}
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

          <div className="flex flex-col gap-1">
            <span className="font-bold text-foreground/70 uppercase tracking-wider text-[10px]">Connected By</span>
            <a
              href={`https://www.are.na/${block.user.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary hover:underline w-fit"
            >
              {block.user.full_name}
            </a>
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-bold text-foreground/70 uppercase tracking-wider text-[10px]">Connected Time</span>
            <span>{formatDate(block.created_at)}</span>
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

import { useState, useEffect } from "react";
import { ArenaBlock } from "@/types/arena";
import { getBlock } from "@/lib/api";

export const BlockViewer = ({ blockId }: { blockId: number | string }) => {
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

  const getImageSource = () => {
    if (!block.image) return "";
    
    if (typeof block.image.display === 'string') {
      return block.image.display;
    }
    
    if (block.image.display && typeof block.image.display === 'object' && 'url' in block.image.display) {
      return block.image.display.url;
    }
    
    if (block.image.original && typeof block.image.original === 'object' && 'url' in block.image.original) {
      return block.image.original.url;
    }
    
    return "";
  };

  const renderBlockContent = () => {
    switch (block.class) {
      case "Image":
        return (
          <div className="flex flex-col">
            <img 
              src={getImageSource()}
              alt={block.title || "Image"} 
              className="max-w-full object-contain max-h-[60vh] mx-auto"
            />
            {block.title && <p className="mt-2 font-bold">{block.title}</p>}
            {block.description && <p className="mt-1">{block.description}</p>}
          </div>
        );
      case "Text":
        return (
          <div className="whitespace-pre-wrap">
            {block.content}
          </div>
        );
      case "Link":
        return (
          <div className="flex flex-col">
            {block.source?.url && (
              <a 
                href={block.source.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-500 underline break-all"
              >
                {block.source.title || block.source.url}
              </a>
            )}
            {block.description && <p className="mt-2">{block.description}</p>}
          </div>
        );
      case "Media":
      case "Attachment":
        return (
          <div className="flex flex-col">
            {block.embed?.html && (
              <div 
                className="max-w-full"
                dangerouslySetInnerHTML={{ __html: block.embed.html }} 
              />
            )}
            {!block.embed?.html && block.attachment?.url && (
              <a 
                href={block.attachment.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-500 underline"
              >
                {block.attachment.file_name || "Download attachment"}
              </a>
            )}
            {block.title && <p className="mt-2 font-bold">{block.title}</p>}
            {block.description && <p className="mt-1">{block.description}</p>}
          </div>
        );
      default:
        return <p>This block type is not supported in the viewer.</p>;
    }
  };

  return (
    <div className="p-2">
      <div className="flex flex-col">
        <div className="text-sm mb-2 text-muted-foreground">
          Block ID: {block.id} | Created: {new Date(block.created_at).toLocaleDateString()}
        </div>
        {renderBlockContent()}
        {block.source?.url && block.class !== "Link" && (
          <div className="mt-4 text-sm">
            Source: <a 
              href={block.source.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-500 underline"
            >
              {block.source.title || block.source.url}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

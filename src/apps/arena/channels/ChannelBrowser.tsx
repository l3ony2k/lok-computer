import React, { useEffect, useState } from "react";
import { ArenaChannel, ArenaItem } from "@/types/arena";
import { getUserChannels } from "@/lib/api";
import { APP_CONFIG } from "@/config/constants";
import { useApplicationLauncher } from "@/hooks/useApplicationLauncher";
import { usePersistedState } from "@/hooks/useStorage";
import {
  ArenaFileView,
} from "../components/ArenaFileView";
import {
  ArenaFileViewState,
  StoredArenaFileViewState,
  createArenaFileViewState,
  normalizeArenaFileViewState,
} from "../components/arenaFileViewState";

const VIEW_STATE_KEY = "app:arena-browser";
const DEFAULT_FILE_STATE = createArenaFileViewState({
  view: "list",
  gridSize: "small",
  listSize: "medium",
});

export const ChannelBrowser: React.FC<{ username?: string }> = ({ username = APP_CONFIG.ARENA_USERNAME }) => {
  const [channels, setChannels] = useState<ArenaChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<ArenaChannel | null>(null);
  const [fileState, setFileState] = usePersistedState<ArenaFileViewState>({
    key: VIEW_STATE_KEY,
    defaultValue: DEFAULT_FILE_STATE,
    debounceMs: 300,
    normalize: (stored) => normalizeArenaFileViewState(stored as StoredArenaFileViewState, DEFAULT_FILE_STATE),
  });
  const openApplication = useApplicationLauncher();

  useEffect(() => {
    let active = true;
    const fetchChannels = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const fetchedChannels = await getUserChannels(username);
        if (active) setChannels(fetchedChannels);
      } catch (error) {
        console.error("Error fetching user channels", error);
        if (active) setLoadError("Failed to load channels");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchChannels();
    return () => { active = false; };
  }, [username]);

  const openChannel = (channel: ArenaChannel | { title: string; slug: string }) => {
    openApplication('ChannelExplorer', {
      title: channel.title || channel.slug,
      iconType: "other-channel",
      props: { channelSlug: channel.slug, username },
    });
  };

  const goToAddress = () => {
    const slug = address.trim();
    if (!slug) return;
    openChannel({ title: slug, slug });
  };

  const handleOpen = (item: ArenaItem) => {
    if (item.kind === "channel") openChannel(item);
  };

  return (
    <ArenaFileView
      items={channels}
      state={fileState}
      onStateChange={setFileState}
      selectedId={selectedChannel?.id}
      onSelect={(item) => item.kind === "channel" && setSelectedChannel(item)}
      onOpen={handleOpen}
      loading={loading}
      loadingStatus={`loading channels for @${username}...`}
      error={loadError}
      emptyText="no matching channels"
      addressBar={
        <div className="arena-address-bar">
          <div className="arena-address-group">
            <input
              className="arena-toolbar-control"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && goToAddress()}
              placeholder="channel slug"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <button type="button" className="arena-toolbar-control" onClick={goToAddress}>Go</button>
          </div>
        </div>
      }
    />
  );
};

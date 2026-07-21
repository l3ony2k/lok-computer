import React, { useEffect, useRef, useState } from "react";
import { ArenaChannel, ArenaItem } from "@/types/arena";
import { getUserChannels } from "@/lib/api";
import { useWindowActions } from "@/hooks/useWindowManager";
import { ARENA_WINDOW_DEFAULTS } from "@/config/arenaWindows";
import { ChannelExplorer } from "./ChannelExplorer";
import { getAppState, setAppState } from "@/lib/storage";
import {
  ArenaFileView,
} from "../components/ArenaFileView";
import {
  ArenaFileViewState,
  createArenaFileViewState,
  normalizeArenaFileViewState,
} from "../components/arenaFileViewState";

const VIEW_STATE_KEY = "app:arena-browser";

export const ChannelBrowser: React.FC<{ username?: string }> = ({ username = "lok" }) => {
  const [channels, setChannels] = useState<ArenaChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<ArenaChannel | null>(null);
  const [fileState, setFileState] = useState<ArenaFileViewState>(() => createArenaFileViewState({
    view: "list",
    gridSize: "small",
    listSize: "medium",
  }));
  const stateLoaded = useRef(false);
  const { addWindow } = useWindowActions();

  useEffect(() => {
    const loadState = async () => {
      try {
        const saved = await getAppState<Partial<ArenaFileViewState> & { isListView?: boolean; gridSize?: "S" | "M" | "L" }>(VIEW_STATE_KEY);
        setFileState((current) => normalizeArenaFileViewState(saved, current));
      } catch (error) {
        console.error("[ChannelBrowser] Failed to load file view state", error);
      } finally {
        stateLoaded.current = true;
      }
    };
    loadState();
  }, []);

  useEffect(() => {
    if (!stateLoaded.current) return;
    const timeout = setTimeout(() => {
      setAppState(VIEW_STATE_KEY, fileState).catch((error) => {
        console.error("[ChannelBrowser] Failed to save file view state", error);
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [fileState]);

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
    addWindow({
      title: channel.title || channel.slug,
      content: <ChannelExplorer channelSlug={channel.slug} username={username} />,
      width: ARENA_WINDOW_DEFAULTS.channelExplorer.width,
      height: ARENA_WINDOW_DEFAULTS.channelExplorer.height,
      iconType: "other-channel",
      componentType: "ChannelExplorer",
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

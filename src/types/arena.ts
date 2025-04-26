
export interface ArenaChannel {
  id: number;
  title: string;
  length: number;
  status: string;
  user_id: number;
  slug: string;
  added_to_at: string;
  published: boolean;
  updated_at: string;
  created_at: string;
  open: boolean;
  collaboration: boolean;
  collaborator_count: number;
  owner: {
    id: number;
    slug: string;
    username: string;
    first_name: string;
    last_name: string;
    full_name: string;
    avatar: string;
  };
  contents_updated_at: string;
  class: string;
  user: {
    id: number;
    slug: string;
    username: string;
    first_name: string;
    last_name: string;
    full_name: string;
    avatar: string;
  };
  base_class: string;
  current_user_channels_index: number | null;
}

export interface ArenaBlock {
  id: number;
  title: string | null;
  generated_title: string;
  content?: string;
  description?: string;
  source?: {
    url: string;
    title: string;
  };
  image?: {
    filename: string;
    content_type: string;
    updated_at: string;
    thumb: string;
    square: string;
    display: string;
    original: {
      url: string;
    };
  };
  attachment?: {
    url: string;
    file_size: number;
    file_name: string;
    file_content_type: string;
    file_content_size: number;
  };
  embed?: {
    type: string;
    url: string;
    html: string;
  };
  created_at: string;
  updated_at: string;
  position: number;
  selected: boolean;
  class: string;
  user: {
    id: number;
    slug: string;
    username: string;
    first_name: string;
    last_name: string;
    full_name: string;
    avatar: string;
  };
  base_class: string;
  connection_id: number;
}

export interface ArenaChannelContents {
  contents: Array<ArenaBlock | ArenaChannel>;
  base_class: string;
  owner: {
    id: number;
    slug: string;
    username: string;
    first_name: string;
    last_name: string;
    full_name: string;
    avatar: string;
  };
  title: string;
  length: number;
}

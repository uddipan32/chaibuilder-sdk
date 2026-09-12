import { VideoIcon } from "@radix-ui/react-icons";
import { get, isEmpty, omit, pick } from "lodash-es";
import { registerChaiBlockProps, stylesProp } from "~/registry";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";

export type VideoBlockProps = {
  styles: ChaiStyles;
  controls: Record<string, any>;
  inBuilder: boolean;
  poster: string;
  url: string;
  customUrl: string;
  videoSource: "Custom" | "Youtube" | "Vimeo";
  sources: { srcsets: Array<{ url: string; width: number; type?: string }> };
  title: string;
};

const ControlsProp: any = {
  type: "object",
  title: "Controls",
  default: {
    autoplay: true,
    controls: false,
    loop: true,
    muted: true,
  },
  properties: {
    autoplay: {
      type: "boolean",
      title: "Autoplay",
      default: false,
    },
    controls: {
      type: "boolean",
      title: "Show Controls",
      default: true,
    },
    loop: {
      type: "boolean",
      title: "Loop Video",
      default: false,
    },
    muted: {
      type: "boolean",
      title: "Muted",
      default: false,
    },
  },
};

const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?youtube\.com\/(watch\?v=|embed\/)([a-zA-Z0-9_-]{11})/;
const VIMEO_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/(?:channels\/[\w]+\/|groups\/[^\/]+\/videos\/|album\/\d+\/video\/|video\/)?|player\.vimeo\.com\/video\/)(\d+)/;
const isYoutube = (url: string) => YOUTUBE_REGEX.test(url);
const isVimeo = (url: string) => VIMEO_REGEX.test(url);

/**
 *
 * @param {string} url - The URL of the video.
 * @param {object} controls - The controls object containing autoplay, loop, and muted properties.
 * @returns {string|null} The embed URL for the video, or null if the video source is not supported.
 */
const getEmbedURL = (url: string, controls: Record<string, any>) => {
  const autoplay = get(controls, "autoplay", false);
  const _controls = get(controls, "controls", false);
  const loop = get(controls, "loop", false);
  const shouldMute = autoplay || get(controls, "muted", true);

  if (isYoutube(url)) {
    const match = url.match(YOUTUBE_REGEX);
    if (match) {
      const videoId = match[4];
      const embedURL = `https://www.youtube.com/embed/${videoId}`;
      const params = [];
      if (autoplay) params.push("autoplay=1");
      if (loop) params.push(`loop=1`, `playlist=${videoId}`);
      if (shouldMute) params.push("mute=1", "muted=1");
      params.push(_controls ? "controls=1" : "controls=0");
      return `${embedURL}?${params.join("&")}`;
    }
  }

  if (isVimeo(url)) {
    const match = url.match(VIMEO_REGEX);
    if (match) {
      const videoId = match[1];
      const params = [];
      if (autoplay) params.push("autoplay=1");
      params.push(_controls ? "controls=1" : "controls=0");
      if (shouldMute) params.push("muted=1");
      if (loop) params.push("loop=1");
      return `https://player.vimeo.com/video/${videoId}?${params.join("&")}`;
    }
  }

  return null;
};


const getResolvedSourceURL = (props: Pick<VideoBlockProps, "customUrl" | "url" | "videoSource">) => {
  const { videoSource, customUrl, url } = props;
  switch (videoSource) {
      case 'Custom':
        if(isEmpty(customUrl) && url && !isYoutube(url) && !isVimeo(url)) return url;
        return customUrl;
      case 'Youtube':
      case 'Vimeo':
          return url;
      default:
          return null;
  }
}

/**
 * @description
 * SupportedVideoSource component is responsible for rendering video content
 * from supported video sources such as YouTube and Vimeo.
 * It takes the video URL, block properties, styles, controls, video source type,
 * and in-builder flag as props.
 * It returns a div element with an iframe containing the video content.
 */
const SupportedVideoSource = (props: ChaiBlockComponentProps<VideoBlockProps>) => {
  const { url, blockProps, styles, controls, videoSource, inBuilder, title } = props;

  const embedURL = getEmbedURL(url, controls);

  return (
    <div {...omit(styles, "className")} className="relative w-full overflow-hidden" style={{ paddingBottom: "56.25%" }}>
      {!embedURL && inBuilder ? (
        <div className="absolute flex h-full w-full items-center justify-center bg-gray-300 text-center">
          {isEmpty(url)
            ? `Provided ${videoSource} video link in settings Video URL.`
            : `Provided ${videoSource} video link is invalid.`}
        </div>
      ) : (
        <iframe
          className={`absolute left-0 top-0 h-full w-full ${pick(styles, "className").className || ""}`}
          src={embedURL ?? ""}
          title={title || "Video player"}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
      {inBuilder && <div {...blockProps} className="absolute top-0 h-full w-full" />}
    </div>
  );
};

/**
 *
 * @param props
 * @returns Custom mp4 video provider
 */
const CustomVideoSource = (props: ChaiBlockComponentProps<VideoBlockProps>) => {
  const { styles, controls, sources, poster, blockProps, title } = props;
  let _poster = poster;

  const url = getResolvedSourceURL(pick(props, "customUrl", "url", "videoSource"));
  const srcsets = [...(get(sources, "srcsets", []) || [])];
  if (url && typeof url === "string") srcsets.push({ url, width: 9999 });
  const sortedSources = srcsets
    .sort((a, b) => a.width - b.width)
    .filter((source) => !isEmpty(source.url) && source.width != null);

  if (sortedSources.length === 0 && !_poster) {
    _poster = "https://placehold.co/300x200/EEE/ccc?text=Choose%20Video";
  }

  const shouldMute = get(controls, "autoplay", false) || get(controls, "muted", true);

  return (
    (_poster || !isEmpty(sortedSources)) && (
      <div className="relative w-full overflow-hidden" style={{ paddingBottom: "56.25%" }}>
        <video
          {...styles}
          {...blockProps}
          title={title || "Video player"}
          key={JSON.stringify(sortedSources)}
          controls={get(controls, "controls", false)}
          autoPlay={get(controls, "autoplay", false)}
          loop={get(controls, "loop", false)}
          poster={_poster}
          {...(shouldMute ? { muted: true } : {})}>
          {sortedSources.map((source) => {
            if (!source.url || source.url.length < 4 || isNaN(source.width)) return null;
            const mediaQuery = `(max-width: ${source.width}px)`;

            return <source key={source.url} src={source.url} media={mediaQuery} type={source.type} />;
          })}
          Your browser does not support the video tag.
        </video>
      </div>
    )
  );
};

/**
 *
 * @param props
 * @returns Video Block
 */
const VideoBlock = (props: ChaiBlockComponentProps<VideoBlockProps>) => {
  const { videoSource } = props;

  if (videoSource === "Custom") return <CustomVideoSource {...props} />;
  if (videoSource === "Youtube" || videoSource === "Vimeo") return <SupportedVideoSource {...props} />;
  return <div>Invalid video source : {videoSource}</div>;
};

const Config = {
  type: "Video",
  label: "Video",
  category: "core",
  icon: VideoIcon,
  group: "media",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp("absolute h-full w-full object-cover"),
      videoSource: {
        type: "string",
        default: "Custom",
        enum: ["Custom", "Youtube", "Vimeo"],
        title: "Video source",
      },
      title: {
        type: "string",
        title: "Video Title",
        default: "Video player",
      },
    },
    allOf: [
      {
        if: {
          properties: {
            videoSource: { const: "Custom" },
          },
        },
        then: {
          properties: {
            customUrl: {
              type: "string",
              title: "Video URL",
              default: "",
            },
            poster: {
              type: "string",
              title: "Poster URL",
              default: "",
            },

            sources: {
              type: "object",
              default: { srcsets: [] },
            },
            controls: { ...ControlsProp },
          },
        },
      },
      {
        if: {
          properties: {
            videoSource: { const: "Youtube" },
          },
        },
        then: {
          properties: {
            url: {
              type: "string",
              title: "Youtube Video URL",
              default: "",
            },
            controls: { ...ControlsProp },
          },
        },
      },
      {
        if: {
          properties: {
            videoSource: { const: "Vimeo" },
          },
        },
        then: {
          properties: {
            url: {
              type: "string",
              title: "Vimeo Video URL",
              default: "",
            },
            controls: { ...ControlsProp },
          },
        },
      },
    ],
    ui: {
      url: { "ui:placeholder": "Enter Video URL" },
      customUrl: { "ui:placeholder": "Enter Video URL", "ui:widget": "video" },
      sources: { "ui:field": "sources" },
      poster: { "ui:placeholder": "Enter poster URL", "ui:widget": "image" },
    },
  }),
  i18nProps: ["url", "customUrl", "title"],
};

export { VideoBlock as Component, Config };

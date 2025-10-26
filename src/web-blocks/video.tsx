import { ChaiBlockComponentProps, ChaiStyles, registerChaiBlockSchema, StylesProp } from "@chaibuilder/runtime";
import { VideoIcon } from "@radix-ui/react-icons";
import { get, isEmpty, omit, pick } from "lodash-es";

export type VideoBlockProps = {
  styles: ChaiStyles;
  controls: Record<string, any>;
  inBuilder: boolean;
  poster: string;
  url: string;
  videoSource: "Custom" | "Youtube" | "Vimeo";
  sources: { srcsets: Array<{ url: string; width: number }> };
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

/**
 *
 * @param {string} url - The URL of the video.
 * @param {object} controls - The controls object containing autoplay, loop, and muted properties.
 * @returns {string|null} The embed URL for the video, or null if the video source is not supported.
 */
const getEmbedURL = (url, controls) => {
  const autoplay = get(controls, "autoplay", false);
  const _controls = get(controls, "controls", false);
  const loop = get(controls, "loop", false);
  const shouldMute = autoplay || get(controls, "muted", true);

  if (YOUTUBE_REGEX.test(url)) {
    const match = url.match(YOUTUBE_REGEX);
    if (match) {
      const videoId = match[4];
      let embedURL = `https://www.youtube.com/embed/${videoId}`;
      let ytControls = autoplay ? `autoplay=1` : "";
      ytControls += loop ? `&loop=1&playlist=${videoId}` : "";
      ytControls += shouldMute ? `&mute=1&muted=1` : "";
      ytControls += _controls ? `&controls=1` : "&controls=0";
      return `${embedURL}?${ytControls}`;
    }
  }

  if (VIMEO_REGEX.test(url)) {
    const match = url.match(VIMEO_REGEX);
    if (match) {
      const videoId = match[1];
      let vimeoControls = "";
      vimeoControls += autoplay ? "autoplay=1" : "";
      vimeoControls += _controls ? "&controls=1" : "&controls=0";
      vimeoControls += shouldMute ? "&muted=1" : "";
      vimeoControls += loop ? "&loop=1" : "";
      return `https://player.vimeo.com/video/${videoId}?${vimeoControls}`;
    }
  }

  return null;
};

/**
 * @description
 * SupportedVideoSource component is responsible for rendering video content
 * from supported video sources such as YouTube and Vimeo.
 * It takes the video URL, block properties, styles, controls, video source type,
 * and in-builder flag as props.
 * It returns a div element with an iframe containing the video content.
 */
const SupportedVideoSource = (props: ChaiBlockComponentProps<VideoBlockProps>) => {
  const { url, blockProps, styles, controls, videoSource, inBuilder } = props;

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
        <iframe width="100%" src={embedURL} {...pick(styles, "className")} />
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
  const { url, styles, controls, sources, poster, blockProps } = props;
  let _poster = poster;

  const srcsets = [...(get(sources, "srcsets", []) || [])];
  if (url && typeof url === "string") srcsets.push({ url, width: "9999" });
  const sortedSources = srcsets
    .sort((a, b) => parseInt(a.width) - parseInt(b.width))
    .filter((source) => !isEmpty(source.url) && !isEmpty(source.width));

  if (sortedSources.length === 0 && !_poster) {
    _poster = "https://placehold.co/300x200/EEE/ccc?text=Choose%20Video";
  }

  const shouldMute = get(controls, "autoplay", false) || get(controls, "muted", true);

  return (
    (_poster || !isEmpty(sortedSources)) && (
      <div className="relative w-full overflow-hidden" style={{}}>
        <video
          {...styles}
          {...blockProps}
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
  ...registerChaiBlockSchema({
    properties: {
      styles: StylesProp("w-full"),
      videoSource: {
        type: "string",
        default: "Custom",
        enum: ["Custom", "Youtube", "Vimeo"],
        title: "Video source",
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
            url: {
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
      sources: { "ui:field": "sources" },
      poster: { "ui:placeholder": "Enter poster URL" },
    },
  }),
  i18nProps: ["url"],
};

export { VideoBlock as Component, Config };

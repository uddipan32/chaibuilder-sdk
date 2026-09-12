import React, { Component } from "react";
import ReactDOM from "react-dom";
import Content from "~/builder/core/frame/frame-content";
import { FrameContextProvider } from "~/builder/core/frame/frame-context";

interface FrameProps {
  id?: string;
  title?: string;
  style?: React.CSSProperties;
  head?: React.ReactNode;
  initialContent?: string;
  mountTarget?: string;
  className?: string;
  contentDidMount?(...args: unknown[]): unknown;
  contentDidUpdate?(...args: unknown[]): unknown;
  children?: React.ReactElement | React.ReactElement[];
  forwardedRef?: React.ForwardedRef<HTMLIFrameElement>;
}

interface FrameState {
  iframeLoaded: boolean;
}

export class Frame extends Component<FrameProps, FrameState> {
  _isMounted = false;
  nodeRef = React.createRef<HTMLIFrameElement>();
  loadCheck?: NodeJS.Timeout;
  static defaultProps = {
    style: {},
    head: null,
    children: undefined,
    mountTarget: undefined,
    contentDidMount: () => {},
    contentDidUpdate: () => {},
    initialContent: '<!DOCTYPE html><html><head></head><body><div class="frame-root"></div></body></html>',
  };

  constructor(props: FrameProps) {
    super(props);
    this.state = { iframeLoaded: false };
  }

  componentDidMount() {
    this._isMounted = true;

    const doc = this.getDoc();

    if (doc && this.nodeRef.current) {
      this.nodeRef.current.contentWindow?.addEventListener("DOMContentLoaded", this.handleLoad);
    }
  }

  componentWillUnmount() {
    this._isMounted = false;

    this.nodeRef.current?.removeEventListener("DOMContentLoaded", this.handleLoad);
    clearInterval(this.loadCheck);
  }

  getDoc() {
    return this.nodeRef.current ? this.nodeRef.current.contentDocument : null;
  }

  getMountTarget() {
    const doc = this.getDoc();
    if (!doc) return null;
    if (this.props.mountTarget) {
      return doc.querySelector(this.props.mountTarget);
    }
    return doc.body.children[0];
  }

  setRef = (node: HTMLIFrameElement) => {
    (this.nodeRef as any).current = node;

    const { forwardedRef } = this.props;
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      (forwardedRef as any).current = node;
    }
  };

  handleLoad = () => {
    clearInterval(this.loadCheck);
    // Bail update as some browsers will trigger on both DOMContentLoaded & onLoad ala firefox
    if (!this.state.iframeLoaded) {
      this.setState({ iframeLoaded: true });
    }
  };

  // In certain situations on a cold cache DOMContentLoaded never gets called
  // fallback to an interval to check if that's the case
  startLoadCheck = () => {
    this.loadCheck = setInterval(() => {
      this.handleLoad();
    }, 500);
  };

  renderFrameContents() {
    if (!this._isMounted) {
      return null;
    }

    const doc = this.getDoc();

    if (!doc) {
      return null;
    }

    const contentDidMount = this.props.contentDidMount;
    const contentDidUpdate = this.props.contentDidUpdate;

    const win = doc.defaultView || (doc as any).parentView;
    const contents = (
      <Content contentDidMount={contentDidMount as any} contentDidUpdate={contentDidUpdate as any}>
        <FrameContextProvider value={{ document: doc, window: win as any }}>
          <div className="frame-content">{this.props.children}</div>
        </FrameContextProvider>
      </Content>
    );

    const mountTarget = this.getMountTarget();
    if (!mountTarget || !doc.head) return null;

    return [ReactDOM.createPortal(this.props.head, doc.head), ReactDOM.createPortal(contents, mountTarget as any)];
  }

  render() {
    const { ...rest } = this.props;
    const props: any = {
      ...rest,
      srcDoc: this.props.initialContent,
      children: undefined, // The iframe isn't ready so we drop children from props here. #12, #17
    };
    delete props.head;
    delete props.initialContent;
    delete props.mountTarget;
    delete props.contentDidMount;
    delete props.contentDidUpdate;
    delete props.forwardedRef;

    return (
      <iframe {...props} ref={this.setRef} onLoad={this.handleLoad}>
        {this.state.iframeLoaded && this.renderFrameContents()}
      </iframe>
    );
  }
}

export const ChaiFrame = React.forwardRef<HTMLIFrameElement, FrameProps>((props, ref) => (
  <Frame {...props} forwardedRef={ref} />
));

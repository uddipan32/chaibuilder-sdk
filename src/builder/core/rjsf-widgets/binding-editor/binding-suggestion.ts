import { PluginKey, type EditorState } from "@tiptap/pm/state";
import { Extension, ReactRenderer } from "@tiptap/react";
import type { Editor, Range } from "@tiptap/react";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import { positionFixedPopup } from "~/builder/core/components/binding-popup/position";
import { BINDING_NODE_NAME } from "./binding-doc";
import { SuggestionDropdown, type SuggestionDropdownRef } from "./suggestion-dropdown";
import type { BindingSuggestionItem } from "./use-binding-suggestion-items";

type GetItems = (query: string) => BindingSuggestionItem[];

/**
 * Shared key so other extensions can ask whether the `{{` dropdown is open (and therefore
 * owns keys like Tab/Enter). One suggestion plugin per editor, so a module-level key is safe.
 */
export const BINDING_SUGGESTION_PLUGIN_KEY = new PluginKey("chaiBindingSuggestion");

/** True while the `{{` dropdown is open for the current selection. */
export const isBindingSuggestionActive = (state: EditorState): boolean =>
  BINDING_SUGGESTION_PLUGIN_KEY.getState(state)?.active === true;

const positionPopup = (popup: HTMLElement, clientRect: (() => DOMRect | null) | null | undefined) =>
  positionFixedPopup(popup, clientRect?.());

/**
 * Builds the tiptap Suggestion config that fires on `{{`. Leaf items insert a binding
 * badge; drillable (object) items re-inject `{{path.` so the dropdown re-opens with the
 * child keys. Free-form expressions are never blocked — the user can keep typing past the
 * dropdown and the tokenizer badges the result once `}}` is typed.
 */
export const createBindingSuggestion = (getItems: GetItems): Omit<SuggestionOptions, "editor"> => ({
  char: "{{",
  allowSpaces: false,
  allowedPrefixes: null,
  startOfLine: false,
  pluginKey: BINDING_SUGGESTION_PLUGIN_KEY,

  items: ({ query }) => getItems(query),

  command: ({ editor, range, props }: { editor: Editor; range: Range; props: BindingSuggestionItem }) => {
    if (props.drillable) {
      editor.chain().focus().insertContentAt(range, `{{${props.path}.`).run();
      return;
    }
    editor
      .chain()
      .focus()
      .insertContentAt(range, { type: BINDING_NODE_NAME, attrs: { expression: props.path } })
      .run();
  },

  render: () => {
    let component: ReactRenderer<SuggestionDropdownRef> | null = null;
    let popup: HTMLDivElement | null = null;

    const cleanup = () => {
      popup?.remove();
      popup = null;
      component?.destroy();
      component = null;
    };

    return {
      onStart: (props) => {
        component = new ReactRenderer(SuggestionDropdown, { props, editor: props.editor });
        if (!props.clientRect) return;
        popup = document.createElement("div");
        popup.style.position = "fixed";
        popup.style.zIndex = "2000";
        popup.appendChild(component.element);
        document.body.appendChild(popup);
        positionPopup(popup, props.clientRect);
      },
      onUpdate: (props) => {
        component?.updateProps(props);
        if (popup) positionPopup(popup, props.clientRect);
      },
      onKeyDown: (props) => {
        if (props.event.key === "Escape") {
          cleanup();
          return true;
        }
        return component?.ref?.onKeyDown(props) ?? false;
      },
      onExit: cleanup,
    };
  },
});

/**
 * Wraps the `{{` suggestion in a tiptap Extension. `getItems` is read fresh on every
 * query (pass a ref-backed closure) so late-loading page data is reflected without
 * recreating the editor.
 */
export const createBindingSuggestionExtension = (getItems: GetItems) =>
  Extension.create({
    name: "chaiBindingSuggestion",
    addProseMirrorPlugins() {
      return [Suggestion({ editor: this.editor, ...createBindingSuggestion(getItems) })];
    },
  });

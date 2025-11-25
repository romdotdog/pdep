import { Show, For, type JSX } from "solid-js";
import type { PrepProp } from "../lib/data";
import { RelatedPreps } from "./RelatedPreps";

type PropConfig = {
  key: keyof PrepProp;
  label: string;
  render?: (value: string) => JSX.Element;
};

const PROP_CONFIG: PropConfig[] = [
  { key: "cprop", label: "Complement" },
  { key: "aprop", label: "Attachment" },
  { key: "sup", label: "Supersense" },
  { key: "srtype", label: "SR Type" },
  { key: "opreps", label: "Related", render: (v) => <RelatedPreps opreps={v} /> },
  { key: "subc", label: "Subcat" },
];

export function SenseProps(props: { prop: PrepProp }) {
  return (
    <div class="sense-props">
      <For each={PROP_CONFIG}>
        {(config) => {
          const value = () => props.prop[config.key];
          return (
            <Show when={value()}>
              <div class="prop">
                <span class="prop-label">{config.label}:</span>
                <span class="prop-value">
                  {config.render ? config.render(value() as string) : value()}
                </span>
              </div>
            </Show>
          );
        }}
      </For>
    </div>
  );
}

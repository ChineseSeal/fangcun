import type { CSSProperties } from "react";

export type IconName =
  | "add"
  | "archive"
  | "arrow"
  | "bookmark"
  | "book"
  | "check"
  | "chevron"
  | "copy"
  | "download"
  | "edit"
  | "feather"
  | "filter"
  | "fullscreen"
  | "grid"
  | "heart"
  | "history"
  | "image"
  | "list"
  | "lock"
  | "play"
  | "project"
  | "redo"
  | "refresh"
  | "restore"
  | "rotate"
  | "save"
  | "search"
  | "send"
  | "shuffle"
  | "sliders"
  | "sort"
  | "stamp"
  | "star"
  | "undo"
  | "unlock"
  | "user"
  | "volume"
  | "zoom-in"
  | "zoom-out";

export function Icon({ className, name, size = 18 }: { className?: string; name: IconName; size?: number }) {
  const style: CSSProperties = {
    backgroundColor: "currentColor",
    display: "inline-block",
    flex: "0 0 auto",
    height: size,
    maskImage: `url(/icons/seal/${name}.png)`,
    maskPosition: "center",
    maskRepeat: "no-repeat",
    maskSize: "contain",
    verticalAlign: "-0.14em",
    WebkitMaskImage: `url(/icons/seal/${name}.png)`,
    WebkitMaskPosition: "center",
    WebkitMaskRepeat: "no-repeat",
    WebkitMaskSize: "contain",
    width: size,
  };

  return <span aria-hidden="true" className={className} data-icon={name} style={style} />;
}

import type { IconProps } from "@phosphor-icons/react";
import { CursorIcon } from "@phosphor-icons/react/dist/csr/Cursor";
import { HandIcon } from "@phosphor-icons/react/dist/csr/Hand";
import { NoteIcon } from "@phosphor-icons/react/dist/csr/Note";
import { TextTIcon } from "@phosphor-icons/react/dist/csr/TextT";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/csr/PencilSimple";
import { ImageIcon } from "@phosphor-icons/react/dist/csr/Image";
import { RectangleIcon } from "@phosphor-icons/react/dist/csr/Rectangle";
import { CircleIcon } from "@phosphor-icons/react/dist/csr/Circle";
import { DiamondIcon } from "@phosphor-icons/react/dist/csr/Diamond";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/csr/ArrowUpRight";
import { DotsThreeIcon } from "@phosphor-icons/react/dist/csr/DotsThree";
import { TimerIcon } from "@phosphor-icons/react/dist/csr/Timer";
import { CheckSquareIcon } from "@phosphor-icons/react/dist/csr/CheckSquare";
import { QuestionIcon } from "@phosphor-icons/react/dist/csr/Question";
import { UsersIcon } from "@phosphor-icons/react/dist/csr/Users";
import { BriefcaseIcon } from "@phosphor-icons/react/dist/csr/Briefcase";
import { SparkleIcon } from "@phosphor-icons/react/dist/csr/Sparkle";
import { EraserIcon } from "@phosphor-icons/react/dist/csr/Eraser";
import { HighlighterIcon } from "@phosphor-icons/react/dist/csr/Highlighter";
import { FrameCornersIcon } from "@phosphor-icons/react/dist/csr/FrameCorners";
import { LineSegmentIcon } from "@phosphor-icons/react/dist/csr/LineSegment";
import { ShareNetworkIcon } from "@phosphor-icons/react/dist/csr/ShareNetwork";
import { CornersOutIcon } from "@phosphor-icons/react/dist/csr/CornersOut";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { MinusIcon } from "@phosphor-icons/react/dist/csr/Minus";

const icons = {
  pointer: CursorIcon,
  hand: HandIcon,
  note: NoteIcon,
  text: TextTIcon,
  pencil: PencilSimpleIcon,
  image: ImageIcon,
  rectangle: RectangleIcon,
  ellipse: CircleIcon,
  diamond: DiamondIcon,
  arrow: ArrowUpRightIcon,
  more: DotsThreeIcon,
  timer: TimerIcon,
  checklist: CheckSquareIcon,
  help: QuestionIcon,
  people: UsersIcon,
  briefcase: BriefcaseIcon,
  sparkles: SparkleIcon,
  eraser: EraserIcon,
  highlighter: HighlighterIcon,
  frame: FrameCornersIcon,
  line: LineSegmentIcon,
  share: ShareNetworkIcon,
  fit: CornersOutIcon,
  plus: PlusIcon,
  minus: MinusIcon,
} as const;

export function SolidIcon({
  name,
  size = 20,
  ...props
}: Omit<IconProps, "weight"> & { name: keyof typeof icons }) {
  const Icon = icons[name];
  return (
    <Icon
      {...props}
      size={size}
      weight="fill"
      aria-hidden="true"
      focusable="false"
      data-solid-icon="true"
    />
  );
}

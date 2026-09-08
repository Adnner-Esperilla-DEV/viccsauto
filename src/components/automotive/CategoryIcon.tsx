import {
  IoBatteryChargingOutline,
  IoCarSportOutline,
  IoFlashOutline,
  IoHardwareChipOutline,
  IoSettingsOutline,
} from "react-icons/io5";
import type { AutomotiveProduct } from "@/interfaces";

const icons = {
  brake: IoHardwareChipOutline,
  engine: IoSettingsOutline,
  light: IoFlashOutline,
  battery: IoBatteryChargingOutline,
  body: IoCarSportOutline,
};

export function CategoryIcon({ name, className = "h-7 w-7" }: { name: AutomotiveProduct["icon"]; className?: string }) {
  const Icon = icons[name];
  return <Icon className={className} aria-hidden="true" />;
}

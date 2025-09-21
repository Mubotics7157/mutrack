import clsx from "clsx";
import { getMemberInitials } from "../lib/members";

interface ProfileAvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  ringColorClassName?: string;
  alt?: string;
}

const SIZE_CLASSES: Record<NonNullable<ProfileAvatarProps["size"]>, string> = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
  xl: "w-20 h-20 text-2xl",
  "2xl": "w-24 h-24 text-3xl",
};

export function ProfileAvatar({
  name,
  imageUrl,
  size = "md",
  className,
  ringColorClassName,
  alt,
}: ProfileAvatarProps) {
  const initials = getMemberInitials(name);
  const finalAlt = alt ?? `${name}'s profile photo`;

  return (
    <div
      className={clsx(
        "relative inline-flex items-center justify-center rounded-full bg-gradient-to-br from-sunset-orange via-accent-purple to-indigo-500 text-void-black font-semibold uppercase overflow-hidden border border-border-glass",
        SIZE_CLASSES[size],
        ringColorClassName,
        className
      )}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={finalAlt}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="relative z-10 tracking-wide">{initials}</span>
      )}
      {imageUrl && <span className="sr-only">{initials}</span>}
    </div>
  );
}

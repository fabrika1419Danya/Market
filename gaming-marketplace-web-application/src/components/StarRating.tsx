import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  reviewsCount?: number;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
}

export function StarRating({
  rating,
  reviewsCount = 0,
  size = "sm",
  showCount = true,
}: StarRatingProps) {
  const iconClass =
    size === "lg"
      ? "w-5 h-5"
      : size === "md"
        ? "w-4 h-4"
        : "w-3.5 h-3.5";

  const rounded = Math.round(rating);

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-center gap-0.5 text-amber-500">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${iconClass} ${
              star <= rounded
                ? "fill-amber-400 text-amber-500"
                : "fill-slate-100 text-slate-300"
            }`}
          />
        ))}
      </span>
      <span className="font-semibold text-slate-800 tabular-nums text-xs">
        {reviewsCount > 0 ? rating.toFixed(2) : "Новичок"}
      </span>
      {showCount && (
        <span className="text-slate-400 text-xs tabular-nums">
          ({reviewsCount})
        </span>
      )}
    </span>
  );
}

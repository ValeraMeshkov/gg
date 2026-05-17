import { memo } from "react";
import { projectileTrianglePoints } from "./projectileShape";

type ProjectileTriangleProps = {
  x: number;
  y: number;
  angle: number;
  size: number;
  fill: string;
  className?: string;
};

export const ProjectileTriangle = memo(function ProjectileTriangle({
  x,
  y,
  angle,
  size,
  fill,
  className,
}: ProjectileTriangleProps) {
  return (
    <polygon
      className={className}
      points={projectileTrianglePoints(x, y, angle, size)}
      fill={fill}
      stroke="none"
    />
  );
});

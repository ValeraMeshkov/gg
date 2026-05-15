import { MOCK_USER_2, MOCK_USER_3 } from "./mock/user";

export function projectileColors(attackerId: string): {
  fill: string;
  stroke: string;
} {
  if (attackerId === MOCK_USER_2.id) {
    return { fill: "#d95828", stroke: "#8f3014" };
  }
  if (attackerId === MOCK_USER_3.id) {
    return { fill: "#2d7a4a", stroke: "#143d24" };
  }
  return { fill: "#1e5a9e", stroke: "#0f3558" };
}

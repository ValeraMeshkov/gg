/** Продолжать залпы с клетки на цель, пока есть сила или игрок не отменил. */
export type SalvoIntent = {
  toI: number;
  attackerId: string;
};

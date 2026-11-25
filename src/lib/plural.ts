/** "1 coin", "3 coins": the count and the word that goes with it. */
export const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

export type CategoryDirection = "left" | "right";

type CategoryLike = {
  id: string;
  order: number;
};

export function moveCategoryInBoard<TCategory extends CategoryLike>(
  categories: TCategory[],
  categoryId: string,
  direction: CategoryDirection,
) {
  const currentIndex = categories.findIndex(
    (category) => category.id === categoryId,
  );

  if (currentIndex === -1) {
    return categories;
  }

  const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= categories.length) {
    return categories;
  }

  const nextCategories = [...categories];
  const [moved] = nextCategories.splice(currentIndex, 1);
  nextCategories.splice(targetIndex, 0, moved);

  return nextCategories.map((category, index) => ({
    ...category,
    order: index,
  }));
}

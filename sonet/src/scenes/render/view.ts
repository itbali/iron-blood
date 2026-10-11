/** Canvas backing-store scale relative to the logical 1280x720 view. */
export const view = { scale: 1 };

export function resetTransform(ctx: CanvasRenderingContext2D): void {
  ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
}

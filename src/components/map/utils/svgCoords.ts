/** Преобразует координаты клика в индексы клетки (viewBox карты). */
export function clientPointToMapCell(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  mapWidth: number,
  mapHeight: number,
): { x: number; y: number } | null {
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return null
  const p = pt.matrixTransform(ctm.inverse())
  const x = Math.floor(p.x)
  const y = Math.floor(p.y)
  if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) return null
  return { x, y }
}

export function clientPointToMapSpace(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return null
  const p = pt.matrixTransform(ctm.inverse())
  return { x: p.x, y: p.y }
}

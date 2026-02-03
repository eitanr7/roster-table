/**
 * Roster table skeleton – returns HTML for a loading state.
 * @param {number} rowCount - Number of skeleton rows to render
 * @param {number} [dateColumnCount=7] - Number of date/cell columns (default 7 for a week)
 * @returns {string} HTML string with inline styles and skeleton markup
 */
function skeletonTableRows(rowCount, dateColumnCount) {
  const rows = Math.max(0, Math.floor(Number(rowCount) || 0));
  const cols = Math.max(0, Math.floor(Number(dateColumnCount) || 7));

  const rowHtml = [];
  for (let r = 0; r < rows; r++) {
    const rowClass = r === 0 ? 'roster-row-first' : 'roster-row-regular';
    const cellClass = r === 0 ? 'roster-cell-first' : 'roster-cell-regular';
    const nameCell = `<td class="${rowClass} roster-cell-name" style="width:200px;height:43px;vertical-align:middle"><div style="display:flex;align-items:center;gap:12px"><div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%);background-size:200% 100%;animation:pulse-animation 1.5s ease-in-out infinite;flex-shrink:0"></div><div style="flex:1;min-width:0"><div style="height:16px;background:linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%);background-size:200% 100%;animation:pulse-animation 1.5s ease-in-out infinite;border-radius:4px;width:75%;margin-bottom:8px"></div><div style="height:12px;background:linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%);background-size:200% 100%;animation:pulse-animation 1.5s ease-in-out infinite;border-radius:4px;width:45%"></div></div></div></td>`;

    const dateCells = [];
    for (let c = 0; c < cols; c++) {
      dateCells.push(`<td class="${cellClass} roster-cell-content" style="width:200px;height:43px;vertical-align:top"><div style="height:43px;background:linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%);background-size:200% 100%;animation:pulse-animation 1.5s ease-in-out infinite;border-radius:6px"></div></td>`);
    }

    rowHtml.push(`<tr>${nameCell}${dateCells.join('')}</tr>`);
  }

  return `<div><table class="roster-table"><tbody>${rowHtml.join('')}</tbody></table></div>`;
}
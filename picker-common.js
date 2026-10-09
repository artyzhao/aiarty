export const PICKER_ROW_H = 36;

export function readCol(col) {
  const items = col.querySelectorAll(".picker-item");
  if (!items.length) return null;
  const rect = col.getBoundingClientRect();
  const center = rect.top + rect.height / 2;
  let best = null;
  let bestDist = Infinity;
  items.forEach(function (item) {
    const r = item.getBoundingClientRect();
    const dist = Math.abs(r.top + r.height / 2 - center);
    if (dist < bestDist) {
      bestDist = dist;
      best = item;
    }
  });
  return best ? best.dataset.value : null;
}

export function scrollToValue(col, value, smooth) {
  const item = col.querySelector('.picker-item[data-value="' + value + '"]');
  if (!item) return;
  const top = item.offsetTop - (col.clientHeight - item.offsetHeight) / 2;
  col.scrollTo({ top: top, behavior: smooth ? "smooth" : "auto" });
}

export function highlightCol(col) {
  const items = col.querySelectorAll(".picker-item");
  if (!items.length) return;
  const rect = col.getBoundingClientRect();
  const center = rect.top + rect.height / 2;
  items.forEach(function (item) {
    const mid = item.getBoundingClientRect().top + PICKER_ROW_H / 2;
    item.classList.toggle("is-active", Math.abs(mid - center) < PICKER_ROW_H / 2 + 1);
  });
}

export function highlightWheel(wheel) {
  wheel.querySelectorAll(".picker-col").forEach(highlightCol);
}

export function bindPickerScroll(wheel, onChange) {
  let timer = null;
  function onScroll() {
    highlightWheel(wheel);
    clearTimeout(timer);
    timer = setTimeout(function () {
      highlightWheel(wheel);
      onChange();
    }, 80);
  }
  wheel.querySelectorAll(".picker-col").forEach(function (col) {
    col.addEventListener("scroll", onScroll, { passive: true });
  });
  highlightWheel(wheel);
}

export function fillCol(col, values, selected, labelFn) {
  if (!values.length) return null;
  if (values.indexOf(selected) < 0) selected = values[0];
  col.innerHTML = "";
  values.forEach(function (v) {
    const div = document.createElement("div");
    div.className = "picker-item";
    div.dataset.value = v;
    div.textContent = labelFn ? labelFn(v) : v;
    col.appendChild(div);
  });
  requestAnimationFrame(function () {
    scrollToValue(col, selected, false);
    highlightCol(col);
  });
  return selected;
}

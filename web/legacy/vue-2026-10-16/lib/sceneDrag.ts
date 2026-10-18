import { ref, onBeforeUnmount } from 'vue';
export type SceneToken = {
  kind: 'item' | 'money' | 'basket';
  id?: string;
  cents?: number;
  from?: 'shelf' | 'basket' | 'wallet' | 'paid';
};
export function useSceneDrag(
  drop: (token: SceneToken, zone: string) => void,
  enabled: () => boolean,
) {
  const dragging = ref<{ token: SceneToken; x: number; y: number; moved: boolean } | null>(null),
    hover = ref('');
  let pointer = -1,
    origin = [0, 0],
    element: HTMLElement | null = null,
    suppressClick = false;
  function zoneAt(x: number, y: number) {
    return (
      document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-dropzone]')?.dataset.dropzone ||
      ''
    );
  }
  function start(event: PointerEvent, token: SceneToken) {
    if (!enabled() || event.isPrimary === false || event.button > 0) return;
    suppressClick = false;
    pointer = event.pointerId;
    origin = [event.clientX, event.clientY];
    element = event.currentTarget as HTMLElement;
    dragging.value = { token, x: event.clientX, y: event.clientY, moved: false };
    try {
      element.setPointerCapture(pointer);
    } catch {
      /* pointer capture may not be available */
    }
  }
  function move(event: PointerEvent) {
    if (event.pointerId !== pointer || !dragging.value) return;
    const moved =
      dragging.value.moved || Math.hypot(event.clientX - origin[0], event.clientY - origin[1]) > 7;
    dragging.value = { ...dragging.value, x: event.clientX, y: event.clientY, moved };
    if (moved) {
      event.preventDefault();
      hover.value = zoneAt(event.clientX, event.clientY);
    }
  }
  function cleanup() {
    if (element?.hasPointerCapture?.(pointer)) {
      element.releasePointerCapture(pointer);
    }
    pointer = -1;
    dragging.value = null;
    hover.value = '';
    element = null;
  }
  function end(event: PointerEvent) {
    if (event.pointerId !== pointer || !dragging.value) return;
    const active = dragging.value;
    const zone = zoneAt(event.clientX, event.clientY);
    suppressClick = active.moved;
    window.setTimeout(() => {
      suppressClick = false;
    }, 0);
    cleanup();
    if (active.moved && enabled()) drop(active.token, zone);
  }
  function cancel() {
    if (pointer === -1) return;
    suppressClick = false;
    cleanup();
  }
  function consumeClick() {
    if (suppressClick) {
      suppressClick = false;
      return true;
    }
    return false;
  }
  onBeforeUnmount(cancel);
  return { dragging, hover, start, move, end, cancel, consumeClick };
}

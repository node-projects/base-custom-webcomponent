type ContextMenuHandlers = {
    touchStart: (event: Event) => void;
    touchEnd: () => void;
};

const handlers = new WeakMap<Element, Map<(event: Event) => void, ContextMenuHandlers>>();

export function addTouchFriendlyContextMenu(element: Element, callback: (e: Event) => void) {
    removeTouchFriendlyContextMenu(element, callback);

    let timeout: ReturnType<typeof setTimeout>;
    const touchEnd = () => {
        clearTimeout(timeout);
    };
    const touchStart = (event: Event) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            timeout = undefined;
            callback(event);
        }, 500);
    };

    element.addEventListener('touchstart', touchStart);
    element.addEventListener('contextmenu', callback);
    window.addEventListener('touchend', touchEnd);
    window.addEventListener('touchcancel', touchEnd);

    let elementHandlers = handlers.get(element);
    if (!elementHandlers) {
        elementHandlers = new Map();
        handlers.set(element, elementHandlers);
    }
    elementHandlers.set(callback, { touchStart, touchEnd });
}

export function removeTouchFriendlyContextMenu(element: Element, callback: (e: Event) => void) {
    const elementHandlers = handlers.get(element);
    const entry = elementHandlers?.get(callback);
    if (!entry)
        return;

    entry.touchEnd();
    element.removeEventListener('touchstart', entry.touchStart);
    element.removeEventListener('contextmenu', callback);
    window.removeEventListener('touchend', entry.touchEnd);
    window.removeEventListener('touchcancel', entry.touchEnd);

    elementHandlers.delete(callback);
    if (elementHandlers.size === 0)
        handlers.delete(element);
}

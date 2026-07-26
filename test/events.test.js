import {
    BaseCustomWebComponentConstructorAppend,
    TypedEvent,
    addTouchFriendlyContextMenu,
    html,
    removeTouchFriendlyContextMenu,
} from '../dist/index.js';
import { equal, nextMicrotask } from './assertions.js';

describe('event helpers', () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    it('binds named DOM event handlers to the component instance', async () => {
        class NamedEventElement extends BaseCustomWebComponentConstructorAppend {
            static template = html`<button id="action" @click="handleClick">Run</button>`;

            clickCount = 0;

            ready() {
                this._assignEvents();
            }

            handleClick() {
                this.clickCount++;
            }
        }

        customElements.define('bcw-named-event', NamedEventElement);

        const element = document.createElement('bcw-named-event');
        await nextMicrotask();

        element.shadowRoot.getElementById('action').click();
        equal(element.clickCount, 1);
    });

    it('subscribes named handlers to TypedEvent properties', async () => {
        class EventSource extends HTMLElement {
            changed = new TypedEvent();
        }
        customElements.define('bcw-event-source', EventSource);

        class TypedEventElement extends BaseCustomWebComponentConstructorAppend {
            static template = html`<bcw-event-source id="source" @changed="handleChanged"></bcw-event-source>`;

            received;

            ready() {
                this._assignEvents();
            }

            handleChanged(value) {
                this.received = value;
            }
        }

        customElements.define('bcw-typed-event-listener', TypedEventElement);

        const element = document.createElement('bcw-typed-event-listener');
        await nextMicrotask();

        element.shadowRoot.getElementById('source').changed.emit('payload');
        equal(element.received, 'payload');
    });

    it('removes both native and touch-friendly context-menu listeners', () => {
        const target = document.createElement('div');
        let calls = 0;
        const callback = () => calls++;

        addTouchFriendlyContextMenu(target, callback);
        addTouchFriendlyContextMenu(target, callback);
        target.dispatchEvent(new Event('contextmenu'));
        equal(calls, 1, 'registering the same callback twice must not duplicate it');

        removeTouchFriendlyContextMenu(target, callback);
        target.dispatchEvent(new Event('contextmenu'));
        target.dispatchEvent(new Event('touchstart'));
        window.dispatchEvent(new Event('touchend'));
        equal(calls, 1, 'removed handlers must not receive later events');
    });
});

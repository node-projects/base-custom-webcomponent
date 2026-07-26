import {
    BaseCustomWebComponentConnectedReady,
    BaseCustomWebComponentConstructorAppend,
    BaseCustomWebComponentConstructorAppendLazyReady,
    BaseCustomWebComponentLazyAppend,
    html,
} from '../dist/BaseCustomWebComponent.js';
import { equal, nextFrame, nextMicrotask } from './assertions.js';

describe('component lifecycle variants', () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    it('appends synchronously and schedules setup and ready for the constructor variant', async () => {
        let readyCalls = 0;
        let setupCalls = 0;

        class ConstructorElement extends BaseCustomWebComponentConstructorAppend {
            static template = html`<p id="content">ready</p>`;

            oneTimeSetup() {
                setupCalls++;
            }

            ready() {
                readyCalls++;
            }
        }

        customElements.define('bcw-constructor-lifecycle', ConstructorElement);

        const first = document.createElement('bcw-constructor-lifecycle');
        equal(first.shadowRoot.getElementById('content').textContent, 'ready');
        equal(readyCalls, 0, 'ready must not run in the constructor call stack');
        equal(setupCalls, 0, 'oneTimeSetup must not run in the constructor call stack');

        await nextMicrotask();
        equal(readyCalls, 1);
        equal(setupCalls, 1);

        document.createElement('bcw-constructor-lifecycle');
        await nextMicrotask();
        equal(readyCalls, 2, 'ready runs once for each instance');
        equal(setupCalls, 1, 'oneTimeSetup runs once for the subclass');
    });

    it('defers both template attachment and ready for the lazy append variant', async () => {
        let readyCalls = 0;

        class LazyElement extends BaseCustomWebComponentLazyAppend {
            static template = html`<p id="content">lazy</p>`;

            ready() {
                readyCalls++;
            }
        }

        customElements.define('bcw-lazy-lifecycle', LazyElement);

        const element = document.createElement('bcw-lazy-lifecycle');
        equal(element.shadowRoot.childNodes.length, 0);
        equal(readyCalls, 0);

        await nextMicrotask();
        equal(element.shadowRoot.getElementById('content').textContent, 'lazy');
        equal(readyCalls, 1);
    });

    it('runs ready on first connection only for the connected variant', () => {
        let readyCalls = 0;

        class ConnectedElement extends BaseCustomWebComponentConnectedReady {
            static template = html`<p id="content">connected</p>`;

            ready() {
                readyCalls++;
            }
        }

        customElements.define('bcw-connected-lifecycle', ConnectedElement);

        const element = document.createElement('bcw-connected-lifecycle');
        equal(element.shadowRoot.getElementById('content').textContent, 'connected');
        equal(readyCalls, 0);

        document.body.append(element);
        equal(readyCalls, 1);

        element.remove();
        document.body.append(element);
        equal(readyCalls, 1, 'reconnection must not call ready again');
    });

    it('defers ready until an animation frame for the lazy-ready variant', async () => {
        let readyCalls = 0;

        class AnimationFrameElement extends BaseCustomWebComponentConstructorAppendLazyReady {
            static template = html`<p>frame</p>`;

            ready() {
                readyCalls++;
            }
        }

        customElements.define('bcw-animation-frame-lifecycle', AnimationFrameElement);

        document.createElement('bcw-animation-frame-lifecycle');
        await nextMicrotask();
        equal(readyCalls, 0);

        await nextFrame();
        equal(readyCalls, 1);
    });
});

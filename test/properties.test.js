import {
    BaseCustomWebComponentConstructorAppend,
    html,
} from '../dist/BaseCustomWebComponent.js';
import { deepEqual, equal, nextMicrotask } from './assertions.js';

describe('property and attribute handling', () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    it('converts declared attributes to their configured property types', async () => {
        class AttributeElement extends BaseCustomWebComponentConstructorAppend {
            static template = html``;
            static properties = {
                title: String,
                pageSize: Number,
                enabled: Boolean,
                options: Object,
                items: Array,
            };

            title = 'default';
            pageSize = 0;
            enabled = false;
            options = {};
            items = [];

            constructor() {
                super();
                this._restoreCachedInititalValues();
            }

            ready() {
                this._parseAttributesToProperties();
            }
        }

        customElements.define('bcw-attribute-conversion', AttributeElement);

        const element = document.createElement('bcw-attribute-conversion');
        element.setAttribute('title', 'Overview');
        element.setAttribute('page-size', '12.5');
        element.setAttribute('enabled', '');
        element.setAttribute('options', '{"compact":true}');
        element.setAttribute('items', '["a","b"]');

        await nextMicrotask();

        equal(element.title, 'Overview');
        equal(element.pageSize, 12.5);
        equal(element.enabled, true);
        deepEqual(element.options, { compact: true });
        deepEqual(element.items, ['a', 'b']);
    });

    it('restores a property assigned before custom-element upgrade', () => {
        const element = document.createElement('bcw-pre-upgrade-property');
        element.value = 42;
        document.body.append(element);

        class PreUpgradeElement extends BaseCustomWebComponentConstructorAppend {
            static template = html``;
            static properties = {
                value: Number,
            };

            value = 1;

            constructor() {
                super();
                this._restoreCachedInititalValues();
            }
        }

        customElements.define('bcw-pre-upgrade-property', PreUpgradeElement);

        equal(element.value, 42);
        equal(element instanceof PreUpgradeElement, true);
    });

    it('parses attributes as a snapshot until parsing is requested again', async () => {
        class SnapshotElement extends BaseCustomWebComponentConstructorAppend {
            static template = html``;
            static properties = {
                label: String,
            };

            label = 'initial';

            constructor() {
                super();
                this._restoreCachedInititalValues();
            }

            ready() {
                this._parseAttributesToProperties();
            }
        }

        customElements.define('bcw-attribute-snapshot', SnapshotElement);

        const element = document.createElement('bcw-attribute-snapshot');
        element.setAttribute('label', 'first');
        await nextMicrotask();
        equal(element.label, 'first');

        element.setAttribute('label', 'second');
        equal(element.label, 'first');

        element._parseAttributesToProperties();
        equal(element.label, 'second');
    });
});

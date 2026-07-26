import {
    BaseCustomWebComponentConstructorAppend,
    html,
} from '../dist/BaseCustomWebComponent.js';
import { deepEqual, equal, nextMicrotask } from './assertions.js';

describe('binding engine', () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    it('updates text, property, attribute, boolean, class, style, and visibility targets', async () => {
        class BindingTargetsElement extends BaseCustomWebComponentConstructorAppend {
            static template = html`
                <span id="text">[[this.message]]</span>
                <input id="property" .value="[[this.inputValue]]">
                <div id="attribute" $data-state="[[this.message]]"></div>
                <button id="boolean" ?disabled="[[this.disabled]]">Save</button>
                <div id="class" class:selected="[[this.selected]]"></div>
                <div id="style" css:color="[[this.accent]]"></div>
                <div id="visibility" style="display:grid" bcw:visible="[[this.visible]]"></div>
            `;

            message = 'initial';
            inputValue = 'first';
            disabled = false;
            selected = false;
            accent = 'rgb(0, 0, 255)';
            visible = true;

            ready() {
                this._bindingsParse();
            }
        }

        customElements.define('bcw-binding-targets', BindingTargetsElement);

        const element = document.createElement('bcw-binding-targets');
        await nextMicrotask();

        const get = id => element.shadowRoot.getElementById(id);
        equal(get('text').textContent, 'initial');
        equal(get('property').value, 'first');
        equal(get('attribute').getAttribute('data-state'), 'initial');
        equal(get('boolean').hasAttribute('disabled'), false);
        equal(get('class').classList.contains('selected'), false);
        equal(get('style').style.color, 'rgb(0, 0, 255)');
        equal(get('visibility').style.display, 'grid');

        element.message = 'updated';
        element.inputValue = 'second';
        element.disabled = true;
        element.selected = true;
        element.accent = 'rgb(255, 0, 0)';
        element.visible = false;
        element._bindingsRefresh();

        equal(get('text').textContent, 'updated');
        equal(get('property').value, 'second');
        equal(get('attribute').getAttribute('data-state'), 'updated');
        equal(get('boolean').hasAttribute('disabled'), true);
        equal(get('class').classList.contains('selected'), true);
        equal(get('style').style.color, 'rgb(255, 0, 0)');
        equal(get('visibility').style.display, 'none');
    });

    it('writes values back through a two-way property binding', async () => {
        class TwoWayElement extends BaseCustomWebComponentConstructorAppend {
            static template = html`
                <input id="editor" .value="{{this.message}}">
                <span id="preview">[[this.message]]</span>
            `;

            message = 'before';

            ready() {
                this._bindingsParse();
            }
        }

        customElements.define('bcw-two-way-binding', TwoWayElement);

        const element = document.createElement('bcw-two-way-binding');
        await nextMicrotask();

        const editor = element.shadowRoot.getElementById('editor');
        editor.value = 'after';
        editor.dispatchEvent(new Event('input'));

        equal(element.message, 'after');

        element._bindingsRefresh();
        equal(element.shadowRoot.getElementById('preview').textContent, 'after');
    });

    it('adds and removes conditional and repeated template content', async () => {
        class TemplateBindingElement extends BaseCustomWebComponentConstructorAppend {
            static template = html`
                <template if="[[this.showDetails]]">
                    <p data-detail>Visible detail</p>
                </template>
                <template repeat:item="[[this.items]]">
                    <p class="row">[[item]]</p>
                </template>
            `;

            showDetails = true;
            items = ['alpha', 'beta'];

            ready() {
                this._bindingsParse();
            }
        }

        customElements.define('bcw-template-bindings', TemplateBindingElement);

        const element = document.createElement('bcw-template-bindings');
        await nextMicrotask();

        equal(element.shadowRoot.querySelectorAll('[data-detail]').length, 1);
        deepEqual(
            Array.from(element.shadowRoot.querySelectorAll('.row'), row => row.textContent),
            ['alpha', 'beta'],
        );

        element.showDetails = false;
        element.items = ['gamma'];
        element._bindingsRefresh();

        equal(element.shadowRoot.querySelectorAll('[data-detail]').length, 0);
        deepEqual(
            Array.from(element.shadowRoot.querySelectorAll('.row'), row => row.textContent),
            ['gamma'],
        );

        element.showDetails = true;
        element.items = [];
        element._bindingsRefresh();

        equal(element.shadowRoot.querySelectorAll('[data-detail]').length, 1);
        equal(element.shadowRoot.querySelectorAll('.row').length, 0);
    });

    it('refreshes only bindings that depend on the requested property', async () => {
        class TargetedRefreshElement extends BaseCustomWebComponentConstructorAppend {
            static template = html`
                <span id="first">[[this.first]]</span>
                <span id="second">[[this.second]]</span>
                <span id="computed">[[this.computedLabel()]]</span>
            `;

            _first = 'first-1';
            _second = 'second-1';
            firstReads = 0;
            secondReads = 0;
            computedReads = 0;

            get first() {
                this.firstReads++;
                return this._first;
            }

            get second() {
                this.secondReads++;
                return this._second;
            }

            computedLabel() {
                this.computedReads++;
                return `${this._first}/${this._second}`;
            }

            ready() {
                this._bindingsParse();
            }
        }

        customElements.define('bcw-targeted-refresh', TargetedRefreshElement);

        const element = document.createElement('bcw-targeted-refresh');
        await nextMicrotask();

        equal(element.firstReads, 1);
        equal(element.secondReads, 1);
        equal(element.computedReads, 1);

        element._first = 'first-2';
        element._second = 'second-2';
        element._bindingsRefresh('first');

        equal(element.firstReads, 2, 'the selected direct dependency must rerun');
        equal(element.secondReads, 1, 'an unrelated direct dependency must be skipped');
        equal(element.computedReads, 2, 'method expressions remain conservatively subscribed');
        equal(element.shadowRoot.getElementById('first').textContent, 'first-2');
        equal(element.shadowRoot.getElementById('second').textContent, 'second-1');

        element._bindingsRefresh();
        equal(element.secondReads, 2, 'an unscoped refresh must retain the legacy refresh-all behavior');
        equal(element.shadowRoot.getElementById('second').textContent, 'second-2');
    });

    it('reuses and moves repeat instances by item identity', async () => {
        class ReconciledRepeatElement extends BaseCustomWebComponentConstructorAppend {
            static template = html`
                <template
                    repeat:item="[[this.items]]"
                    repeat-changed-item-callback="[[this.itemChanged(item, nodes, callbackType)]]"
                >
                    <button class="row">[[index + ':' + item.label]]</button>
                </template>
            `;

            first = { label: 'first' };
            second = { label: 'second' };
            third = { label: 'third' };
            items = [this.first, this.second, this.third];
            changes = [];

            ready() {
                this._bindingsParse();
            }

            itemChanged(item, nodes, callbackType) {
                this.changes.push({ item, nodes, callbackType });
            }
        }

        customElements.define('bcw-reconciled-repeat', ReconciledRepeatElement);

        const element = document.createElement('bcw-reconciled-repeat');
        await nextMicrotask();

        const initialRows = Array.from(element.shadowRoot.querySelectorAll('.row'));
        const initialBindingCount = element._bindings.length;
        equal(element.changes.length, 3);
        deepEqual(initialRows.map(row => row.textContent), ['0:first', '1:second', '2:third']);

        element.items = [element.third, element.first, element.second];
        element._bindingsRefresh('items');

        const reorderedRows = Array.from(element.shadowRoot.querySelectorAll('.row'));
        equal(reorderedRows[0], initialRows[2], 'the third item node must move instead of being recreated');
        equal(reorderedRows[1], initialRows[0], 'the first item node must move instead of being recreated');
        equal(reorderedRows[2], initialRows[1], 'the second item node must move instead of being recreated');
        deepEqual(reorderedRows.map(row => row.textContent), ['0:third', '1:first', '2:second']);
        equal(element.changes.length, 3, 'pure reordering must not emit create/remove callbacks');
        equal(element._bindings.length, initialBindingCount, 'reordering must not register duplicate bindings');

        const added = { label: 'added' };
        element.items = [element.third, added, element.first];
        element._bindingsRefresh('items');

        const changedRows = Array.from(element.shadowRoot.querySelectorAll('.row'));
        equal(changedRows[0], initialRows[2]);
        equal(changedRows[2], initialRows[0]);
        equal(initialRows[1].isConnected, false, 'removed item nodes must be detached');
        deepEqual(changedRows.map(row => row.textContent), ['0:third', '1:added', '2:first']);
        deepEqual(
            element.changes.slice(3).map(change => change.callbackType).sort(),
            ['create', 'remove'],
        );
        equal(element._bindings.length, initialBindingCount, 'replacement must dispose the removed instance bindings');
    });
});

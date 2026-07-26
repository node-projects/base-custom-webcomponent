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
});

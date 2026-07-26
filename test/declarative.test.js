import '../dist/DeclaritiveBaseCustomWebcomponent.js';
import { equal, nextMicrotask } from './assertions.js';

describe('declarative custom elements', () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    it('defines a bound element with typed, reflected, repeated, and upgradable content', async () => {
        const definitions = document.createElement('div');
        definitions.innerHTML = `
            <node-projects-dce
                id="definition"
                name="bcw-declarative-card"
                enable-bindings
                properties='{
                    "message":{"type":"String","reflect":true,"default":"fallback"},
                    "items":"Array",
                    "active":{"type":"Boolean","reflect":true}
                }'
            >
                <template>
                    <p id="message" bcw:text="[[this.message]]"></p>
                    <template repeat:item="[[this.items]]">
                        <span class="item">[[text:item]]</span>
                    </template>
                </template>
                <style type="adopted-css">:host { display: block; }</style>
            </node-projects-dce>
        `;
        document.body.append(definitions);

        const definition = definitions.querySelector('#definition');
        const element = document.createElement('bcw-declarative-card');
        element.setAttribute('message', '<strong>literal</strong>');
        element.setAttribute('items', '["first","second"]');
        element.setAttribute('active', '');
        document.body.append(element);
        await nextMicrotask();

        equal(element.message, '<strong>literal</strong>');
        equal(element.active, true);
        equal(element.shadowRoot.getElementById('message').textContent, '<strong>literal</strong>');
        equal(element.shadowRoot.getElementById('message').querySelector('strong'), null);
        equal(element.shadowRoot.querySelectorAll('.item').length, 2);
        equal(element.shadowRoot.querySelectorAll('.item')[1].textContent, 'second');
        equal(element.shadowRoot.adoptedStyleSheets.length, 1);

        let changeDetail;
        element.addEventListener('message-changed', event => {
            changeDetail = event.detail;
        });
        element.message = 'updated';
        equal(element.getAttribute('message'), 'updated');
        equal(element.shadowRoot.getElementById('message').textContent, 'updated');
        equal(changeDetail.newValue, 'updated');

        element.active = false;
        equal(element.hasAttribute('active'), false);

        const replacement = document.createElement('template');
        replacement.innerHTML = '<h2 id="replacement">[[text:this.message]]</h2>';
        definition.upgradeAllInstances(replacement);
        equal(element.shadowRoot.getElementById('replacement').textContent, 'updated');
        equal(element.shadowRoot.getElementById('message'), null);
    });

    it('supports shorthand string property declarations', async () => {
        const definitions = document.createElement('div');
        definitions.innerHTML = `
            <node-projects-dce
                name="bcw-declarative-shorthand"
                properties="title, subtitle"
            >
                <template><slot></slot></template>
            </node-projects-dce>
        `;
        document.body.append(definitions);

        const element = document.createElement('bcw-declarative-shorthand');
        element.setAttribute('title', 'Primary');
        element.setAttribute('subtitle', 'Secondary');
        document.body.append(element);
        await nextMicrotask();

        equal(element.title, 'Primary');
        equal(element.subtitle, 'Secondary');
        equal(element.shadowRoot.querySelector('slot') !== null, true);
    });

    it('reuses the registered constructor when a definition is replaced', async () => {
        const firstContainer = document.createElement('div');
        firstContainer.innerHTML = `
            <node-projects-dce name="bcw-redefined-element" properties="title">
                <template><p id="first">First template</p></template>
            </node-projects-dce>
        `;
        document.body.append(firstContainer);

        const firstInstance = document.createElement('bcw-redefined-element');
        firstInstance.setAttribute('title', 'Existing');
        document.body.append(firstInstance);
        await nextMicrotask();
        equal(firstInstance.shadowRoot.getElementById('first').textContent, 'First template');

        const registeredConstructor = customElements.get('bcw-redefined-element');
        const secondContainer = document.createElement('div');
        secondContainer.innerHTML = `
            <node-projects-dce name="bcw-redefined-element" properties="title">
                <template><p id="second">Second template</p></template>
            </node-projects-dce>
        `;
        document.body.append(secondContainer);

        const secondInstance = document.createElement('bcw-redefined-element');
        secondInstance.setAttribute('title', 'New');
        document.body.append(secondInstance);
        await nextMicrotask();

        equal(customElements.get('bcw-redefined-element'), registeredConstructor);
        equal(secondInstance.shadowRoot.getElementById('second').textContent, 'Second template');

        secondContainer.querySelector('node-projects-dce').upgradeAllInstances();
        equal(firstInstance.shadowRoot.getElementById('second').textContent, 'Second template');
    });
});

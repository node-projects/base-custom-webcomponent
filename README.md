# base-custom-webcomponent

## Description

A simple base class for custom webcomponents.
Also some often needed helper methods.

## Features

 - CSS Reusage vie AdoptedStyleSheets
 - Simple Binding Framework

All the features are not enabled by default for perfomance reasons.

this._parseAttributesToProperties(); ==> parses all attributes to the defined properties

this._bindingsParse(); ==> parses and enables bindings
this._createObservableProperties(); ==> creates getters/setters for each property and calls this._bingsRefresh() in each setter;

## Developing

  * Install dependencies
```
  $ npm install
```

  * Compile Typescript after doing changes
```
  $ npm run build
```

## Dependencies

none on chrome.

construct-style-sheets-polyfill on safari and firefox 

## Using

Simple Example Class in Typescript

```
import { BaseCustomWebComponentConstructorAppend, html } from '@node-projects/base-custom-webcomponent';

@customElement('test-element')
export class TestElement extends BaseCustomWebComponentConstructorAppend {

    static readonly style = css`
        `;

    static readonly template = html`
            <div id='root'>
                <div css:background="[[this.bprp ? 'red' : 'green']]">[[this.info]]</div>
                <template repeat:item="[[this.list]]">
                    <div>[[item]]</div><br>
                </template>
            </div>
            <button @click="buttonClick">click me</button>
        `;
    
    @property()
    list = ['aa', 'bb'];
    @property()
    info = 'hallo';
    @property()
    bprp = false;

    async ready() {
        this._root = this._getDomElement<HTMLDivElement>('root');
        this._createObservableProperties();
        this._parseAttributesToProperties();
        this._bindingsParse();
        this._assignEvents();

        setTimeout(() => {
            this.info = 'wie gehts?';
            brpp = true;
        }, 5000)
    }

    buttonClick() {
        alert('hallo');
    }
}

```
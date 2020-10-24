# base-custom-webcomponent

## Description

A simple base class for custom webcomponents.
Also some often needed helper methods.

## Dependecies

If you use Firefox od Safari you need the constructible stylesheets polyfill
https://github.com/calebdwilliams/construct-style-sheets

## Features

All the features are not enabled by default for perfomance reasons.

 - this._parseAttributesToProperties(); ==> parses all attributes to the defined properties
 - this._assignEvents(); ==> parses @event bindings to callbacks in class
 - this._bindingsParse(); ==> parses and enables bindings
 - this._createObservableProperties(); ==> creates getters/setters for each property and calls this._bingsRefresh() in each setter;

## Bindings

The Bindings are heavily inspired by polymer

use [[expression]] for one way bindings

use {{this.property:change;paste}} for two wa bindings wich listens to events 'change 'and 'paste'

css:cssPropertyName=[[expression]] to bind to a css property

class:className=[[boolExpression]] to set/remove a css class

sub <template></template> elements are not bound, so elemnts like <iron-list> of polymer also work

use repeat:nameOfItem=[[enumerableExpression]] on a Template Element to repeate it for every instance of the enumerable

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
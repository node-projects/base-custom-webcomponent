# base-custom-webcomponent

## Description

The base-custom-webcomponent is a simple base class for the use of webcomponents in typescript. It wraps the needed basic functionality and also allows you to optionally use some advanced technics like
- set attribute into property 
- two-way binding

## Basic Feature
The base class does:
- registers the html tag
- creates the shadow dom
- imports the css and html into the shadow dom
- gives access to the dom elements with helping functions
- informs about startup 
  - oneTimeSetup()
  - ready()


## Advanced Features

All the features are not enabled by default for performance reasons but you can call these methods to enable them. 

 - this._parseAttributesToProperties(); ==> parses all attributes to the defined properties
 - this._assignEvents(); ==> parses @event bindings to callbacks in class
 - this._bindingsParse(); ==> parses and enables bindings
 - this._createObservableProperties(); ==> creates getters/setters for each property and calls this._bingsRefresh() in each setter;

## Bindings

The Bindings are heavily inspired by polymer

use [[expression]] for one way bindings

use {{this.property::change;paste}} for two way bindings which listens to events 'change 'and 'paste'

css:cssPropertyName=[[expression]] to bind to a css property

class:className=[[boolExpression]] to set/remove a css class

sub <template></template> elements are not bound, so elements like <iron-list> of polymer also work

use repeat:nameOfItem=[[enumerableExpression]] on a Template Element to repeat it for every instance of the enumerable.
You could also use 'index' variable in the repeat binding for the current number. The attribute "repeat-index" could be used to change the name of the index variable.
on a repeat you could use the repeat-changed-item-callback="[[this.itemCreated(item, nodes)]]

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

## Online Sample

https://codesandbox.io/s/base-custom-webcomponent-wkopk?file=/src/test-element.ts

## ready method
The ready method will be called, when the component is connected the first time. Be aware, that there is no information about the child components. They could be still not ready. When you need to interact with child componets, then use the method _waitForChildrenReady.

```
  public async ready(): Promise<void> {
          await this._waitForChildrenReady();
          // now all children are ready!
          
          const myChild = this._getDomElement<CustomAutoCompleteBoxComponent>('XYZ');
  
```

## Articles 

https://medium.com/@jochenkhner/a-idea-for-a-base-class-for-web-components-in-2020-b68e0fdf7bca

## Size

The Size of the Base Component is around 25k as ts/js code, 10k minimized and 2.2k brotly compressed.

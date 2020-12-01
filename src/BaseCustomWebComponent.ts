export const html = function (strings: TemplateStringsArray, ...values: any[]): HTMLTemplateElement {
    const template = document.createElement('template');
    template.innerHTML = strings.raw[0];
    return template;
};

export const htmlFromString = function (value: string): HTMLTemplateElement {
    const template = document.createElement('template');
    template.innerHTML = value;
    return template;
};

export const css = function (strings: TemplateStringsArray, ...values: any[]): CSSStyleSheet {
    const cssStyleSheet = new CSSStyleSheet();
    //@ts-ignore
    cssStyleSheet.replaceSync(strings.raw[0]);
    return cssStyleSheet;
};

export const cssFromString = function (value: string): CSSStyleSheet {
    const cssStyleSheet = new CSSStyleSheet();
    //@ts-ignore
    cssStyleSheet.replaceSync(value);
    return cssStyleSheet;
};

export const cssAsync = async function (strings: TemplateStringsArray, ...values: any[]): Promise<CSSStyleSheet> {
    const cssStyleSheet = new CSSStyleSheet();
    //@ts-ignore
    await cssStyleSheet.replace(strings.raw[0]);
    return cssStyleSheet;
};

type propertySimpleDefinition = BooleanConstructor | DateConstructor | NumberConstructor | StringConstructor | ArrayConstructor | ObjectConstructor //| Object //| (new (...args: any[]) => object)
type propertyComplexDefinition = { type: propertySimpleDefinition, observer: string | ((val: {}, old: {}) => void); };
type propertyDefinition = propertyComplexDefinition | propertySimpleDefinition;

// decorators
export function property(par?: propertyDefinition) {
    return function (target: Object, propertyKey: PropertyKey) {
        //@ts-ignore
        if (!target.constructor.properties) {
            //@ts-ignore
            target.constructor.properties = {};
        }
        if (par && ((<propertyComplexDefinition>par).type != null || (<propertyComplexDefinition>par).observer != null)) {
            if ((<propertyComplexDefinition>par).observer) {
                //todo
                //_createObservableProperty
            }
            //@ts-ignore
            target.constructor.properties[propertyKey] = (<propertyComplexDefinition>par).type ? (<propertyComplexDefinition>par).type : String;
        }
        else {
            //@ts-ignore
            target.constructor.properties[propertyKey] = par ? par : String;
        }
    }
}

export function customElement(tagname: string) {
    return function (class_: (new (...par) => BaseCustomWebComponentNoAttachedTemplate)) {
        //@ts-ignore
        class_.is = tagname;

        customElements.define(tagname, class_);
    }
}

const internalPrefix = '___';

type repeatBindingItem = { name: string, item: any }

export class BaseCustomWebComponentNoAttachedTemplate extends HTMLElement {
    static readonly style: CSSStyleSheet | Promise<CSSStyleSheet>;
    static readonly template: HTMLTemplateElement;

    protected _bindings: ((firstRun?: boolean) => void)[];

    //@ts-ignore
    private static _bindingRegex = /\[\[.*?\]\]/g;

    protected _getDomElement<T extends Element>(id: string): T {
        if (this.shadowRoot.children.length > 0)
            return <T>(<any>this.shadowRoot.getElementById(id));
        return <T>(<any>this._rootDocumentFragment.getElementById(id));
    }

    protected _getDomElements<T extends Element>(selector: string): T[] {
        if (this.shadowRoot.children.length > 0)
            return <T[]>(<any>this.shadowRoot.querySelectorAll(selector));
        return <T[]>(<any>this._rootDocumentFragment.querySelectorAll(selector));
    }

    protected _assignEvents(node?: Node) {
        if (!node) {
            node = this.shadowRoot.children.length > 0 ? this.shadowRoot : this._rootDocumentFragment;
        }
        if (node instanceof Element) {
            for (let a of node.attributes) {
                if (a.name.startsWith('@') && !a.value.startsWith('[[')) {
                    //node.removeAttribute(a.name);
                    try {
                        node.addEventListener(a.name.substr(1), this[a.value].bind(this));
                    } catch (error) {
                        console.warn((<Error>error).message, 'Failed to attach event "', a, node);
                    }
                }
            }
        }
        for (let n of node.childNodes) {
            this._assignEvents(n);
        }
    }

    /**
     * Parses Polymer like Bindings
     * 
     * use [[expression]] for one way bindings
     * 
     * use {{this.property:change;paste}} for two way wich binds to events 'change 'and 'paste'
     * 
     * use @eventname=[[this.eventHandler]] to bind a handler to a event
     * 
     * use css:cssPropertyName=[[expression]] to bind to a css property
     * 
     * use class:className=[[boolExpression]] to set/remove a css class
     * 
     * sub <template></template> elements are not bound, so elemnts like <iron-list> of polymer also work
     * 
     * use repeat:nameOfItem=[[enumerableExpression]] on a Template Element to repeate it for every instance of the enumarable
     * ==> this could also be nested
     * 
     */
    protected _bindingsParse(node?: Node, removeAttributes = false) {
        this._bindingsInternalParse(node, null, removeAttributes);
    }

    private _bindingsInternalParse(node: Node, repeatBindingItems: repeatBindingItem[], removeAttributes) {
        if (!this._bindings)
            this._bindings = [];
        if (!node)
            node = this.shadowRoot.children.length > 0 ? this.shadowRoot : this._rootDocumentFragment;
        if (node instanceof Element) {
            let attributes = Array.from(node.attributes);
            for (let a of attributes) {
                if (a.name.startsWith('css:') && a.value.startsWith('[[') && a.value.endsWith(']]')) {
                    let value = a.value.substring(2, a.value.length - 2).replaceAll('&amp;', '&');
                    let camelCased = a.name.substring(4, a.name.length).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                    this._bindings.push(() => this._bindingSetElementCssValue(<HTMLElement | SVGElement>node, camelCased, value, repeatBindingItems));
                    this._bindings[this._bindings.length - 1]();
                } else if (a.name.startsWith('class:') && a.value.startsWith('[[') && a.value.endsWith(']]')) {
                    let value = a.value.substring(2, a.value.length - 2).replaceAll('&amp;', '&');
                    let camelCased = a.name.substring(6, a.name.length).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                    this._bindings.push(() => this._bindingSetElementClass(<HTMLElement | SVGElement>node, camelCased, value, repeatBindingItems));
                    this._bindings[this._bindings.length - 1]();
                } else if (a.name.startsWith('repeat:') && a.value.startsWith('[[') && a.value.endsWith(']]')) {
                    let value = a.value.substring(2, a.value.length - 2).replaceAll('&amp;', '&');
                    let camelCased = a.name.substring(7, a.name.length).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                    let elementsCache: Node[] = [];
                    this._bindings.push(() => this._bindingRepeat(<HTMLTemplateElement>node, camelCased, value, repeatBindingItems, elementsCache));
                    this._bindings[this._bindings.length - 1]();
                } else if (a.name.startsWith('@') && a.value.startsWith('[[') && a.value.endsWith(']]')) { //todo remove events on repeat refresh
                    let value = a.value.substring(2, a.value.length - 2).replaceAll('&amp;', '&');
                    let camelCased = a.name.substring(1, a.name.length).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                    node.addEventListener(camelCased, (e) => this._bindingRunEval(value, repeatBindingItems, e));
                } else if (a.value.startsWith('[[') && a.value.endsWith(']]')) {
                    let value = a.value.substring(2, a.value.length - 2).replaceAll('&amp;', '&');
                    let camelCased = a.name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                    this._bindings.push((firstRun?: boolean) => this._bindingSetNodeValue(firstRun, node, a, camelCased, value, repeatBindingItems, removeAttributes));
                    this._bindings[this._bindings.length - 1](true);
                } else if (a.value.startsWith('{{') && a.value.endsWith('}}')) {
                    let attributeValues = a.value.substring(2, a.value.length - 2).split('::');
                    let value = attributeValues[0];
                    let event = 'input';
                    if (attributeValues.length > 1 && attributeValues[1])
                        event = attributeValues[1];
                    let camelCased = a.name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                    this._bindings.push((firstRun?: boolean) => this._bindingSetNodeValue(firstRun, node, a, camelCased, value, repeatBindingItems, removeAttributes));
                    this._bindings[this._bindings.length - 1](true);
                    if (event) {
                        event.split(';').forEach(x => node.addEventListener(x, (e) => this._bindingsSetValue(this, value, (<HTMLInputElement>node)[camelCased])));
                    }
                }
            }

            if (!node.children.length && !(node instanceof HTMLTemplateElement) && node.innerHTML) {
                let text = node.innerHTML.trim();
                let matches = text.matchAll((<RegExp>(<any>this.constructor)._bindingRegex));
                let lastindex = 0;
                for (let m of matches) {
                    if (lastindex == 0) {
                        node.innerHTML = '';
                    }
                    if (m.index - lastindex > 0) {
                        let tn = document.createTextNode(text.substr(lastindex, m.index - lastindex));
                        node.appendChild(tn);
                    }
                    let workingNode = node;
                    if (m.index > 0 || m[0].length != text.length) {
                        workingNode = document.createElement('span');
                    }

                    let value = m[0].substr(2, m[0].length - 4).replaceAll('&amp;', '&');
                    this._bindings.push((firstRun?: boolean) => this._bindingSetNodeValue(firstRun, workingNode, null, 'innerHTML', value, repeatBindingItems, removeAttributes));
                    this._bindings[this._bindings.length - 1](true);
                    if (node != workingNode) {
                        node.appendChild(workingNode);
                    }
                    lastindex = m.index + m[0].length;
                }
                if (lastindex > 0 && text.length - lastindex > 0) {
                    let tn = document.createTextNode(text.substr(lastindex, text.length - lastindex));
                    node.appendChild(tn);
                }
            }
        }

        if (!(node instanceof HTMLTemplateElement)) {
            let children = Array.from(node.childNodes);
            for (let n of children) {
                this._bindingsInternalParse(n, repeatBindingItems, removeAttributes);
            }
        }
    }

    private _bindingRunEval(expression: string, repeatBindingItems: repeatBindingItem[], event?: Event) {
        if (repeatBindingItems) {
            let n = 0;
            for (let b of repeatBindingItems) {
                expression = 'let ' + b.name + ' = ___repeatBindingItems[' + n + '].item;' + expression;
                n++;
            }
            if (event) {
                expression = 'let event = ___event;' + expression;
            }
            //@ts-ignore
            var ___repeatBindingItems = repeatBindingItems;
            //@ts-ignore
            var ___event = event;
            let value = eval(expression);
            return value;
        }
        let value = eval(expression);
        return value;
    }

    private _bindingRepeat(node: HTMLTemplateElement, bindingProperty: string, expression: string, repeatBindingItems: repeatBindingItem[], elementsCache: Node[]) {
        try {
            const values = this._bindingRunEval(expression, repeatBindingItems);
            if (values) {
                for (let c of elementsCache) { // todo bindings of childs need to be killed
                    if (c.parentElement)
                        c.parentElement.removeChild(c);
                }
                for (let e of values) {
                    let intRepeatBindingItems: repeatBindingItem[] = [];
                    if (repeatBindingItems)
                        intRepeatBindingItems = repeatBindingItems.slice();
                    intRepeatBindingItems.push({ name: bindingProperty, item: e });
                    let nd = <DocumentFragment>node.content.cloneNode(true);
                    elementsCache.push(...nd.children);
                    this._bindingsInternalParse(nd, intRepeatBindingItems, true);
                    node.parentElement.appendChild(nd);
                }
            }
        } catch (error) {
            console.warn((<Error>error).message, 'Failed to bind Repeat "' + bindingProperty + '" to expression "' + expression + '"', node);
        }
    }

    private _bindingSetNodeValue(firstRun: boolean, node: Node, attribute: Attr, property: string, expression: string, repeatBindingItems: repeatBindingItem[], removeAttributes: boolean) {
        try {
            const value = this._bindingRunEval(expression, repeatBindingItems);
            if (firstRun || node[property] !== value) {
                if (removeAttributes && attribute)
                    (<Element>node).removeAttribute(attribute.name);
                if (property === 'innerHTML' && value instanceof Element) {
                    for (let c = node.firstChild; c !== null; c = node.firstChild) {
                        node.removeChild(c);
                    }
                    (<Element>node).appendChild(value)
                } else {
                    node[property] = value;
                }
            }
        } catch (error) {
            console.warn((<Error>error).message, 'Failed to bind Property "' + property + '" to expression "' + expression + '"', node);
        }
    }

    private _bindingSetElementCssValue(node: HTMLElement | SVGElement, property: string, expression: string, repeatBindingItems: repeatBindingItem[]) {
        try {
            const value = this._bindingRunEval(expression, repeatBindingItems);
            if (node.style[property] !== value)
                node.style[property] = value;
        } catch (error) {
            console.warn((<Error>error).message, 'Failed to bind CSS Property "' + property + '" to expression "' + expression + '"', node);
        }
    }

    private _bindingSetElementClass(node: HTMLElement | SVGElement, classname: string, expression: string, repeatBindingItems: repeatBindingItem[]) {
        try {
            const value = this._bindingRunEval(expression, repeatBindingItems);
            if (value) {
                if (!node.classList.contains(classname))
                    node.classList.add(classname);
            }
            else {
                if (node.classList.contains(classname))
                    node.classList.remove(classname);
            }
        } catch (error) {
            console.warn((<Error>error).message, 'Failed to bind CSS Class "' + classname + '" to expression "' + expression + '"', node);
        }
    }

    protected _bindingsRefresh() {
        if (this._bindings)
            this._bindings.forEach(x => x());
    }

    protected _bindingsSetValue(obj, path: string, value) {
        if (path === undefined || path === null) {
            return;
        }

        if (path.startsWith('this.')) {
            path = path.substr(5);
        }
        const pathParts = path.split('.');
        for (let i = 0; i < pathParts.length - 1; i++) {
            if (obj != null) {
                let newObj = obj[pathParts[i]];
                if (newObj == null) {
                    newObj = {};
                    obj[pathParts[i]] = newObj;
                }
                obj = newObj;
            }
        }

        obj[pathParts[pathParts.length - 1]] = value;
    }

    protected _createObservableProperties() {
        //@ts-ignore
        for (let i in this.constructor.properties) {
            this._createObservableProperty(i, null);
        }
    }

    private _createObservableProperty(propertyName: string, observer: string) {

        let descriptor = Reflect.getOwnPropertyDescriptor(this, propertyName);
        if (!descriptor) {
            descriptor = { configurable: true, enumerable: true };
            descriptor.get = () => this[internalPrefix + propertyName];
            descriptor.set = (v) => {
                if (this[internalPrefix + propertyName] !== v) {
                    let old = this[internalPrefix + propertyName];
                    this[internalPrefix + propertyName] = v;
                    if (observer)
                        this[observer](v, old);
                    this._bindingsRefresh();
                }
            };
            Reflect.defineProperty(this, propertyName, descriptor)
        } else {
            if (descriptor.hasOwnProperty('value') && descriptor.writable && descriptor.configurable) {
                this[internalPrefix + propertyName] = descriptor.value;
                delete descriptor.value;
                delete descriptor.writable;
                descriptor.get = () => this[internalPrefix + propertyName];
                descriptor.set = (v) => {
                    if (this[internalPrefix + propertyName] !== v) {
                        let old = this[internalPrefix + propertyName];
                        this[internalPrefix + propertyName] = v;
                        if (observer)
                            this[observer](v, old);
                        this._bindingsRefresh();
                    }
                };
                Reflect.defineProperty(this, propertyName, descriptor)
            }
        }
    }

    //@ts-ignore
    private static _propertiesDictionary: Map<string, string>;
    protected _parseAttributesToProperties() {
        //@ts-ignore
        if (!this.constructor._propertiesDictionary) {
            //@ts-ignore
            this.constructor._propertiesDictionary = new Map<string, [string, any]>();
            //@ts-ignore
            for (let i in this.constructor.properties) {
                //@ts-ignore
                this.constructor._propertiesDictionary.set(i.replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`), [i, this.constructor.properties[i]]);
            }
        }
        for (const a of this.attributes) {
            //@ts-ignore
            let pair = this.constructor._propertiesDictionary.get(a.name);
            if (pair) {
                if (pair[1] === Boolean)
                    this[pair[0]] = true;
                else if (pair[1] === Object)
                    this[pair[0]] = JSON.parse(a.value);
                else
                    this[pair[0]] = a.value;
            }
        }
    }

    /*attributeChangedCallback(name, oldValue, newValue) {
      //@ts-ignore
      if (this.constructor._propertiesDictionary) {
        this._parseAttributesToProperties();
      }
    }*/

    protected _rootDocumentFragment: DocumentFragment;

    constructor(template?: HTMLTemplateElement, style?: CSSStyleSheet) {
        super();

        this.attachShadow({ mode: 'open' });

        if (template) {
            //@ts-ignore
            this._rootDocumentFragment = template.content.cloneNode(true);
        }
        //@ts-ignore
        else if (this.constructor.template) {
            //@ts-ignore
            this._rootDocumentFragment = this.constructor.template.content.cloneNode(true);
        }

        if (style) {
            //@ts-ignore
            if (style instanceof Promise)
                //@ts-ignore
                style.then((s) => this.shadowRoot.adoptedStyleSheets = [s]);
            else
                //@ts-ignore
                this.shadowRoot.adoptedStyleSheets = [style];
            //@ts-ignore
        } else if (this.constructor.style) {

            //@ts-ignore
            if (this.constructor.style instanceof Promise)
                //@ts-ignore
                this.constructor.style.then((style) => this.shadowRoot.adoptedStyleSheets = [style]);
            else
                //@ts-ignore
                this.shadowRoot.adoptedStyleSheets = [this.constructor.style];
        }
    }
}

export class BaseCustomWebComponentLazyAppend extends BaseCustomWebComponentNoAttachedTemplate {
    constructor(template?: HTMLTemplateElement, style?: CSSStyleSheet) {
        super(template, style)
        queueMicrotask(() => {
            if (this._rootDocumentFragment)
                this.shadowRoot.appendChild(this._rootDocumentFragment);
            //@ts-ignore
            if (this.oneTimeSetup && !this.constructor._oneTimeSetup) {
                //@ts-ignore
                this.constructor._oneTimeSetup = true;
                //@ts-ignore
                this.oneTimeSetup();
            }
            //@ts-ignore
            if (this.ready)
                //@ts-ignore
                this.ready();
            //@ts-ignore
            if (this.readyLazy)
                //@ts-ignore
                requestAnimationFrame(this.readyLazy.bind(this)());
        })
    }
}

export class BaseCustomWebComponentConstructorAppend extends BaseCustomWebComponentNoAttachedTemplate {
    constructor(template?: HTMLTemplateElement, style?: CSSStyleSheet) {
        super(template, style)
        if (this._rootDocumentFragment)
            this.shadowRoot.appendChild(this._rootDocumentFragment);

        queueMicrotask(() => {

            //@ts-ignore
            if (this.oneTimeSetup && !this.constructor._oneTimeSetup) {
                //@ts-ignore
                this.constructor._oneTimeSetup = true;
                //@ts-ignore
                this.oneTimeSetup();
            }
            //@ts-ignore
            if (this.ready)
                //@ts-ignore
                this.ready();
            //@ts-ignore
            if (this.readyLazy)
                //@ts-ignore
                requestAnimationFrame(this.readyLazy.bind(this)());
        })
    }
}
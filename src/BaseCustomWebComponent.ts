export const html = function (strings: TemplateStringsArray, ...values: any[]): HTMLTemplateElement {
    const template = document.createElement('template');
    template.innerHTML = strings.raw[0];
    return template;
};

export const css = function (strings: TemplateStringsArray, ...values: any[]): CSSStyleSheet {
    const cssStyleSheet = new CSSStyleSheet();
    //@ts-ignore
    cssStyleSheet.replaceSync(strings.raw[0]);
    return cssStyleSheet;
};

export const cssAsync = async function (strings: TemplateStringsArray, ...values: any[]): Promise<CSSStyleSheet> {
    const cssStyleSheet = new CSSStyleSheet();
    //@ts-ignore
    await cssStyleSheet.replace(strings.raw[0]);
    return cssStyleSheet;
};

// decorators
export function property(type?: any) {
    return function (target: Object, propertyKey: PropertyKey) {
        //@ts-ignore
        if (!target.constructor.properties) {
            //@ts-ignore
            target.constructor.properties = {};
        }
        //@ts-ignore
        target.constructor.properties[propertyKey] = type ? type : String;
    }
}

const internalPropertyPrefix = '___';

abstract class BaseCustomWebComponent extends HTMLElement {
    static readonly style: CSSStyleSheet | Promise<CSSStyleSheet>;
    static readonly template: HTMLTemplateElement;

    protected _bindings: (() => void)[];

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
        if (!node)
            node = this.shadowRoot;
        if (node instanceof Element) {
            for (let a of node.attributes) {
                if (a.name.startsWith('@')) {
                    node.removeAttribute(a.name);
                    node.addEventListener(a.name.substr(1), this[a.value].bind(this));
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
     * use [[texpression]] for one way bindings
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
     */
    protected _bindingsParse(node?: Node) {
        if (!this._bindings)
            this._bindings = [];
        if (!node)
            node = this.shadowRoot;
        if (node instanceof Element) {
            for (let a of node.attributes) {
                if (a.name.startsWith('css:') && a.value.startsWith('[[') && a.value.endsWith(']]')) {
                    let value = a.value.substring(2, a.value.length - 2);
                    let camelCased = a.name.substring(4, a.name.length).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                    this._bindings.push(() => this._bindingSetElementCssValue(<HTMLElement | SVGElement>node, camelCased, value));
                    this._bindings[this._bindings.length - 1]();
                } else if (a.name.startsWith('class:') && a.value.startsWith('[[') && a.value.endsWith(']]')) {
                    let value = a.value.substring(2, a.value.length - 2);
                    let camelCased = a.name.substring(6, a.name.length).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                    this._bindings.push(() => this._bindingSetElementClass(<HTMLElement | SVGElement>node, camelCased, value));
                    this._bindings[this._bindings.length - 1]();
                } else if (a.value.startsWith('[[') && a.value.endsWith(']]')) {
                    let value = a.value.substring(2, a.value.length - 2);
                    let camelCased = a.name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                    this._bindings.push(() => this._bindingSetNodeValue(node, camelCased, value));
                    this._bindings[this._bindings.length - 1]();
                } else if (a.value.startsWith('{{') && a.value.endsWith('}}')) {
                    let attributeValues = a.value.substring(2, a.value.length - 2).split('::');
                    let value = attributeValues[0];
                    let event = 'input';
                    if (attributeValues.length > 1 && attributeValues[1])
                        event = attributeValues[1];
                    let camelCased = a.name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                    this._bindings.push(() => this._bindingSetNodeValue(node, camelCased, value));
                    this._bindings[this._bindings.length - 1]();
                    if (event) {
                        event.split(';').forEach(x => node.addEventListener(x, (e) => this._bindingsSetValue(this, value, (<HTMLInputElement>node)[camelCased])));
                    }
                }
            }

            if (!node.children.length && node.innerHTML) {
                let matches = node.innerHTML.matchAll((<RegExp>(<any>this.constructor)._bindingRegex));
                let lastindex = 0;
                let text = node.innerHTML;
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

                    let value = m[0].substr(2, m[0].length - 4);
                    this._bindings.push(() => this._bindingSetNodeValue(workingNode, 'innerHTML', value));

                    this._bindings[this._bindings.length - 1]();
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
        for (let n of node.childNodes) {
            if (!(n instanceof HTMLTemplateElement)) {
                this._bindingsParse(n);
            }
        }
    }

    private _bindingSetNodeValue(node: Node, property: string, expression: string) {
        try {
            const value = eval(expression);
            if (node[property] !== value)
                node[property] = value;
        } catch (error) {
            console.warn((<Error>error).message, 'Failed to bind Property "' + property + '" to expression "' + expression + '"', node);
        }
    }

    private _bindingSetElementCssValue(node: HTMLElement | SVGElement, property: string, expression: string) {
        try {
            const value = eval(expression);
            if (node.style[property] !== value)
                node.style[property] = value;
        } catch (error) {
            console.warn((<Error>error).message, 'Failed to bind CSS Property "' + property + '" to expression "' + expression + '"', node);
        }
    }

    private _bindingSetElementClass(node: HTMLElement | SVGElement, classname: string, expression: string) {
        try {
            let value = eval(expression);
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

    //@ts-ignore
    private static _propertiesDictionary: Map<string, string>;
    protected _parseAttributesToProperties(createPropertyObservers?: boolean) {
        //@ts-ignore
        if (!this.constructor._propertiesDictionary) {
            //@ts-ignore
            this.constructor._propertiesDictionary = new Map<string, [string, any]>();
            //@ts-ignore
            for (let i in this.constructor.properties) {
                //@ts-ignore
                this.constructor._propertiesDictionary.set(i.replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`), [i, this.constructor.properties[i]]);
                if (createPropertyObservers) {
                    let descriptor = Reflect.getOwnPropertyDescriptor(this, i);
                    if (!descriptor) {
                        descriptor = { configurable: true, enumerable: true };
                        descriptor.get = () => this[internalPropertyPrefix + i];
                        descriptor.set = (v) => {
                            this[internalPropertyPrefix + i] = v;
                            this._bindingsRefresh();
                        };
                        Reflect.defineProperty(this, i, descriptor)
                    } else {
                        if (descriptor.hasOwnProperty('value') && descriptor.writable && descriptor.configurable) {
                            this[internalPropertyPrefix + i] = descriptor.value;
                            delete descriptor.value;
                            delete descriptor.writable;
                            descriptor.get = () => this[internalPropertyPrefix + i];
                            descriptor.set = (v) => {
                                this[internalPropertyPrefix + i] = v;
                                this._bindingsRefresh();
                            };
                            Reflect.defineProperty(this, i, descriptor)
                        }
                    }

                }
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

export class BaseCustomWebComponentLazyAppend extends BaseCustomWebComponent {
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
        })
    }
}

export class BaseCustomWebComponentConstructorAppend extends BaseCustomWebComponent {
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
        })
    }
}
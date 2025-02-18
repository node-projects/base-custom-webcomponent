import { addTouchFriendlyContextMenu } from "./TouchContextMenu.js";
import { TypedEvent } from './TypedEvent.js';

function toParString(strings: TemplateStringsArray, values: any[]) {
    if (strings.length === 1)
        return strings.raw[0];
    else {
        let r = ''
        for (let i = 0; i < strings.length; i++) {
            r += strings[i] + (values[i] ?? '');
        }
        return r;
    }
}

export const html = function (strings: TemplateStringsArray, ...values: any[]): HTMLTemplateElement {
    const template = document.createElement('template');
    template.innerHTML = toParString(strings, values);
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
    cssStyleSheet.replaceSync(toParString(strings, values));
    return cssStyleSheet;
};

export const cssFromString = function (value: string | CSSStyleSheet | any): CSSStyleSheet {
    if (typeof value === 'object' && value.default instanceof CSSStyleSheet)
        return value.default;
    if (value instanceof CSSStyleSheet)
        return value;
    const cssStyleSheet = new CSSStyleSheet();
    //@ts-ignore
    cssStyleSheet.replaceSync(value);
    return cssStyleSheet;
};

type propertySimpleDefinition = Object | BooleanConstructor | DateConstructor | NumberConstructor | StringConstructor | ArrayConstructor | ObjectConstructor //| Object //| (new (...args: any[]) => object)
type propertyComplexDefinition = { type: propertySimpleDefinition; reflect?: boolean, attribute?: string, noattribute?: boolean, default?: any };
type propertyDefinition = propertyComplexDefinition | propertySimpleDefinition;

// decorators
export function property(par?: propertyDefinition) {
    return function (target: Object, propertyKey: PropertyKey) {
        //@ts-ignore
        if (!target.constructor.properties) {
            //@ts-ignore
            target.constructor.properties = {};
        }
        if (par && (<propertyComplexDefinition>par).type != null) {
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

type repeatBindingItem = { name: string, item: any }

let _bindingRegex = /\[\[.*?\]\]/g;

export class BaseCustomWebComponentNoAttachedTemplate extends HTMLElement {
    static readonly style: CSSStyleSheet | Promise<CSSStyleSheet> | CSSStyleSheet[];
    static readonly template: HTMLTemplateElement;

    //todo: bindings map should contain the name of the bound property
    protected _bindings: [binding: ((firstRun?: boolean, onlyWhenChanged?: boolean) => void), name: string][];
    protected _repeatBindings: WeakMap<Node, [binding: ((firstRun?: boolean) => void), name: string][]>;
    protected _rootDocumentFragment: DocumentFragment;
    protected _initialPropertyCache = new Map<string, any>();
    protected _noWarningOnBindingErrors;

    protected _getDomElement<T extends Element>(id: string): T {
        if (this.shadowRoot.children.length > 1 || (this.shadowRoot.children[0] !== undefined && this.shadowRoot.children[0].localName !== 'style'))
            return <T>(<any>this.shadowRoot.getElementById(id));
        return <T>(<any>this._rootDocumentFragment.getElementById(id));
    }

    protected _getDomElements<T extends Element>(selector: string): T[] {
        if (this.shadowRoot.children.length > 1 || (this.shadowRoot.children[0] !== undefined && this.shadowRoot.children[0].localName !== 'style'))
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
                    try {
                        if (a.name == "@touch:contextmenu")
                            addTouchFriendlyContextMenu(node, this[a.value].bind(this));
                        else {
                            let sNm = a.name.substr(1);
                            if (sNm[0] === '@') {
                                sNm = sNm.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                            }
                            let nm = sNm.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                            if (node[nm] instanceof TypedEvent) {
                                (<TypedEvent<any>>node[nm]).on(this[a.value].bind(this));
                            } else {
                                node.addEventListener(sNm, this[a.value].bind(this));
                            }
                        }
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
     * use {{this.property::change;paste}} for two way wich binds to events 'change 'and 'paste'
     * 
     * use @eventname="eventHandler" to bind a handler to a event
     * or @eventname="[[this.eventHandler(par1, par2, ..)]]" for complexer event logic 
     * use @touch:contextmenu... for a context menu that also works with long press on touch
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
    protected _bindingsParse(node?: Node, removeAttributes = false, host: any = null, context: any = null, useSignals = false) {
        this._bindingsInternalParse(node, null, removeAttributes, host, context, useSignals);
    }

    private _bindingsInternalParse(startNode: Node, repeatBindingItems: repeatBindingItem[], removeAttributes: boolean, host: any, context: any, useSignals = false) {
        if (!this._bindings)
            this._bindings = [];
        if (!startNode)
            startNode = this.shadowRoot.childNodes.length > 0 ? this.shadowRoot : this._rootDocumentFragment;

        const walker = document.createTreeWalker(startNode, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null);
        let currNode: Node = startNode;
        let loopNode: HTMLElement = <any>currNode;
        while (loopNode) {
            loopNode = <any>currNode;
            if (!loopNode)
                break;
            currNode = walker.nextNode();
            let node = loopNode;
            if (node.nodeType === 1) { //node.nodeType === 1
                const attributes = Array.from(node.attributes);
                for (let a of attributes) {
                    if (a.value[0] === '[' && a.value[1] === '[' && a.value[a.value.length - 1] === ']' && a.value[a.value.length - 2] === ']') {
                        if (a.name.startsWith('css:')) {
                            const value = a.value.substring(2, a.value.length - 2).replaceAll('&amp;', '&');
                            const camelCased = a.name.substring(4, a.name.length).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                            const b = () => this._bindingSetElementCssValue(<HTMLElement | SVGElement>node, camelCased, value, repeatBindingItems, host, context);
                            this._bindings.push([b, null]);
                            b();
                        } else if (a.name.startsWith('class:')) {
                            const value = a.value.substring(2, a.value.length - 2).replaceAll('&amp;', '&');
                            const camelCased = a.name.substring(6, a.name.length).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                            const b = () => this._bindingSetElementClass(<HTMLElement | SVGElement>node, camelCased, value, repeatBindingItems, host, context);
                            this._bindings.push([b, null]);
                            b();
                        } else if (a.name.startsWith('bcw:')) {
                            if (a.name === 'bcw:visible') {
                                const value = a.value.substring(2, a.value.length - 2).replaceAll('&amp;', '&');
                                const display = node.style.display;
                                const b = () => this._bindingSetElementCssValue(<HTMLElement | SVGElement>node, 'display', value + "?'" + display + "':'none'", repeatBindingItems, host, context);
                                this._bindings.push([b, null]);
                                b();
                            }
                        } else if (a.name.length === 28 && a.name === 'repeat-changed-item-callback') {
                            //do nothing
                        } else if (a.name === 'if' && node instanceof HTMLTemplateElement) {
                            const value = a.value.substring(2, a.value.length - 2).replaceAll('&amp;', '&');
                            const elementsCache: Node[] = [];
                            const b = () => this._bindingConditional(<HTMLTemplateElement>node, value, repeatBindingItems, elementsCache, host, context);
                            this._bindings.push([b, null]);
                            b();
                        } else if (a.name.startsWith('repeat:')) {
                            const value = a.value.substring(2, a.value.length - 2).replaceAll('&amp;', '&');
                            const bindingItemVariableName = a.name.substring(7, a.name.length).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                            const elementsCache: Node[] = [];
                            let bindingIndexname = 'index';
                            let changeItemCallback = null;
                            const indexNameAttribute = attributes.find(x => x.name == 'repeat-index');
                            if (indexNameAttribute)
                                bindingIndexname = indexNameAttribute.value;
                            const changeItemCallbackAttribute = attributes.find(x => x.name == 'repeat-changed-item-callback');
                            if (changeItemCallbackAttribute)
                                changeItemCallback = changeItemCallbackAttribute.value;
                            const b = () => this._bindingRepeat(<HTMLTemplateElement>node, bindingItemVariableName, bindingIndexname, value, changeItemCallback, repeatBindingItems, elementsCache, host, context);
                            this._bindings.push([b, null]);
                            b();
                        } else if (a.name[0] === '@') { //todo remove events on repeat refresh
                            let nm;
                            if (a.name[1] === '@')
                                nm = a.name.substring(2, a.name.length).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                            else
                                nm = a.name.substring(1, a.name.length);
                            const value = a.value.substring(2, a.value.length - 2).replaceAll('&amp;', '&');
                            if (a.name == "@touch:contextmenu")
                                addTouchFriendlyContextMenu(node, (e) => this._bindingRunEval(value, repeatBindingItems, e, host, context));
                            else {
                                if (node[nm] instanceof TypedEvent) {
                                    (<TypedEvent<any>>node[nm]).on((e) => this._bindingRunEval(value, repeatBindingItems, e, host, context));
                                } else {
                                    node.addEventListener(nm, (e) => this._bindingRunEval(value, repeatBindingItems, e, host, context));
                                }
                            }
                        } else {
                            let value = a.value.substring(2, a.value.length - 2).replaceAll('&amp;', '&');
                            let camelCased = a.name
                            if (a.name[0] !== '$' && a.name[0] !== '?')
                                camelCased = a.name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                            let noNull = false;
                            if (value[0] === '?') {
                                value = value.substring(1);
                                noNull = true;
                            }
                            const b = (firstRun?: boolean, onlyWhenChanged?: boolean) => this._bindingSetNodeValue(firstRun, node, a, camelCased, value, repeatBindingItems, removeAttributes, host, context, noNull, onlyWhenChanged);
                            this._bindings.push([b, null]);
                            b(true, false);
                        }
                    } else if (a.value[0] === '{' && a.value[1] === '{' && a.value[a.value.length - 1] === '}' && a.value[a.value.length - 2] === '}') {
                        const attributeValues = a.value.substring(2, a.value.length - 2).split('::');
                        let nm = a.name;
                        if (nm[0] == '.')
                            nm = nm.substring(1);
                        let value = attributeValues[0];
                        let event = (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) ? 'input' : (node instanceof HTMLSelectElement ? 'change' : nm + '-changed');
                        if (attributeValues.length > 1 && attributeValues[1])
                            event = attributeValues[1];
                        const camelCased = nm.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                        let noNull = false;
                        if (value[0] === '?') {
                            value = value.substring(1);
                            noNull = true;
                        }
                        const b = (firstRun?: boolean, onlyWhenChanged?: boolean) => this._bindingSetNodeValue(firstRun, node, a, camelCased, value, repeatBindingItems, removeAttributes, host, context, noNull, onlyWhenChanged);
                        this._bindings.push([b, null]);
                        b(true, false);
                        if (event) {
                            for (let x of event.split(';')) {
                                if (node[x] instanceof TypedEvent)
                                    (<TypedEvent<void>>node[x]).on((e) => this._bindingsSetValue(host ?? this, value.replaceAll('?', ''), (<HTMLInputElement>node)[camelCased], context, repeatBindingItems));
                                else
                                    node.addEventListener(x, (e) => this._bindingsSetValue(host ?? this, value.replaceAll('?', ''), (<HTMLInputElement>node)[camelCased], context, repeatBindingItems));
                            }
                        }
                    }
                }
            } else if (node.nodeType === 3) {
                if (node.nodeValue.indexOf('[[') >= 0) {
                    const text = node.nodeValue;
                    const matches = text.matchAll(_bindingRegex);
                    let lastindex = 0;
                    let fragment: DocumentFragment;
                    const trimmedLength = text.trim().length;
                    for (let m of matches) {
                        if ((m[0].length == trimmedLength || (m.index == 0 && m[0].length == text.length)) && node.parentNode.childNodes.length == 1) {
                            const parent = node.parentNode;
                            node.parentNode.removeChild(node);
                            this._textFragmentBinding(parent, m, repeatBindingItems, removeAttributes, host, context);
                        } else {
                            if (!fragment)
                                fragment = document.createDocumentFragment();
                            if (m.index - lastindex > 0) {
                                const tn = document.createTextNode(text.substr(lastindex, m.index - lastindex));
                                fragment.appendChild(tn);
                            }
                            const newNode = document.createElement('span');
                            this._textFragmentBinding(newNode, m, repeatBindingItems, removeAttributes, host, context);
                            fragment.appendChild(newNode);
                            lastindex = m.index + m[0].length;
                        }
                    }
                    if (fragment) {
                        if (lastindex > 0 && text.length - lastindex > 0) {
                            let tn = document.createTextNode(text.substr(lastindex, text.length - lastindex));
                            fragment.appendChild(tn);
                        }
                        node.parentNode.replaceChild(fragment, node);
                    }
                }
            }
        }
    }

    private _textFragmentBinding(node: Node, m: RegExpMatchArray, repeatBindingItems: repeatBindingItem[], removeAttributes: boolean, host: any, context: any) {
        let value = m[0].substr(2, m[0].length - 4);
        let noNull = false;
        if (value[0] === '?') {
            value = value.substring(1);
            noNull = true;
        }
        const b = (firstRun?: boolean, onlyWhenChanged?: boolean) => this._bindingSetNodeValue(firstRun, node, null, 'innerHTML', value, repeatBindingItems, removeAttributes, host, context, noNull, onlyWhenChanged);
        this._bindings.push([b, null]);
        b(true, false);
    }

    private _bindingRunEval(expression: string, repeatBindingItems: repeatBindingItem[], event: Event, host: any, context: any) {
        if (host)
            return this._bindingRunEvalInt.bind(host)(expression, repeatBindingItems, event, context)
        return this._bindingRunEvalInt(expression, repeatBindingItems, event, context)
    }

    //This method can not use "this" anywhere, cause it's bound to different host via method above.
    private _bindingRunEvalInt(expression: string, repeatBindingItems: repeatBindingItem[], event: Event, context: any) {
        if (repeatBindingItems) {
            let n = 0;
            let set = new Set();
            for (let b of repeatBindingItems) {
                if (!set.has(b.name)) {
                    expression = 'let ' + b.name + ' = ___repeatBindingItems[' + n + '].item;' + expression;
                    set.add(b.name);
                }
                n++;
            }
            if (event) {
                expression = 'let event = ___event;' + expression;
            }
            if (context) {
                for (let i in context) {
                    expression = 'let ' + i + ' = ___context["' + i + '"];' + expression;
                }
            }

            //@ts-ignore
            var ___repeatBindingItems = repeatBindingItems;
            //@ts-ignore
            var ___event = event;
            //@ts-ignore
            var ___context = context;
            let value = eval(expression);
            return value;
        }
        if (context) {
            for (let i in context) {
                expression = 'let ' + i + ' = ___context["' + i + '"];' + expression;
            }
            //@ts-ignore
            var ___context = context;
            let value = eval(expression);
            return value;
        }
        let value = eval(expression);
        return value;
    }

    private _bindingConditional(node: HTMLTemplateElement, expression: string, repeatBindingItems: repeatBindingItem[], elementsCache: Node[], host: any, context: any) {
        try {
            const value = this._bindingRunEval(expression, repeatBindingItems, null, host, context);

            if (!value && elementsCache.length > 0) {
                for (let c of elementsCache) {
                    c.parentNode.removeChild(c);
                }
                elementsCache.length = 0;
            }

            if (value && elementsCache.length === 0) {
                let nd = <DocumentFragment>node.content.cloneNode(true);
                elementsCache.push(...nd.children);
                this._bindingsInternalParse(nd, repeatBindingItems, true, host, context);

                node.parentNode.insertBefore(nd, node);
            }
        } catch (error) {
            if (!this._noWarningOnBindingErrors)
                console.warn((<Error>error).message, 'Failed to bind Conditional to expression "' + expression + '"', this, node);
        }
    }

    oldValuesSymbol = Symbol('oldValuesSymbol');

    private _bindingRepeat(node: HTMLTemplateElement, bindingProperty: string, bindingIndexName: string, expression: string, callback: string, repeatBindingItems: repeatBindingItem[], elementsCache: Node[], host: any, context: any) {
        try {
            let values: [] = this._bindingRunEval(expression, repeatBindingItems, null, host, context);
            if (values && !Array.isArray(values))
                values = [...values];
            const oldValue = node[this.oldValuesSymbol];
            if (oldValue !== values && (oldValue?.length !== values?.length || (values.some((x, i) => x !== oldValue?.[i])))) {
                if (Array.isArray(values))
                    node[this.oldValuesSymbol] = [...values];
                else
                    node[this.oldValuesSymbol] = values;

                if (callback) {
                    if (callback.startsWith('[[') && callback.endsWith(']]'))
                        callback = callback.substring(2, callback.length - 2);
                    else
                        callback = "this." + callback;
                }
                for (let c of elementsCache) {
                    if (c.parentNode) {
                        let intRepeatBindingItems: repeatBindingItem[] = [];
                        intRepeatBindingItems.push({ name: 'nodes', item: [c] });
                        intRepeatBindingItems.push({ name: 'callbackType', item: 'remove' });
                        this._bindingRunEval(callback, intRepeatBindingItems, null, host, context);
                        const bnds = this._repeatBindings.get(c);
                        if (bnds?.length) {
                            for (const b of bnds) {
                                const idx = this._bindings.indexOf(b);
                                if (idx >= 0)
                                    this._bindings.splice(idx, 1);
                            }
                        }
                        c.parentNode.removeChild(c);
                    }
                }
                elementsCache.length = 0;


                if (values) {
                    if (!this._repeatBindings)
                        this._repeatBindings = new WeakMap();

                    //todo -> copy values to compare and only generate new controls...
                    let i = 0;
                    for (let e of values) {
                        let intRepeatBindingItems: repeatBindingItem[] = [];
                        if (repeatBindingItems)
                            intRepeatBindingItems = repeatBindingItems.slice();
                        intRepeatBindingItems.push({ name: bindingProperty, item: e });
                        intRepeatBindingItems.push({ name: bindingIndexName, item: i });
                        let nd = <DocumentFragment>node.content.cloneNode(true);
                        elementsCache.push(...nd.children);
                        const bndCount = this._bindings.length;
                        this._bindingsInternalParse(nd, intRepeatBindingItems, true, host, context);
                        this._repeatBindings.set(nd.children[0], this._bindings.toSpliced(0, bndCount));

                        if (callback) {
                            intRepeatBindingItems.push({ name: 'nodes', item: [...nd.children] });
                            intRepeatBindingItems.push({ name: 'callbackType', item: 'create' });
                            let nds = this._bindingRunEval(callback, intRepeatBindingItems, null, host, context);
                            if (nds === undefined)
                                nds = nd.children;
                            if (nds) {
                                for (let n of Array.from(nds))
                                    node.parentNode.insertBefore(<Node>n, node);
                            }
                        }
                        else {
                            node.parentNode.insertBefore(nd, node);
                        }
                        i++;
                    }
                }
            }
        } catch (error) {
            if (!this._noWarningOnBindingErrors)
                console.warn((<Error>error).message, 'Failed to bind Repeat "' + bindingProperty + '" to expression "' + expression + '"', this, node);
        }
    }

    private _bindingSetNodeValue(firstRun: boolean, node: Node, attribute: Attr, property: string, expression: string, repeatBindingItems: repeatBindingItem[], removeAttributes: boolean, host: any, context: any, noNull: boolean, onlyWhenChanged: boolean) {
        try {
            const value = this._bindingRunEval(expression, repeatBindingItems, null, host, context);
            if (firstRun || node[property] !== value) {
                if (removeAttributes && attribute)
                    (<Element>node).removeAttribute(attribute.name);
                if (property === 'innerHTML' && (value instanceof Element || value instanceof DocumentFragment)) {
                    for (let c = node.firstChild; c !== null; c = node.firstChild) {
                        node.removeChild(c);
                    }
                    this._bindingsInternalParse(value, repeatBindingItems, true, host, context);
                    (<Element>node).appendChild(value);
                } else {
                    if (property[0] === '$') {
                        if (!value && noNull)
                            (<Element>node).setAttribute(property.substring(1), '');
                        else if (!value)
                            (<Element>node).removeAttribute(property.substring(1));
                        else
                            (<Element>node).setAttribute(property.substring(1), value);
                    } else if (property[0] === '?') {
                        if (!value == true)
                            (<Element>node).setAttribute(property.substring(1), '');
                        else
                            (<Element>node).removeAttribute(property.substring(1));
                    }
                    else if (property == 'class')
                        (<Element>node).setAttribute(property, value);
                    else {
                        if (property[0] === '.')
                            property = property.substring(1);
                        if (!value && noNull) {
                            if (!onlyWhenChanged || node[property] != value)
                                node[property] = '';
                        } else {
                            if (!onlyWhenChanged || node[property] != value)
                                node[property] = value;
                        }
                    }
                }
            }
        } catch (error) {
            if (!this._noWarningOnBindingErrors)
                console.warn((<Error>error).message, ' - Failed to bind Property "' + property + '" to expression "' + expression + '"', this, node);
        }
    }

    private _bindingSetElementCssValue(node: HTMLElement | SVGElement, property: string, expression: string, repeatBindingItems: repeatBindingItem[], host: any, context: any) {
        try {
            const value = this._bindingRunEval(expression, repeatBindingItems, null, host, context);
            if (node.style[property] !== value)
                node.style[property] = value;
        } catch (error) {
            if (!this._noWarningOnBindingErrors)
                console.warn((<Error>error).message, ' - Failed to bind CSS Property "' + property + '" to expression "' + expression + '"', this, node);
        }
    }

    private _bindingSetElementClass(node: HTMLElement | SVGElement, classname: string, expression: string, repeatBindingItems: repeatBindingItem[], host: any, context: any) {
        try {
            const value = this._bindingRunEval(expression, repeatBindingItems, null, host, context);
            if (value) {
                if (!node.classList.contains(classname))
                    node.classList.add(classname);
            }
            else {
                if (node.classList.contains(classname))
                    node.classList.remove(classname);
            }
        } catch (error) {
            if (!this._noWarningOnBindingErrors)
                console.warn((<Error>error).message, 'Failed to bind CSS Class "' + classname + '" to expression "' + expression + '"', this, node);
        }
    }

    protected _bindingsRefresh(property?: string, onlyWhenChanged?: boolean) {
        if (this._bindings)
            this._bindings.forEach(x => x[0](false, onlyWhenChanged));
    }

    protected _bindingsSetValue(obj, path: string, value: any, context: any, repeatBindingItems?: repeatBindingItem[]) {
        if (path === undefined || path === null) {
            return;
        }

        if (path.includes("[")) {
            //support binding like this: {{this.picks?.[this.currentPick]?.ConfirmQuantity::value-changed}}
            let p = path.replaceAll(".[", "[");
            p += "=" + value + ";";
            p = "try { " + p + " } catch (err) { console.warn(err); }";
            eval(p);
            return;
        }

        let target = obj;
        if (path.startsWith('this.')) {
            path = path.substr(5);
        } else {
            target = context;
        }

        const pathParts = path.split('.');
        for (let i = 0; i < pathParts.length - 1; i++) {
            if (target != null) {
                let newObj = target[pathParts[i]];
                if (newObj == null) {
                    newObj = {};
                    target[pathParts[i]] = newObj;
                }
                target = newObj;
            } else {
                if (repeatBindingItems) {
                    let p = pathParts[i];
                    target = repeatBindingItems.find(x => x.name == p).item;
                }

            }
        }

        target[pathParts[pathParts.length - 1]] = value;
    }

    //@ts-ignore
    private static _propertiesDictionary: Map<string, string>;
    protected _parseAttributesToProperties(noBindings: boolean = false) {
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
                else if (pair[1] === Object || pair[1] === Array) {
                    if (noBindings || !a.value.startsWith("{{") && !a.value.startsWith("[[")) //cause of this Array in Array Json Values are not possible atm.
                        this[pair[0]] = JSON.parse(a.value);
                }
                else if (pair[1] === Number)
                    this[pair[0]] = parseFloat(a.value);
                else
                    this[pair[0]] = a.value;
            }
        }
    }

    protected async _waitForChildrenReady() {
        await Promise.all(Array.from(this.shadowRoot.querySelectorAll(':not(:defined)'), n => customElements.whenDefined(n.localName)));
    }

    protected _restoreCachedInititalValues() {
        if (this._initialPropertyCache) {
            for (const e of this._initialPropertyCache.entries()) {
                delete this[e[0]];
                this[e[0]] = e[1];
            }
        }
        this._initialPropertyCache = undefined;
    }

    protected _restoreCachedInititalValue(name: string) {
        if (this._initialPropertyCache) {
            if (this._initialPropertyCache.has(name)) {
                delete this[name];
                this[name] = this._initialPropertyCache.get(name);
                this._initialPropertyCache.delete(name)
            }
        }
        if (!this._initialPropertyCache.size)
            this._initialPropertyCache = undefined;
    }

    static instanceCreatedCallback: (i: BaseCustomWebComponentNoAttachedTemplate) => void;

    _hmrCallback(newClass: BaseCustomWebComponentNoAttachedTemplate) {
        let oldIdx = -1;
        //@ts-ignore
        if (this.constructor.style) {
            //@ts-ignore
            oldIdx = this.shadowRoot.adoptedStyleSheets.indexOf(this.constructor.style);
            if (oldIdx >= 0) {
                let newArr = Array.from(this.shadowRoot.adoptedStyleSheets);
                newArr.splice(oldIdx, 1);
                this.shadowRoot.adoptedStyleSheets = newArr;
            }
        }
        if (newClass.style) {
            if (oldIdx >= 0) {
                let newArr = Array.from(this.shadowRoot.adoptedStyleSheets);
                //@ts-ignore
                newArr.splice(oldIdx, 0, newClass.style);
                this.shadowRoot.adoptedStyleSheets = newArr;
            }
        }
    }

    constructor(template?: HTMLTemplateElement, style?: CSSStyleSheet) {
        super();

        if (BaseCustomWebComponentNoAttachedTemplate.instanceCreatedCallback)
            BaseCustomWebComponentNoAttachedTemplate.instanceCreatedCallback(this);

        if (!this.shadowRoot)
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

        //@ts-ignore
        if (this.templateCloned) {
            //@ts-ignore
            this.templateCloned();
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
            if (this.constructor.style instanceof CSSStyleSheet) {
                //@ts-ignore
                this.shadowRoot.adoptedStyleSheets = [this.constructor.style];
                //@ts-ignore
            } else if (Array.isArray(this.constructor.style)) {
                //@ts-ignore
                this.shadowRoot.adoptedStyleSheets = this.constructor.style;
                //@ts-ignore
            } else if (this.constructor.style instanceof Promise)
                //@ts-ignore
                this.constructor.style.then((style) => this.shadowRoot.adoptedStyleSheets = [style]);
        }

        //@ts-ignore
        if (this.constructor.properties) {
            //@ts-ignore
            for (let p in this.constructor.properties) {
                if (this.hasOwnProperty(p))
                    this._initialPropertyCache.set(p, this[p]);
            }
        }
    }
}

export class BaseCustomWebComponentLazyAppend extends BaseCustomWebComponentNoAttachedTemplate {
    constructor(template?: HTMLTemplateElement, style?: CSSStyleSheet) {
        super(template, style);

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

export class BaseCustomWebComponentConstructorAppend extends BaseCustomWebComponentNoAttachedTemplate {
    constructor(template?: HTMLTemplateElement, style?: CSSStyleSheet) {
        super(template, style);

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
        });

        if (this._rootDocumentFragment)
            this.shadowRoot.appendChild(this._rootDocumentFragment);
    }
}

export class BaseCustomWebComponentLazyAppendConnectedReady extends BaseCustomWebComponentNoAttachedTemplate {
    constructor(template?: HTMLTemplateElement, style?: CSSStyleSheet) {
        super(template, style);

        queueMicrotask(() => {
            if (this._rootDocumentFragment)
                this.shadowRoot.appendChild(this._rootDocumentFragment);
        });
    }

    protected _isReady: boolean;

    connectedCallback() {
        //@ts-ignore
        if (this.ready && !this._isReady)
            //@ts-ignore
            this.ready();
        this._isReady = true;
    }
}

export class BaseCustomWebComponentConnectedReady extends BaseCustomWebComponentNoAttachedTemplate {
    constructor(template?: HTMLTemplateElement, style?: CSSStyleSheet) {
        super(template, style);

        if (this._rootDocumentFragment)
            this.shadowRoot.appendChild(this._rootDocumentFragment);
    }

    protected _isReady: boolean;

    connectedCallback() {
        //@ts-ignore
        if (this.ready && !this._isReady)
            //@ts-ignore
            this.ready();
        this._isReady = true;
    }
}

export class BaseCustomWebComponentConstructorAppendLazyReady extends BaseCustomWebComponentNoAttachedTemplate {
    constructor(template?: HTMLTemplateElement, style?: CSSStyleSheet) {
        super(template, style);

        if (this._rootDocumentFragment)
            this.shadowRoot.appendChild(this._rootDocumentFragment);

        requestAnimationFrame(() => {
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
        });
    }
}
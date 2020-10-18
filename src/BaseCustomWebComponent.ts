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

abstract class BaseCustomWebComponent extends HTMLElement {
  static readonly style: CSSStyleSheet | Promise<CSSStyleSheet>;
  static readonly template: HTMLTemplateElement;

  protected _bindings: (() => void)[];

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

  protected _assignOnDashEvents(node?: Node) {
    if (!node)
      node = this.shadowRoot;
    if (node instanceof Element) {
      for (let a of node.attributes) {
        if (a.name.startsWith('on-')) {
          node.removeAttribute(a.name);
          node['on' + a.name.substring(3)] = this[a.value].bind(this);
        }
      }
    }
    for (let n of node.childNodes) {
      this._assignOnDashEvents(n);
    }
  }

  protected _bindingsParse(context?: object, node?: Node) {
    if (!this._bindings)
      this._bindings = [];
    if (!context)
      context = this;
    if (!node)
      node = this.shadowRoot;
    if (node instanceof Element) {
      for (let a of node.attributes) {
        if (a.value.startsWith('[[') && a.value.endsWith(']]')) {
          let value = a.value.substring(2, a.value.length - 2);
          let camelCased = a.name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          this._bindings.push(() => node[camelCased] = eval('this.' + value));
          this._bindings[this._bindings.length - 1]();
        } else if (a.value.startsWith('{{') && a.value.endsWith('}}')) {
          let value = a.value.substring(2, a.value.length - 2);
          let camelCased = a.name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          this._bindings.push(() => node[camelCased] = eval('this.' + value));
          this._bindings[this._bindings.length - 1]();
          switch(camelCased) {
            case 'value': {
              (<HTMLInputElement>node).onchange = (e) => this._bindingsSetValue(this, value,  (<HTMLInputElement>node).value);
            }
          }
        }
      }
      if (node.innerHTML.startsWith('{{') && node.innerHTML.endsWith('}}')) {
        let value = node.innerHTML.substring(2, node.innerHTML.length - 2);
        this._bindings.push(() => (<Element>node).innerHTML = eval('this.' + value));
        this._bindings[this._bindings.length - 1]();
      }
    }
    for (let n of node.childNodes) {
      this._bindingsParse(context, n);
    }
  }

  protected _bindingsRefresh() {
    this._bindings.forEach(x => x());
  }

  protected _bindingsSetValue(obj, path: string, value) {
    if (path === undefined || path === null) {
        return;
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

  constructor() {
    super();

    this.attachShadow({ mode: 'open' });

    //@ts-ignore
    if (this.constructor.template) {
      //@ts-ignore
      this._rootDocumentFragment = this.constructor.template.content.cloneNode(true);
    }

    //@ts-ignore
    if (this.constructor.style) {
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
  constructor() {
    super()
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
  constructor() {
    super()
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
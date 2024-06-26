import { BaseCustomWebComponentNoAttachedTemplate, css, cssFromString } from "./BaseCustomWebComponent.js";
import { WeakArray } from "./WeakArray.js";

function camelToDashCase(text: string) {
    return text.replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`);
}

const instanceMap = new Map<string, WeakArray<BaseDeclaritiveWebcomponent>>();
class BaseDeclaritiveWebcomponent extends BaseCustomWebComponentNoAttachedTemplate {
    #firstConnect = false;

    constructor() {
        super();
    }

    async connectedCallback() {
        if (!this.#firstConnect) {
            this.#firstConnect = true;
            if (window[this.localName].template === undefined) {
                window[this.localName].template = window[this.localName]._definingElement.querySelector('template');
                const styles: HTMLStyleElement[] = window[this.localName]._definingElement.querySelectorAll('style[type=adopted-css]');
                if (styles?.length)
                    window[this.localName]._styles = Array.from(styles).map(x => cssFromString(x.textContent));
            }
            //@ts-ignore
            this._rootDocumentFragment = this.constructor.template.content.cloneNode(true);
            //@ts-ignore
            if (this.constructor._styles) {
                //@ts-ignore
                this.shadowRoot.adoptedStyleSheets = this.constructor._styles;
            }
            //@ts-ignore
            if (this.constructor._enableBindings)
                this._bindingsParse(null, true);
            this.shadowRoot.appendChild(this._rootDocumentFragment);
        }

        this._parseAttributesToProperties();
        //@ts-ignore
        if (this.constructor._enableBindings)
            this._bindingsRefresh();
    }

    _reapplyTemplateAfterUpdate() {
        this._bindings = null;
        this.shadowRoot.innerHTML = '';
        this.shadowRoot.adoptedStyleSheets = [];
        //@ts-ignore
        if (this.constructor._styles) {
            //@ts-ignore
            this.shadowRoot.adoptedStyleSheets = this.constructor._styles;
        }
        //@ts-ignore
        this._rootDocumentFragment = this.constructor.template.content.cloneNode(true);
        this.shadowRoot.appendChild(this._rootDocumentFragment);
        //@ts-ignore
        if (this.constructor._enableBindings)
            this._bindingsParse(null, true);
    }
}

class DeclaritiveBaseCustomWebcomponent extends BaseCustomWebComponentNoAttachedTemplate {

    public static style = css`:host{display:none;}`;

    public name: string;
    public enableBindings: boolean;
    public properties: string;

    public static readonly properties = {
        name: String,
        enableBindings: Boolean,
        properties: String
    }

    constructor() {
        super();
        this._parseAttributesToProperties();
        let props = {};
        if (this.properties) {
            if (this.properties[0] === '{') {
                const obj = JSON.parse(this.properties);
                for (let i in obj) {
                    if (typeof obj[i] === 'string')
                        props[i] = window[obj[i]];
                    else {
                        props[i] = obj[i];
                        props[i].type = obj[i].type ? window[obj[i].type] : String;
                    }
                }
            } else {
                props = this.properties.split(/[\s,;]+/).reduce((a, v) => ({ ...a, [v]: String }), {});
            }
        }
        const name = this.name;
        if (window[name]) {
            window[name].template = undefined;
            window[name].properties = props;
            window[name]._propertiesDictionary = null;
            window[name]._enableBindings = this.enableBindings;
            window[name]._definingElement = this;
            window[name]._styles = null;
        } else {
            const instanceArray = new WeakArray<BaseDeclaritiveWebcomponent>();
            instanceMap.set(name, instanceArray);
            window[name] = function () {
                const instance = Reflect.construct(BaseDeclaritiveWebcomponent, [], window[name]);
                instanceArray.add(instance);

                for (let p in props) {
                    Object.defineProperty(instance, p, {
                        get() {
                            return this['_' + p];
                        },
                        set(newValue) {
                            if (this['_' + p] !== newValue) {
                                this['_' + p] = newValue;

                                if (props[p].reflect) {
                                    if (props[p].type === Boolean) {
                                        if (newValue === true)
                                            this.setAttribute(props[p].attribute ?? camelToDashCase(p), '');
                                        else
                                            this.removeAttribute(props[p].attribute ?? camelToDashCase(p));
                                    } else {
                                        if (props[p].type === Object || props[p].type === Array)
                                            this.setAttribute(props[p].attribute ?? camelToDashCase(p), JSON.stringify(newValue));
                                        else
                                            this.setAttribute(props[p].attribute ?? camelToDashCase(p), newValue);
                                    }
                                }
                                //@ts-ignore
                                if (this.constructor._enableBindings)
                                    this._bindingsRefresh(p);
                                instance.dispatchEvent(new CustomEvent(camelToDashCase(p) + '-changed', { detail: { newValue } }));
                            }
                        },
                        enumerable: true,
                        configurable: true,
                    });
                    if (props[p].default) {
                        instance['_' + p] = props[p].default;
                    }
                }
                return instance;
            }

            //window[name].style = style;
            window[name].properties = props;
            window[name]._propertiesDictionary = null;
            window[name]._enableBindings = this.enableBindings;
            window[name]._definingElement = this;
            window[name]._styles = null;
            window[name].prototype = Object.create(BaseDeclaritiveWebcomponent.prototype, { constructor: { value: window[name] } })
            if (!customElements.get(name))
                customElements.define(name, window[name]);
        }
    }

    upgradeAllInstances(template?: HTMLTemplateElement) {
        window[this.name].template = template ?? this.querySelector('template');
        const styles = this.querySelectorAll('style[type=adopted-css]');
        if (styles?.length)
            window[this.name]._styles = Array.from(styles).map(x => cssFromString(x.textContent));
        const instanceArray = instanceMap.get(this.name);
        for (const i of instanceArray)
            i._reapplyTemplateAfterUpdate();
    }
}

customElements.define("node-projects-dce", DeclaritiveBaseCustomWebcomponent);

/*
<node-projects-dce name="simple-dce-demo" properties='{"list":"Array", "list2":"Array", "ctx":{"type":"String","reflect":true}}' enable-bindings >
    <template>
        <style>h1 {color: red}</style>
        <h1>Hello World</h1>
        <div style="border: solid 3px black">Ctx: [[this.ctx]]</div>
        <template repeat:myitem="[[this.list]]">
            <button>[[myitem.toUpperCase()]] - <b>[[myitem.toLowerCase()]]</b> - [[index]]</button>
            <ul>
            <template repeat:myitem2="[[this.list2]]" repeat-index="inneridx">
                <button @click="[[this.ctx = myitem2]]" >[[myitem.toUpperCase()]] - <b>[[myitem2.toLowerCase()]]</b> - [[inneridx * 100]]</button>
            </template>
            </ul>
        </template>
    </template>
</node-projects-dce>
<simple-dce-demo list='["aa","bb","cc"]' list2='["hello", "you"]' ctx="TestCtx" style="position:absolute;left:184px;top:-53px;"></simple-dce-demo>
*/
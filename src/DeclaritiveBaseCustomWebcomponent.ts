import { BaseCustomWebComponentConstructorAppend, BaseCustomWebComponentNoAttachedTemplate, css } from "./BaseCustomWebComponent.js";

function camelToDashCase(text: string) {
    return text.replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`);
}

class BaseDeclaritiveWebcomponent extends BaseCustomWebComponentConstructorAppend {
    constructor() {
        super();
        //@ts-ignore
        if (this.constructor._enableBindings)
            this._bindingsParse(null, true);
    }

    async connectedCallback() {
        this._parseAttributesToProperties();
        //@ts-ignore
        if (this.constructor._enableBindings)
            this._bindingsRefresh();
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
                    props[i] = window[obj[i]];
                }
            } else {
                props = this.properties.split(/[\s,;]+/).reduce((a, v) => ({ ...a, [v]: String }), {});
            }
        }
        const name = this.name;
        const definingElement = this;

        if (window[name]) {
            window[name].template = undefined;
            //window[name].style = style;
            window[name].properties = props;
            window[name]._propertiesDictionary = null;
            window[name]._enableBindings = this.enableBindings;
        } else {
            window[name] = function () {
                if (window[name].template === undefined)
                    window[name].template = definingElement.querySelector('template');
                const instance = Reflect.construct(BaseDeclaritiveWebcomponent, [], window[name]);

                for (let p in props) {
                    Object.defineProperty(instance, p, {
                        get() {
                            return this['_' + p];
                        },
                        set(newValue) {
                            if (this['_' + p] !== newValue) {
                                this['_' + p] = newValue;
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
            window[name].prototype = Object.create(BaseDeclaritiveWebcomponent.prototype, { constructor: { value: window[name] } })
            if (!customElements.get(name))
                customElements.define(name, window[name]);
        }
    }
}

customElements.define("node-projects-dce", DeclaritiveBaseCustomWebcomponent);
import { BaseCustomWebComponentConstructorAppend, BaseCustomWebComponentNoAttachedTemplate, css } from "./BaseCustomWebComponent.js";
import { WeakArray } from "./WeakArray.js";

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

    _reapplyTemplateAfterUpdate() {
        this._bindings = null;
        this.shadowRoot.innerHTML = '';
        //@ts-ignore
        this._rootDocumentFragment = this.constructor.template.content.cloneNode(true);
        this.shadowRoot.appendChild(this._rootDocumentFragment);
        //@ts-ignore
        if (this.constructor._enableBindings)
            this._bindingsParse(null, true);
    }
}

const instanceMap = new Map<string, WeakArray<BaseDeclaritiveWebcomponent>>();

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
            window[name].template = this.querySelector('template');
            //window[name].style = style;
            window[name].properties = props;
            window[name]._propertiesDictionary = null;
            window[name]._enableBindings = this.enableBindings;
            window[name]._definingElement = this;
            const instanceArray = instanceMap.get(name);
            for (const i of instanceArray)
                i._reapplyTemplateAfterUpdate();
        } else {
            const instanceArray = new WeakArray<BaseDeclaritiveWebcomponent>();
            instanceMap.set(name, instanceArray);
            window[name] = function () {
                if (window[name].template === undefined)
                    window[name].template = window[name]._definingElement.querySelector('template');
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
            window[name].prototype = Object.create(BaseDeclaritiveWebcomponent.prototype, { constructor: { value: window[name] } })
            if (!customElements.get(name))
                customElements.define(name, window[name]);
        }
    }
}

customElements.define("node-projects-dce", DeclaritiveBaseCustomWebcomponent);

/*
<node-projects-dce name="simple-dce-demo" properties='{"list":"Array", "list2":"Array"}' enable-bindings >
    <template>
        <style>h1 {color: red}</style>
        <h1>Hello World</h1>
        <template repeat:myitem="[[this.list]]">
            <button>[[myitem.toUpperCase()]] - <b>[[myitem.toLowerCase()]]</b> - [[index]]</button>
            <ul>
            <template repeat:myitem2="[[this.list2]]" repeat-index="inneridx">
                <button>[[myitem.toUpperCase()]] - <b>[[myitem2.toLowerCase()]]</b> - [[inneridx * 100]]</button>
            </template>
            </ul>
        </template>
    </template>
</node-projects-dce>
<simple-dce-demo list='["aa","bb","cc"]' list2='["hello", "you"]' style="position:absolute;left:184px;top:-53px;"></simple-dce-demo>
*/
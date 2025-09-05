var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
import { BaseCustomWebComponentConstructorAppend, property, customElement, html, css } from '../../dist/BaseCustomWebComponent.js';
let AA = (() => {
    let _classDecorators = [customElement('a-a')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = BaseCustomWebComponentConstructorAppend;
    let _bb_decorators;
    let _bb_initializers = [];
    let _bb_extraInitializers = [];
    let _cc_decorators;
    let _cc_initializers = [];
    let _cc_extraInitializers = [];
    var AA = class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _bb_decorators = [property()];
            _cc_decorators = [property()];
            __esDecorate(this, null, _bb_decorators, { kind: "accessor", name: "bb", static: false, private: false, access: { has: obj => "bb" in obj, get: obj => obj.bb, set: (obj, value) => { obj.bb = value; } }, metadata: _metadata }, _bb_initializers, _bb_extraInitializers);
            __esDecorate(this, null, _cc_decorators, { kind: "accessor", name: "cc", static: false, private: false, access: { has: obj => "cc" in obj, get: obj => obj.cc, set: (obj, value) => { obj.cc = value; } }, metadata: _metadata }, _cc_initializers, _cc_extraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AA = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static { this.template = html `<div>[[this.bb]]</div>`; }
        static { this.style = css `
    :host {
        font-size: 20px;
    }`; }
        #bb_accessor_storage = __runInitializers(this, _bb_initializers, void 0);
        get bb() { return this.#bb_accessor_storage; }
        set bb(value) { this.#bb_accessor_storage = value; }
        #cc_accessor_storage = (__runInitializers(this, _bb_extraInitializers), __runInitializers(this, _cc_initializers, void 0));
        get cc() { return this.#cc_accessor_storage; }
        set cc(value) { this.#cc_accessor_storage = value; }
        constructor() {
            super();
            __runInitializers(this, _cc_extraInitializers);
            this._restoreCachedInititalValues();
            this._bindingsParse();
        }
        ready() {
            this._parseAttributesToProperties();
            this._bindingsRefresh();
        }
        static {
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return AA = _classThis;
})();
export { AA };

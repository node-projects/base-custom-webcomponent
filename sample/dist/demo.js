var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { BaseCustomWebComponentConstructorAppend, property, customElement, html, css } from '../../dist/BaseCustomWebComponent.js';
let AA = class AA extends BaseCustomWebComponentConstructorAppend {
    static { this.template = html `<div>[[this.bb]]</div><div>[[this.dd]]</div>`; }
    static { this.style = css `
    :host {
        font-size: 20px;
    }`; }
    constructor() {
        super();
        this.dd = '<img src="aa.jpg">';
        this._restoreCachedInititalValues();
        this._bindingsParse();
    }
    ready() {
        this._parseAttributesToProperties();
        this._bindingsRefresh();
    }
};
__decorate([
    property()
], AA.prototype, "bb", void 0);
__decorate([
    property()
], AA.prototype, "cc", void 0);
__decorate([
    property()
], AA.prototype, "dd", void 0);
AA = __decorate([
    customElement('a-a')
], AA);
export { AA };

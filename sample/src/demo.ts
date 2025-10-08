import { BaseCustomWebComponentConstructorAppend, property, customElement, html, css } from '../../dist/BaseCustomWebComponent.js'

@customElement('a-a')
export class AA extends BaseCustomWebComponentConstructorAppend {
    
    static template = html`
        <div>[[this.bb]]</div>
        <div>[[this.dd]]</div>
        <input type="checkbox" .checked="{{this.ee}}">Value: [[this.ee]]
        `;

    static style = css`
    :host {
        font-size: 20px;
    }`

    @property()
    bb;

    @property()
    cc;

    @property()
    dd = '<img src="aa.jpg">';

    @property(Boolean)
    ee = false;

    constructor() {
        super();

        this._restoreCachedInititalValues();
        this._bindingsParse();
    }

    ready() {
        this._parseAttributesToProperties();
        this._bindingsRefresh();
    }
}
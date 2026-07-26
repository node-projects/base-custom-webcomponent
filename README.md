# base-custom-webcomponent

A small, dependency-free foundation for authoring native Web Components in
TypeScript. It provides Shadow DOM setup, reusable HTML and CSS template tags,
typed attribute parsing, lifecycle helpers, event wiring, optional Polymer-style
bindings, declarative custom elements, and development-time hot replacement.

> [!IMPORTANT]
> Binding expressions are evaluated as JavaScript. Unprefixed text bindings
> write to `innerHTML`; use `[[text:expression]]` or `bcw:text` for values that
> must be rendered literally. Treat component templates and intentionally bound
> HTML as trusted application code. Expression bindings also require a Content
> Security Policy that permits `unsafe-eval`.

## At a glance

- Native custom elements and open Shadow DOM
- Constructable stylesheets via `css`
- Reusable templates via `html`
- String, number, boolean, object, and array attribute conversion
- Named and expression-based event bindings
- One-way and two-way data bindings
- Conditional and repeated templates
- Five lifecycle/timing variants
- No runtime npm dependencies
- Optional declarative component definitions and hot replacement

The complete API and binding grammar are documented in the
[HTML specification](./docs/specification.html).

## Installation

```sh
npm install @node-projects/base-custom-webcomponent
```

The package is ESM-only:

```ts
import {
  BaseCustomWebComponentConstructorAppend,
  css,
  html,
} from '@node-projects/base-custom-webcomponent';
```

## Quick start

This example deliberately uses the static `properties` map. It works without
TypeScript's legacy decorator mode.

```ts
import {
  BaseCustomWebComponentConstructorAppend,
  css,
  html,
} from '@node-projects/base-custom-webcomponent';

export class CounterCard extends BaseCustomWebComponentConstructorAppend {
  static readonly is = 'counter-card';

  static readonly properties = {
    count: Number,
    label: String,
    disabled: Boolean,
  };

  static readonly template = html`
    <article>
      <span class:muted="[[this.disabled]]">
        [[this.label]]: [[this.count]]
      </span>
      <button @click="increment" ?disabled="[[this.disabled]]">
        Add one
      </button>
    </article>
  `;

  static readonly style = css`
    :host {
      display: block;
      font: 14px/1.5 system-ui, sans-serif;
    }

    article {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .muted {
      opacity: 0.55;
    }
  `;

  count = 0;
  label = 'Count';
  disabled = false;

  constructor() {
    super();

    // Restore values assigned before the custom element was upgraded.
    // Call this after field defaults have been initialized.
    this._restoreCachedInititalValues();
  }

  ready(): void {
    this._parseAttributesToProperties();
    this._assignEvents();
    this._bindingsParse();
  }

  increment(): void {
    this.count += 1;
    this._bindingsRefresh('count');
  }
}

customElements.define(CounterCard.is, CounterCard);
```

```html
<counter-card count="2" label="Items"></counter-card>
```

### What happens during construction

`BaseCustomWebComponentConstructorAppend`:

1. creates or adopts an open, serializable Shadow Root;
2. clones `static template`;
3. adopts `static style`;
4. appends the cloned template immediately; and
5. schedules `oneTimeSetup()` and `ready()` in a microtask.

The advanced features are opt-in. Call `_parseAttributesToProperties()`,
`_assignEvents()`, and `_bindingsParse()` only when the component needs them.

## Templates and styles

### `html`

`html` returns an `HTMLTemplateElement`.

```ts
static readonly template = html`
  <slot></slot>
  <button id="save">Save</button>
`;
```

Interpolated values are converted to strings and inserted into the template
source. They are not escaped:

```ts
const heading = 'Settings';
const template = html`<h2>${heading}</h2>`;
```

Use interpolation only with trusted, author-controlled values. Prefer bindings
for per-instance data.

`htmlFromString(value)` is available when the template starts as a string and
has the same trust requirement.

### `css`

`css` creates a constructable `CSSStyleSheet` with `replaceSync()`:

```ts
static readonly style = css`
  :host {
    display: block;
  }
`;
```

The base class accepts one stylesheet, an array of stylesheets, or a promise
that resolves to a stylesheet through the class-level `style` member.
`cssFromString(value)` converts a string, stylesheet, or CSS-module-style
`{ default: CSSStyleSheet }` value.

## Declaring properties

Property declarations tell `_parseAttributesToProperties()` how to convert
attributes. They do not make fields reactive and do not create
`observedAttributes`.

```ts
static readonly properties = {
  title: String,
  page: Number,
  active: Boolean,
  options: Object,
  items: Array,
};
```

| Declared type | Attribute behavior |
| --- | --- |
| `String` | The attribute value is assigned unchanged. |
| `Number` | Parsed with `parseFloat()`. |
| `Boolean` | Presence means `true`; absence is not processed. |
| `Object` | Parsed with `JSON.parse()`. |
| `Array` | Parsed with `JSON.parse()`. |

Property names map from camel case to dash case. For example,
`pageSize` reads from `page-size`.

Attribute parsing is a snapshot operation. Call
`_parseAttributesToProperties()` again if attributes were changed later, or
implement the platform's `observedAttributes` and `attributeChangedCallback`
in the component.

### Legacy `@property()` decorator

The library still supports TypeScript's legacy experimental decorator emit:

```ts
import { property } from '@node-projects/base-custom-webcomponent';

@property(Number)
count = 0;
```

This requires `"experimentalDecorators": true`. Standard ECMAScript decorators
are detected but currently throw `new decorators not yet supported! (need work)`.
The decorator records property metadata only; it does not automatically refresh
bindings. Complex decorator options are present in the type surface, but the
base class currently uses only the property's type during attribute parsing.

For new components, prefer the explicit static `properties` map until standard
decorator support is complete.

## Lifecycle variants

Choose the timing model intentionally:

| Base class | Template append | `ready()` timing | `oneTimeSetup()` |
| --- | --- | --- | --- |
| `BaseCustomWebComponentNoAttachedTemplate` | Never | Never | Never |
| `BaseCustomWebComponentConstructorAppend` | Synchronously in the constructor | Next microtask | Once per subclass, next microtask |
| `BaseCustomWebComponentLazyAppend` | Next microtask | After the append in that microtask | Once per subclass |
| `BaseCustomWebComponentConnectedReady` | Synchronously in the constructor | First connection | Not called |
| `BaseCustomWebComponentLazyAppendConnectedReady` | Next microtask | First connection | Not called |
| `BaseCustomWebComponentConstructorAppendLazyReady` | Synchronously in the constructor | Next animation frame | Once per subclass |

`ready()` is a library hook, not a browser lifecycle callback. The constructor
variants may call it before the element is connected. Use a connected variant
when connection to a document is required.

`oneTimeSetup()` is called once per subclass, not once per instance.

### Waiting for child definitions

```ts
async ready(): Promise<void> {
  await this._waitForChildrenReady();
  // Undefined custom elements currently present in this Shadow Root are now
  // registered. This does not wait for their custom ready() methods.
}
```

## DOM helpers

Inside a subclass:

```ts
const save = this._getDomElement<HTMLButtonElement>('save');
const rows = this._getDomElements<HTMLElement>('[data-row]');
```

`_getDomElement()` searches by ID and `_getDomElements()` uses
`querySelectorAll()`. The latter returns a plain array type in the public API,
although the implementation currently casts the browser's `NodeList`.

The exported `DomHelper` class also provides traversal, child removal, index,
host, and ancestor helpers that can cross open Shadow Roots.

## Event bindings

### Named handlers

```ts
static readonly template = html`
  <button @click="save">Save</button>
`;

ready(): void {
  this._assignEvents();
}

save(event: MouseEvent): void {
  // ...
}
```

`_assignEvents()` scans the Shadow Root recursively and binds methods to native
DOM events. If a matching element property is a `TypedEvent`, it subscribes
with `TypedEvent.on()` instead.

### Expression handlers

Expression handlers are parsed by `_bindingsParse()`:

```html
<button @click="[[this.select(item, event, sender)]]">Select</button>
```

The special variables are:

- `event`: the dispatched event;
- `sender`: the element that owns the binding;
- repeat variables such as `item` and `index`; and
- any values supplied through the optional binding context.

Expression handlers execute with `eval()`. Use them only in trusted templates.
Prefer named handlers where possible because they are easier to type, test, and
use with a strict Content Security Policy.

### Touch-friendly context menus

```html
<div @touch:contextmenu="openMenu"></div>
```

`addTouchFriendlyContextMenu()` combines the native `contextmenu` event with a
500 ms touch hold. A matching `removeTouchFriendlyContextMenu()` helper is
exported.

## Binding grammar

Bindings are optional. Activate them with `_bindingsParse()` and refresh them
after state changes with `_bindingsRefresh()`. Pass a top-level property name
to refresh only expressions that can depend on it.

### One-way bindings

```html
<span>[[this.message]]</span>
<span>[[text:this.untrustedMessage]]</span>
<span bcw:text="[[this.untrustedMessage]]"></span>
<input .value="[[this.message]]">
<a $aria-label="[[this.message]]"></a>
<button ?disabled="[[this.busy]]">Save</button>
```

| Form | Target |
| --- | --- |
| `name="[[expression]]"` | The camel-cased DOM property. |
| `.name="[[expression]]"` | The DOM property, while making intent explicit. |
| `$name="[[expression]]"` | A string attribute; falsey values remove it. |
| `?name="[[expression]]"` | A boolean attribute; truthy adds it. |
| Text `[[expression]]` | `innerHTML` of the generated binding container. |
| Text `[[text:expression]]` | Safe literal text through `textContent`. |
| `bcw:text="[[expression]]"` | Replace an element's contents with safe literal text. |

Prefix an expression with `?` to convert `null`, `undefined`, and other falsey
values to an empty string:

```html
<span>[[?this.optionalText]]</span>
<span>[[text:?this.optionalText]]</span>
```

Prefer the `text:` prefix for inline interpolation and `bcw:text` when the
element itself is the binding target. Both render characters such as `<`, `>`,
and `&` literally and never parse the result as markup. The prefix is scoped to
text-node interpolation; other binding targets continue to use their documented
property or attribute behavior.

### Two-way bindings

```html
<input .value="{{this.name}}">
<input .checked="{{this.enabled::change}}">
<textarea .value="{{this.notes::change;paste}}"></textarea>
```

Default events are:

- `input` for text inputs and textareas;
- `change` for checkboxes and selects; and
- `<property>-changed` for other elements.

Override the event list after `::`, separating multiple events with semicolons.
The event listener reads the target property or attribute and writes the value
back to the bound path.

### CSS, class, and visibility

```html
<div css:background-color="[[this.accent]]"></div>
<div class:selected="[[this.selected]]"></div>
<section bcw:visible="[[this.open]]"></section>
<output bcw:text="[[this.status]]"></output>
```

`bcw:visible` switches the inline `display` value between its initial value and
`none`. `bcw:text` replaces the element's contents through `textContent`.

### Conditional templates

```html
<template if="[[this.hasResults]]">
  <p>Results are available.</p>
</template>
```

When the expression becomes truthy, the template content is cloned and parsed
for nested bindings. When it becomes falsey, the cloned top-level elements are
removed.

### Repeated templates

```html
<template
  repeat:item="[[this.items]]"
  repeat-index="itemIndex"
  repeat-changed-item-callback="[[this.itemChanged(item, nodes, callbackType)]]"
>
  <button @click="[[this.select(item)]]">
    [[itemIndex + 1]]. [[item.label]]
  </button>
</template>
```

- `repeat:item` names the value variable.
- `index` is the default index variable.
- `repeat-index` changes the index variable name.
- `nodes` contains the cloned top-level elements.
- `callbackType` is `"create"` or `"remove"`.

Any iterable is accepted and converted to an array. Repeated instances are
reconciled by item identity:

- unchanged items keep their existing DOM nodes;
- reordered items move their existing nodes;
- new identities create new instances; and
- removed identities run the remove callback and detach their nodes.

Duplicate values are matched in occurrence order. There is no explicit key
expression yet, so replacing an object with a new object that has the same
logical ID still creates a new repeat instance.

### Refresh behavior

```ts
this.message = 'Saved';
this._bindingsRefresh('message');
```

The parser records direct top-level dependencies such as `this.message`.
`_bindingsRefresh('message')` evaluates matching bindings and bindings nested
under a repeat sourced from that property. Calling `_bindingsRefresh()` without
a property retains the refresh-all behavior.

Dynamic bracket access, component method calls, and expressions whose
dependencies cannot be determined statically remain conservatively subscribed
to every targeted refresh. `onlyWhenChanged` can prevent some redundant DOM
assignments after an expression has been evaluated.

## Declarative custom elements

Importing the package registers `<node-projects-dce>`. It can define a custom
element without a JavaScript subclass:

```html
<node-projects-dce
  name="status-pill"
  enable-bindings
  properties='{
    "label": "String",
    "active": {
      "type": "Boolean",
      "reflect": true,
      "default": false
    }
  }'
>
  <template>
    <span class:active="[[this.active]]">[[this.label]]</span>
  </template>

  <style type="adopted-css">
    :host { display: inline-block; }
    .active { color: seagreen; }
  </style>
</node-projects-dce>

<status-pill label="Online" active></status-pill>
```

Call `upgradeAllInstances()` on the defining `<node-projects-dce>` element after
changing its template or adopted styles. Declarative definitions use globals on
`window`, so custom element names must be unique and trusted.

> [!NOTE]
> `DeclaritiveBaseCustomWebcomponent` is misspelled in the existing module and
> filenames for compatibility. The declarative element itself is
> `<node-projects-dce>`.

## Hot module replacement

```ts
import { HotModuleReplacement } from '@node-projects/base-custom-webcomponent';

HotModuleReplacement.initHMR(async () => {
  const response = await fetch('/changed-files');
  return response.ok ? response.json() : null;
});
```

The callback is polled every 100 ms by default and returns changed JavaScript
or CSS module URLs. HMR is development-only. It replaces template/style state
and patches class members in place; complex module graphs and component state
may still require a full reload.

## Utility exports

| Export | Purpose |
| --- | --- |
| `TypedEvent<T>` | Typed subscribe/emit event helper with `on`, `once`, `single`, `off`, and `pipe`. |
| `PropertyChangedArgs<T>` | Carries `newValue` and `oldValue`. |
| `WeakArray<T>` | Iterable weak collection built from `WeakRef` and `FinalizationRegistry`. |
| `DomHelper` | DOM and open-Shadow-DOM traversal helpers. |
| `LazyLoader` | Loads scripts or text resources. |
| `debounce` | Leading or trailing debounce helper. |
| `addTouchFriendlyContextMenu` | Adds context-menu and long-press behavior. |
| `removeTouchFriendlyContextMenu` | Removes touch-friendly context-menu behavior. |
| `HotModuleReplacement` | Development-time JavaScript and CSS replacement. |

## Browser and toolchain requirements

The library targets ES2023 and modern evergreen browsers. Its core path relies
on:

- Custom Elements, Shadow DOM, templates, and ES modules;
- constructable `CSSStyleSheet` and `adoptedStyleSheets`;
- `queueMicrotask()` and `requestAnimationFrame()`; and
- `WeakRef` and `FinalizationRegistry` when `WeakArray` or HMR are used.

Constructable stylesheets have been broadly available across current engines
since 2023, so Safari and Firefox no longer require the polyfill mentioned in
older versions of this README. Serializable Shadow Roots are newer (Baseline
2024); test older supported browsers if serialization matters.

Useful compatibility references:

- [Web Components on MDN](https://developer.mozilla.org/docs/Web/API/Web_components)
- [`CSSStyleSheet.replaceSync()` on MDN](https://developer.mozilla.org/docs/Web/API/CSSStyleSheet/replaceSync)
- [`ShadowRoot.serializable` on MDN](https://developer.mozilla.org/docs/Web/API/ShadowRoot/serializable)
- [TypeScript legacy decorators](https://www.typescriptlang.org/tsconfig/experimentalDecorators.html)

No browser polyfills are bundled.

## Security and CSP

The binding engine is intentionally powerful and intentionally trusted:

- expressions and expression event handlers use direct `eval()`;
- unprefixed text bindings write values as HTML;
- `[[text:expression]]` and `bcw:text` write literal text through `textContent`;
- `html` and `htmlFromString` assign to `template.innerHTML`; and
- declarative components can execute expressions from markup.

Consequences:

1. Never build templates or expressions from untrusted data.
2. Prefer explicit text bindings for user-controlled strings; sanitize values
   that intentionally use an HTML-bearing target.
3. Do not enable declarative component definitions for user-authored markup.
4. A strict CSP without `unsafe-eval` is incompatible with expression bindings.
5. Named event handlers and manual DOM updates avoid most of these constraints.

The base class, static templates/styles, attribute parsing, DOM helpers, and
named event wiring can be used without the expression binding engine.

## Known limitations

- Bindings are manually refreshed; method calls and dynamic expressions cannot
  be dependency-filtered precisely.
- Repeats reconcile by identity but do not support explicit application keys.
- Expression bindings are not compatible with strict `script-src` CSP.
- Standard ECMAScript decorators are not implemented.
- Property declarations do not observe later attribute changes.
- `ready()` timing varies by base class and is not a platform callback.
- HMR is experimental and intended only for development.

## Development

The development toolchain requires Node.js 22 or newer.

```sh
npm ci
npm run check
npm start
```

Available scripts:

| Script | Purpose |
| --- | --- |
| `npm run build` | Compile the library and create the minified bundle. |
| `npm run tsc` | Compile `src/` to `dist/` and emit declarations. |
| `npm run bundle` | Bundle and minify `dist/index.js` into `dist/index-min.js`. |
| `npm test` | Compile the library and run the browser regression suite once. |
| `npm run test:watch` | Run browser tests continuously while developing. |
| `npm run test:coverage` | Run browser tests with an Istanbul coverage report. |
| `npm run check` | Run the library build, demo compile, and browser tests. |
| `npm start` | Serve and open `sample/index.html`. Run the build first. |
| `npm run tsc-demo` | Compile the demo application. |

`prepublishOnly` runs the complete library build. The generated
`dist/` directory is excluded from Git but included in the npm package after a
publish build.

## Project status and direction

The project is useful as a lightweight, understandable layer over browser
primitives. The clearest next improvements are:

1. expand the initial browser regression suite to cover the remaining helpers,
   HMR branches, malformed attributes, and multi-root repeat edge cases;
2. add package-content assertions and cross-browser jobs to CI;
3. define a smaller stable core and move HMR/declarative/utility features to
   explicit subpath exports;
4. replace or isolate `eval()`-based bindings and provide a strict-CSP path;
5. implement standard decorators or formally keep the static property map as
   the supported API;
6. enable stricter TypeScript options and remove the remaining `any` and
   `@ts-ignore` debt; and
7. align npm and JSR metadata, including versions and export maps.

See [ideas.md](./ideas.md) for additional experimental directions.

## License

[BSD 3-Clause](./LICENSE)

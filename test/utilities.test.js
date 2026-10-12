import {
    BaseCustomWebComponentConstructorAppend,
    BaseCustomWebComponentNoAttachedTemplate,
    DomHelper,
    HotModuleReplacement,
    LazyLoader,
    PropertyChangedArgs,
    TypedEvent,
    WeakArray,
    customElement,
    debounce,
    getFunctionType,
    html,
    property,
} from '../dist/index.js';
import { assert, deepEqual, equal } from './assertions.js';

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

describe('exported utilities', () => {
    afterEach(() => {
        document.body.replaceChildren();
        BaseCustomWebComponentNoAttachedTemplate.instanceCreatedCallback = null;
    });

    it('supports persistent, one-shot, single, disposable, and piped typed listeners', () => {
        const source = new TypedEvent();
        const target = new TypedEvent();
        const received = [];

        const persistent = value => received.push(`on:${value}`);
        const subscription = source.on(persistent);
        source.once(value => received.push(`once:${value}`));
        const firstSingle = source.single(value => received.push(`old-single:${value}`));
        const currentSingle = source.single(value => received.push(`single:${value}`));
        firstSingle.dispose();
        target.on(value => received.push(`pipe:${value}`));
        const pipe = source.pipe(target);

        source.emit('first');
        subscription.dispose();
        pipe.dispose();
        currentSingle.dispose();
        source.off(persistent);
        source.emit('second');

        deepEqual(received, [
            'on:first',
            'pipe:first',
            'once:first',
            'single:first',
        ]);

        const args = new PropertyChangedArgs('new', 'old');
        equal(args.newValue, 'new');
        equal(args.oldValue, 'old');
    });

    it('iterates and explicitly removes weak references', () => {
        const values = new WeakArray();
        const first = { id: 1 };
        const second = { id: 2 };
        const firstReference = values.add(first);
        values.add(second);

        deepEqual(Array.from(values).map(value => value.id), [1, 2]);
        values.remove(firstReference);
        deepEqual(Array.from(values).map(value => value.id), [2]);
    });

    it('debounces trailing calls and supports immediate calls with the original context', async () => {
        const trailingContext = {
            total: 0,
            update: null,
        };
        trailingContext.update = debounce(function (value) {
            this.total += value;
        }, 10);

        trailingContext.update(1);
        trailingContext.update(3);
        await wait(30);
        equal(trailingContext.total, 3);

        const values = [];
        const immediate = debounce(value => values.push(value), 10, true);
        immediate('first');
        immediate('ignored');
        deepEqual(values, ['first']);
        await wait(30);
        immediate('after-wait');
        deepEqual(values, ['first', 'after-wait']);
    });

    it('walks, indexes, removes, and locates regular and shadow DOM nodes', () => {
        const outer = document.createElement('article');
        outer.innerHTML = `
            text
            <div id="first"><span id="nested"></span></div>
            <div id="second"></div>
        `;
        document.body.append(outer);

        const host = document.createElement('bcw-dom-helper-host');
        const shadow = host.attachShadow({ mode: 'open' });
        shadow.innerHTML = '<section id="shadow-section"><b id="shadow-child"></b></section>';
        outer.querySelector('#second').append(host);

        const regularNodes = Array.from(DomHelper.getAllChildNodes(outer));
        const shadowNodes = Array.from(DomHelper.getAllChildNodes(outer, true));
        assert(!regularNodes.includes(shadow));
        assert(shadowNodes.includes(shadow));
        assert(shadowNodes.includes(shadow.getElementById('shadow-child')));

        const ignored = Array.from(DomHelper.getAllChildNodes(outer, true, [host]));
        assert(ignored.includes(host));
        assert(!ignored.includes(shadow));

        const first = outer.querySelector('#first');
        const second = outer.querySelector('#second');
        equal(DomHelper.childIndex(first), 0);
        equal(DomHelper.childIndex(second), 1);
        equal(DomHelper.nodeIndex(first), 1, 'the leading text node is a sibling');
        equal(DomHelper.nodeIsChildOf(first.querySelector('#nested'), outer), true);
        equal(DomHelper.nodeIsChildOf(outer, first), false);
        equal(DomHelper.getHost(shadow.getElementById('shadow-child')), host);
        equal(DomHelper.findParentNodeOfWithLocalName(shadow.getElementById('shadow-child'), 'article'), outer);
        equal(DomHelper.findParentNodeOfType(first.querySelector('#nested'), HTMLDivElement), first);
        equal(DomHelper.findParentNodeOfWithLocalName(outer, 'main'), null);

        const removable = document.createElement('div');
        removable.innerHTML = '<i class="remove"></i><span><i class="remove"></i></span><b></b>';
        DomHelper.removeAllChildnodes(removable, '.remove');
        equal(removable.children.length, 2);
        equal(removable.querySelector('span .remove') !== null, true, 'nested matches remain');
        DomHelper.removeAllChildnodes(removable);
        equal(removable.childNodes.length, 0);
    });

    it('loads scripts once, loads script batches, and reports text-loading failures', async () => {
        window.__bcwLazyLoaderValues = [];
        const firstUrl = 'data:text/javascript,window.__bcwLazyLoaderValues.push(%22first%22)';
        const secondUrl = 'data:text/javascript,window.__bcwLazyLoaderValues.push(%22second%22)';

        equal(await LazyLoader.LoadJavascript(firstUrl), true);
        equal(await LazyLoader.LoadJavascript(firstUrl), false);
        deepEqual(await LazyLoader.LoadJavascripts(firstUrl, secondUrl), [false, true]);
        deepEqual(window.__bcwLazyLoaderValues, ['first', 'second']);

        const text = await LazyLoader.LoadText('/test/fixtures/lazy-loader.txt');
        equal(text.trim(), 'loaded as plain text');

        const NativeXmlHttpRequest = window.XMLHttpRequest;
        class FailedXmlHttpRequest {
            status = 503;
            statusText = 'Service Unavailable';

            open() {}
            overrideMimeType() {}
            send() {
                this.onload();
            }
        }

        let failure;
        try {
            window.XMLHttpRequest = FailedXmlHttpRequest;
            await LazyLoader.LoadText('/simulated-failure.txt');
        } catch (error) {
            failure = error;
        } finally {
            window.XMLHttpRequest = NativeXmlHttpRequest;
        }
        equal(failure.status, 503);
        equal(failure.statusText, 'Service Unavailable');
        delete window.__bcwLazyLoaderValues;
    });

    it('registers legacy decorators without mutating inherited property maps', () => {
        class DecoratedBase extends BaseCustomWebComponentConstructorAppend {
            static template = html``;
        }
        property(Number)(DecoratedBase.prototype, 'count');
        property({ type: Boolean, reflect: true })(DecoratedBase.prototype, 'active');

        class DecoratedChild extends DecoratedBase {}
        property()(DecoratedChild.prototype, 'label');

        equal(DecoratedBase.properties.count, Number);
        equal(DecoratedBase.properties.active.type, Boolean);
        equal(DecoratedBase.properties.label, undefined);
        equal(DecoratedChild.properties.count, Number);
        equal(DecoratedChild.properties.label, String);

        customElement('bcw-utility-decorated')(DecoratedChild);
        equal(DecoratedChild.is, 'bcw-utility-decorated');
        equal(customElements.get('bcw-utility-decorated'), DecoratedChild);
    });

    it('reports both unsupported standard-decorator configurations clearly', () => {
        const decorator = property();
        let missingMetadataError;
        let unsupportedError;

        try {
            decorator({}, { metadata: null });
        } catch (error) {
            missingMetadataError = error;
        }
        try {
            decorator({}, { metadata: {} });
        } catch (error) {
            unsupportedError = error;
        }

        equal(missingMetadataError.message, 'missing-class-metadata or polyfill-symbol-metadata');
        equal(unsupportedError.message, 'new decorators not yet supported! (need work)');
    });

    it('classifies function shapes and routes changed file types for HMR', async () => {
        class ExampleClass {}
        function exampleFunction() {}
        const arrow = () => {};
        const asyncArrow = async () => {};

        equal(getFunctionType(ExampleClass), 'class');
        equal(getFunctionType(exampleFunction), 'function');
        equal(getFunctionType(arrow), 'arrow');
        equal(getFunctionType(asyncArrow), 'async');
        equal(getFunctionType({}), '');

        const reloaded = [];
        const originalReloadCss = HotModuleReplacement.reloadCss;
        const originalReloadJs = HotModuleReplacement.reloadJs;
        const originalWarn = console.warn;
        const originalEnabled = HotModuleReplacement.enabled;
        HotModuleReplacement.reloadCss = file => reloaded.push(`css:${file}`);
        HotModuleReplacement.reloadJs = file => reloaded.push(`js:${file}`);
        console.warn = () => {};
        try {
            HotModuleReplacement.setEnabled(false, false);
            await HotModuleReplacement.assertChangedFiles(['/component.js']);
            deepEqual(reloaded, []);

            HotModuleReplacement.setEnabled(true, false);
            await HotModuleReplacement.assertChangedFiles([
                'theme.CSS',
                'component.js',
                'worker.mjs',
                'legacy.cjs',
                'notes.txt',
            ]);
        } finally {
            HotModuleReplacement.setEnabled(originalEnabled, false);
            HotModuleReplacement.reloadCss = originalReloadCss;
            HotModuleReplacement.reloadJs = originalReloadJs;
            console.warn = originalWarn;
        }

        deepEqual(reloaded, [
            'css:theme.CSS',
            'js:component.js',
            'js:worker.mjs',
            'js:legacy.cjs',
        ]);

        HotModuleReplacement.enableHMR();
        document.createElement('bcw-utility-decorated');
        let created;
        BaseCustomWebComponentNoAttachedTemplate.instanceCreatedCallback = instance => {
            created = instance;
        };
        const instance = document.createElement('bcw-utility-decorated');
        equal(created, instance);
    });
});

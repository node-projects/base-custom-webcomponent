import { BaseCustomWebComponentNoAttachedTemplate } from "./BaseCustomWebComponent";

export class HotModuleReplacement {

    private static changesFetcher: () => Promise<string[]>;

    private static instances: WeakRef<any>[] = [];
    private static classes = new Set();

    public static initHMR(fetchChangedFiles: () => Promise<string[]>) {
        HotModuleReplacement.changesFetcher = fetchChangedFiles;

        let customElementsRegistry = window.customElements;
        const registry: any = {};
        registry.define = function (name, constructor, options) {
            HotModuleReplacement.classes.add(constructor);
            customElementsRegistry.define(name, constructor, options);
        }
        registry.get = function (name) {
            return customElementsRegistry.get(name);
        }
        registry.upgrade = function (node) {
            return customElementsRegistry.upgrade(node);
        }
        registry.whenDefined = function (name) {
            return customElementsRegistry.whenDefined(name);
        }

        Object.defineProperty(window, "customElements", {
            get() {
                return registry
            }
        });

        BaseCustomWebComponentNoAttachedTemplate.instanceCreatedCallback = (i) => {
            HotModuleReplacement.instances.push(new WeakRef(i));
            HotModuleReplacement.classes.add(i.constructor);
        }

        HotModuleReplacement.startPolling();
    }

    public static startPolling(interval = 100) {
        setTimeout(() => {
            HotModuleReplacement.pollForChanges(interval);
        }, interval);
    }

    private static async pollForChanges(interval: number) {
        let changes = await HotModuleReplacement.changesFetcher()
        if (changes != null) {
            for (let file of changes) {
                HotModuleReplacement.assertFileType(file);
            }
        }
        setTimeout(() => {
            HotModuleReplacement.pollForChanges(interval);
        }, interval);
    }

    private static assertFileType(file: string) {
        switch (file.trim().toLowerCase().split(".").pop()) {
            case "css":
                console.warn("🔥 Hot reload - css: " + file);
                HotModuleReplacement.reloadCss(file);
                break;
            case "js":
            case "cjs":
            case "mjs":
                console.warn("🔥 Hot reload - js: " + file);
                HotModuleReplacement.reloadJs(file);
                break;
            default:
                break;
        }
    }
    static async reloadJs(file: string) {
        let oldDefine = customElements.define
        customElements.define = () => null;
        let imported_modules = await import(file + "?reload=" + new Date().getTime());
        customElements.define = oldDefine;

        let changedElements = []
        for (let module in imported_modules) {
            changedElements.push(imported_modules[module])
        }

        for (let element of changedElements) {
            let i = HotModuleReplacement.instances.length;
            while (i--) {
                let instanceRef = HotModuleReplacement.instances[i];
                let instance = instanceRef.deref();
                if (instance) {
                    if (element.name == instance.constructor.name) {
                        instance._hmrCallback(element);
                    }
                } else {
                    HotModuleReplacement.instances.splice(i, 1);
                }
            }
        }

        HotModuleReplacement.classes.forEach((c) => {
            for (let element of changedElements) {
                //@ts-ignore
                if (c.name == element.name) {

                    // Gets all attribute-properties of class
                    let properties = Object.getOwnPropertyNames(c);

                    for (let property of properties) {
                        if (property == 'prototype' || property == 'name' || property == 'length') continue;
                        delete c[property];
                        try {
                            c[property] = element[property];
                            //@ts-ignore
                        } catch (err) { console.error("🔥 Hot reload - error setting property '" + property + "' of '" + c.name + "'", err); }
                    }

                    //@ts-ignore
                    // Gets properties of prototype, including functions of class
                    properties = Object.getOwnPropertyNames(c.prototype);

                    for (let property of properties) {
                        if (property == 'prototype' || property == 'name' || property == 'length') continue;
                        delete c[property];
                        try {
                            //@ts-ignore
                            c.prototype[property] = element.prototype[property];
                            //@ts-ignore
                        } catch (err) { console.error("🔥 Hot reload - error setting property '" + property + "' of '" + c.name + "'", err); }
                    }
                }
            }
        });
    }

    // Change the url of the stylesheet to force a reload
    private static reloadCss(file: string) {
        for (let styleSheet of HotModuleReplacement.queryStyleSheets()) {
            if (styleSheet.includes(file.split("?")[0])) {
                // attribute href in Link-Element does not contain Base-Uri
                let link = document.querySelectorAll<HTMLLinkElement>(`link[href*="${file}"]`)[0];
                if (link) {
                    link.href = link.href.split("?")[0] + "?reload=" + new Date().getTime();
                }
            }
        }
    }

    private static queryStyleSheets() {
        let list = document.querySelectorAll<HTMLLinkElement>("link[rel=stylesheet]");
        let styleSheets = []
        for (let element of list) {
            styleSheets.push(element.href);
        }

        return styleSheets
    }
} 
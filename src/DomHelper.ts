export class DomHelper {
    static * getAllChildNodes(element: ParentNode, includeShadowDom = false, ignore?: Node[]): IterableIterator<Node> {
        if (!ignore || ignore.indexOf(<Node><any>element) < 0) {
            if (element.children) {
                for (const node of element.children) {
                    yield node;
                    const childs = DomHelper.getAllChildNodes(node, includeShadowDom, ignore);
                    for (const cnode of childs) {
                        yield cnode;
                    }
                }
            }
            if (includeShadowDom && (<any>element).shadowRoot != null) {
                yield (<any>element).shadowRoot;
                const childs = DomHelper.getAllChildNodes((<any>element).shadowRoot, includeShadowDom, ignore);
                for (const cnode of childs) {
                    yield cnode;
                }
            }
        }
        return null;
    }

    static removeAllChildnodes(node: Node, selector?: string) {
        if (!selector) {
            for (let c = node.firstChild; c !== null; c = node.firstChild) {
                node.removeChild(c);
            }
        } else {
            const elements = (<HTMLElement>node).querySelectorAll(selector);
            for (const e of elements) {
                if (e.parentNode == node)
                    node.removeChild(e);
            }
        }
    }

    static nodeIndex(node: Node) {
        let i = 0;
        while ((node = node.previousSibling) != null)
            i++;
        return i;
    }

    static childIndex(node: Node) {
        for (let i = 0; i < node.parentElement.children.length; i++)
            if (node.parentElement.children[i] == node)
                return i;
        return -1;
    }

    static getHost(node: Node) {
        return (<ShadowRoot>node.getRootNode())?.host;
    }

    static nodeIsChildOf(node: Node, parentNode: Node) {
        while (node.parentElement) {
            if (node.parentElement == parentNode)
                return true;
            node = node.parentElement;
        }
        return false;
    }

    static findParentNodeOfWithLocalName(element, localName: string) {
        let el = element;
        while (true) {
            if (el.parentElement != null) {
                el = el.parentElement;
            } else if (el.parentNode != null && el.parentNode.host != null) {
                el = el.parentNode.host;
            } else {
                break;
            }

            if (el.localName == localName) {
                return el;
            }
        }
        return null;
    }

    static findParentNodeOfType<T>(element, type: new (...args: any[]) => T): T {
        let el = element;
        while (true) {
            if (el.parentElement != null) {
                el = el.parentElement;
            } else if (el.parentNode != null && el.parentNode.host != null) {
                el = el.parentNode.host;
            } else {
                break;
            }

            if (el instanceof type) {
                return el;
            }
        }
        return null;
    }
}
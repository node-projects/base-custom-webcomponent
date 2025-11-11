import type { BaseCustomWebComponentNoAttachedTemplate } from "./BaseCustomWebComponent.js";

export function customElement(tagname: string) {
    return function (class_: (new (...par) => BaseCustomWebComponentNoAttachedTemplate)) {
        //@ts-ignore
        class_.is = tagname;

        customElements.define(tagname, class_);
    }
}

type propertySimpleDefinition = Object | BooleanConstructor | DateConstructor | NumberConstructor | StringConstructor | ArrayConstructor | ObjectConstructor //| Object //| (new (...args: any[]) => object)
type propertyComplexDefinition = { type: propertySimpleDefinition; readonly?: boolean, reflect?: boolean, attribute?: string, noattribute?: boolean, default?: any, group?: string, description?: string };
type propertyDefinition = propertyComplexDefinition | propertySimpleDefinition;

declare global {
    var baseCustomWebComponentPropertyMetadata: WeakMap<
        object,
        Map<PropertyKey, propertyDefinition>
    >;
}

globalThis.baseCustomWebComponentPropertyMetadata ??= new WeakMap<
    object,
    Map<PropertyKey, propertyDefinition>
>();

type Interface<T> = {
    [K in keyof T]: T[K];
};

const legacyProperty = (
    par: propertyDefinition | undefined,
    proto: Object,
    name: PropertyKey
) => {
    //@ts-ignore
    if (!Object.hasOwn(proto.constructor, 'properties')) {
        //@ts-ignore
        if (proto.constructor.properties)
            //@ts-ignore
            Object.defineProperty(proto.constructor, 'properties', { value: { ...proto.constructor.properties }, writable: true, configurable: true });
        else
            //@ts-ignore
            proto.constructor.properties = {};
    }
    if (par && (<propertyComplexDefinition>par).type != null) {
        //@ts-ignore
        proto.constructor.properties[name] = (<propertyComplexDefinition>par);
    }
    else {
        //@ts-ignore
        proto.constructor.properties[name] = par ? par : String;
    }
};

/*export function standardProperty(par?: propertyDefinition) {
    return function (target: any, context: propertyDecoratorContext) {
        //@ts-ignore
        if (!target.constructor.properties) {
            //@ts-ignore
            target.constructor.properties = {};
        }
        if (par && (<propertyComplexDefinition>par).type != null) {
            //@ts-ignore
            target.constructor.properties[context.name] = (<propertyComplexDefinition>par).type ? (<propertyComplexDefinition>par).type : String;
        }
        else {
            //@ts-ignore
            target.constructor.properties[context.name] = par ? par : String;
        }
    }
}*/

// Temporary type, until google3 is on TypeScript 5.2
type StandardPropertyContext<C, V> = (
    | ClassAccessorDecoratorContext<C, V>
    | ClassSetterDecoratorContext<C, V>
) & { metadata: object };

const defaultPropertyDefinition: propertyDefinition = {
    attribute: true,
    type: String,
    reflect: false
};

/*
const standardProperty = <C extends Interface<BaseCustomWebComponentNoAttachedTemplate>, V>(
  options: propertyDefinition = defaultPropertyDefinition,
  target: ClassAccessorDecoratorTarget<C, V> | ((value: V) => void),
  context: StandardPropertyContext<C, V>
): ClassAccessorDecoratorResult<C, V> | ((this: C, value: V) => void) => {
  const {kind, metadata} = context;

  if (metadata == null) {
    throw new Error('missing-class-metadata or polyfill-symbol-metadata');
  }

  let properties = globalThis.litPropertyMetadata.get(metadata);
  if (properties === undefined) {
    globalThis.litPropertyMetadata.set(metadata, (properties = new Map()));
  }
  if (kind === 'setter') {
    options = Object.create(options);
    //options.wrapped = true;
  }
  properties.set(context.name, options);

  if (kind === 'accessor') {
    const {name} = context;
    return {
      set(this: BaseCustomWebComponentNoAttachedTemplate, v: V) {
        const oldValue = (
          target as ClassAccessorDecoratorTarget<C, V>
        ).get.call(this as unknown as C);
        (target as ClassAccessorDecoratorTarget<C, V>).set.call(
          this as unknown as C,
          v
        );
        //this.requestUpdate(name, oldValue, options);
      },
      init(this: BaseCustomWebComponentNoAttachedTemplate, v: V): V {
        if (v !== undefined) {
          this._$changeProperty(name, undefined, options, v);
        }
        return v;
      },
    } as unknown as ClassAccessorDecoratorResult<C, V>;
  } else if (kind === 'setter') {
    const {name} = context;
    return function (this: BaseCustomWebComponentNoAttachedTemplate, value: V) {
      const oldValue = this[name as keyof ReactiveElement];
      (target as (value: V) => void).call(this, value);
      this.requestUpdate(name, oldValue, options);
    } as unknown as (this: C, value: V) => void;
  }
  throw new Error(`Unsupported decorator location: ${kind}`);
};
*/

const standardProperty = <C extends Interface<BaseCustomWebComponentNoAttachedTemplate>, V>(
    options: propertyDefinition,
    target: ClassAccessorDecoratorTarget<C, V> | ((value: V) => void),
    context: StandardPropertyContext<C, V>
): ClassAccessorDecoratorResult<C, V> | ((this: C, value: V) => void) => {
    const { metadata } = context;

    if (metadata == null) {
        throw new Error('missing-class-metadata or polyfill-symbol-metadata');
    }

    let properties = globalThis.baseCustomWebComponentPropertyMetadata.get(metadata);
    if (properties === undefined) {
        globalThis.baseCustomWebComponentPropertyMetadata.set(metadata, (properties = new Map()));
    }

    throw new Error('new decorators not yet supported! (need work)');
}

// Overload for legacy
export function property(options?: propertyDefinition): PropertyDecorator;

// Overload for standard
export function property<C, V>(
    options?: propertyDefinition
): (
    target: ClassAccessorDecoratorTarget<C, V> | ((value: V) => void),
    context: ClassAccessorDecoratorContext<C, V> | ClassSetterDecoratorContext<C, V>
) => ClassAccessorDecoratorResult<C, V> | void;

// Implementation
export function property(options?: propertyDefinition) {
    return (
        protoOrTarget: any,
        nameOrContext: any
    ) => {
        if (typeof nameOrContext === "object") {
            // ✅ Standard decorator path
            return standardProperty(options ?? defaultPropertyDefinition, protoOrTarget, nameOrContext);
        } else {
            // ✅ Legacy decorator path
            return legacyProperty(options, protoOrTarget, nameOrContext);
        }
    };
}
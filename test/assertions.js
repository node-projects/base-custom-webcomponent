export function assert(condition, message = 'Expected condition to be true') {
    if (!condition)
        throw new Error(message);
}

export function equal(actual, expected, message = 'Values are not equal') {
    if (!Object.is(actual, expected)) {
        throw new Error(
            `${message}\nExpected: ${format(expected)}\nActual:   ${format(actual)}`,
        );
    }
}

export function deepEqual(actual, expected, message = 'Values are not deeply equal') {
    const actualJson = JSON.stringify(actual);
    const expectedJson = JSON.stringify(expected);
    if (actualJson !== expectedJson) {
        throw new Error(
            `${message}\nExpected: ${expectedJson}\nActual:   ${actualJson}`,
        );
    }
}

export function format(value) {
    if (typeof value === 'string')
        return JSON.stringify(value);
    return String(value);
}

export async function nextMicrotask() {
    await Promise.resolve();
}

export async function nextFrame() {
    await new Promise(resolve => requestAnimationFrame(resolve));
}

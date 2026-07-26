import { equal } from './assertions.js';

const loadSample = path => new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    const timeout = setTimeout(() => reject(new Error(`Timed out loading ${path}`)), 5000);
    frame.addEventListener('load', () => {
        clearTimeout(timeout);
        resolve(frame);
    }, { once: true });
    frame.addEventListener('error', () => {
        clearTimeout(timeout);
        reject(new Error(`Failed to load ${path}`));
    }, { once: true });
    frame.src = path;
    document.body.append(frame);
});

describe('sample pages', () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    it('links every focused example from the sample hub', async () => {
        const frame = await loadSample('/sample/index.html');
        const document = frame.contentDocument;
        const links = Array.from(document.querySelectorAll('.sample-card'))
            .map(link => new URL(link.href).pathname);

        equal(document.title, 'Base Custom WebComponent · Samples');
        equal(links.includes('/sample/counter.html'), true);
        equal(links.includes('/sample/bindings.html'), true);
        equal(links.includes('/sample/declarative.html'), true);
    });

    it('runs the counter sample and refreshes its dependent output', async () => {
        const frame = await loadSample('/sample/counter.html');
        const counter = frame.contentDocument.querySelector('sample-counter');
        const output = counter.shadowRoot.querySelector('output');

        equal(output.textContent, '3');
        counter.shadowRoot.querySelector('button.primary').click();
        equal(output.textContent, '4');
        equal(counter.count, 4);
    });

    it('runs safe text, repeat, and conditional interactions in the binding sample', async () => {
        const frame = await loadSample('/sample/bindings.html');
        const playground = frame.contentDocument.querySelector('sample-binding-playground');
        const root = playground.shadowRoot;
        const input = root.querySelector('input');

        input.value = '<Grace>';
        input.dispatchEvent(new Event('input'));
        equal(root.querySelector('.preview-grid h3').textContent.trim(), 'Welcome, <Grace>');
        equal(root.querySelector('.preview-grid h3').querySelector('grace'), null);

        equal(root.querySelectorAll('li').length, 3);
        root.querySelector('.list-head button').click();
        equal(root.querySelectorAll('li').length, 4);

        equal(root.querySelector('aside') !== null, true);
        root.querySelector('.details-toggle').click();
        equal(root.querySelector('aside'), null);
    });

    it('runs the declarative page and renders updated markup-like values literally', async () => {
        const frame = await loadSample('/sample/declarative.html');
        const document = frame.contentDocument;
        const card = document.querySelector('sample-status-card');

        equal(card.shadowRoot.querySelector('h2').textContent, 'Review');
        equal(card.shadowRoot.querySelectorAll('li').length, 3);

        document.querySelector('#set-review').click();
        const message = card.shadowRoot.querySelector('.message');
        equal(message.textContent, '<strong>This string is displayed literally.</strong>');
        equal(message.querySelector('strong'), null);

        document.querySelector('#set-ready').click();
        equal(card.shadowRoot.querySelector('h2').textContent, 'Ready');
        equal(card.getAttribute('status'), 'Ready');
    });
});

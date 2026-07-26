import {
    BaseCustomWebComponentConstructorAppend,
    css,
    customElement,
    html,
    property,
} from '../../dist/BaseCustomWebComponent.js';

@customElement('sample-counter')
export class SampleCounter extends BaseCustomWebComponentConstructorAppend {
    static template = html`
        <section class="counter-card">
            <p class="eyebrow">Live component state</p>
            <h2 bcw:text="[[this.label]]"></h2>
            <output class:empty="[[this.count === 0]]">[[text:this.count]]</output>
            <div class="actions" aria-label="Counter controls">
                <button @click="decrement" ?disabled="[[this.count === 0]]">− Decrease</button>
                <button @click="reset">Reset</button>
                <button class="primary" @click="increment">Increase +</button>
            </div>
            <p class="hint">The count starts from an HTML attribute and refreshes only its dependent bindings.</p>
        </section>
    `;

    static style = css`
        :host {
            display: block;
            color: #eaf0ff;
            font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }

        .counter-card {
            padding: clamp(1.5rem, 4vw, 2.5rem);
            border: 1px solid rgba(148, 163, 184, .2);
            border-radius: 1.5rem;
            background:
                radial-gradient(circle at top right, rgba(56, 189, 248, .16), transparent 42%),
                linear-gradient(145deg, #111827, #0b1120);
            box-shadow: 0 24px 70px rgba(2, 6, 23, .35);
        }

        .eyebrow {
            margin: 0 0 .5rem;
            color: #67e8f9;
            font-size: .75rem;
            font-weight: 800;
            letter-spacing: .16em;
            text-transform: uppercase;
        }

        h2 {
            margin: 0;
            font-size: clamp(1.35rem, 3vw, 2rem);
        }

        output {
            display: block;
            margin: 1.75rem 0;
            color: #f8fafc;
            font-size: clamp(4rem, 15vw, 7rem);
            font-weight: 850;
            letter-spacing: -.07em;
            line-height: .9;
            transition: color .2s ease;
        }

        output.empty {
            color: #64748b;
        }

        .actions {
            display: flex;
            flex-wrap: wrap;
            gap: .75rem;
        }

        button {
            min-height: 2.75rem;
            padding: 0 1rem;
            border: 1px solid #334155;
            border-radius: .8rem;
            background: #172033;
            color: #e2e8f0;
            cursor: pointer;
            font: inherit;
            font-weight: 700;
        }

        button:hover:not(:disabled) {
            border-color: #64748b;
            transform: translateY(-1px);
        }

        button.primary {
            border-color: #22d3ee;
            background: #0891b2;
            color: white;
        }

        button:disabled {
            cursor: not-allowed;
            opacity: .4;
        }

        .hint {
            margin: 1.25rem 0 0;
            color: #94a3b8;
            line-height: 1.6;
        }
    `;

    @property(Number)
    count = 0;

    @property()
    label = 'Focused counter';

    constructor() {
        super();
        this._restoreCachedInititalValues();
    }

    ready() {
        this._parseAttributesToProperties();
        this._assignEvents();
        this._bindingsParse();
    }

    increment() {
        this.count++;
        this._bindingsRefresh('count');
    }

    decrement() {
        this.count = Math.max(0, this.count - 1);
        this._bindingsRefresh('count');
    }

    reset() {
        this.count = 0;
        this._bindingsRefresh('count');
    }
}

type SampleTask = {
    label: string;
};

@customElement('sample-binding-playground')
export class SampleBindingPlayground extends BaseCustomWebComponentConstructorAppend {
    static template = html`
        <section class="playground">
            <div class="intro">
                <p class="eyebrow">Binding playground</p>
                <h2>Safe text, deliberate HTML, and repeat reconciliation</h2>
                <p>Change the name and add items to see targeted refreshes update the component.</p>
            </div>

            <label>
                Display name
                <input .value="[[this.userName]]" @input="updateName">
            </label>

            <div class="preview-grid">
                <article>
                    <span class="badge safe">textContent</span>
                    <h3>Welcome, [[text:this.userName]]</h3>
                    <p bcw:text="[[this.richMessage]]"></p>
                </article>
                <article>
                    <span class="badge trusted">innerHTML</span>
                    <h3>Trusted markup</h3>
                    <p>[[this.richMessage]]</p>
                </article>
            </div>

            <div class="list-head">
                <div>
                    <p class="eyebrow">Identity-preserving repeat</p>
                    <h3>Release checklist</h3>
                </div>
                <button class="primary" @click="addTask">Add item</button>
            </div>
            <ol>
                <template repeat:task="[[this.tasks]]">
                    <li>
                        <span class="number">[[text:index + 1]]</span>
                        <span>[[text:task.label]]</span>
                    </li>
                </template>
            </ol>

            <button class="details-toggle" @click="toggleDetails">Toggle implementation note</button>
            <template if="[[this.showDetails]]">
                <aside>
                    Existing repeat instances are moved and reused by item identity when the list changes.
                </aside>
            </template>
        </section>
    `;

    static style = css`
        :host {
            display: block;
            color: #eaf0ff;
            font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }

        .playground {
            padding: clamp(1.25rem, 4vw, 2.5rem);
            border: 1px solid rgba(148, 163, 184, .2);
            border-radius: 1.5rem;
            background: linear-gradient(145deg, #111827, #0b1120);
            box-shadow: 0 24px 70px rgba(2, 6, 23, .35);
        }

        .intro h2,
        .list-head h3 {
            margin: 0;
        }

        .intro > p:last-child {
            max-width: 62ch;
            color: #94a3b8;
            line-height: 1.6;
        }

        .eyebrow {
            margin: 0 0 .4rem;
            color: #67e8f9;
            font-size: .72rem;
            font-weight: 800;
            letter-spacing: .16em;
            text-transform: uppercase;
        }

        label {
            display: grid;
            gap: .5rem;
            margin: 1.5rem 0;
            color: #cbd5e1;
            font-weight: 700;
        }

        input {
            min-height: 3rem;
            padding: 0 .9rem;
            border: 1px solid #334155;
            border-radius: .8rem;
            outline: none;
            background: #080f1e;
            color: #f8fafc;
            font: inherit;
        }

        input:focus {
            border-color: #22d3ee;
            box-shadow: 0 0 0 3px rgba(34, 211, 238, .12);
        }

        .preview-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
            gap: 1rem;
        }

        article,
        aside {
            padding: 1.1rem;
            border: 1px solid #263247;
            border-radius: 1rem;
            background: rgba(8, 15, 30, .72);
        }

        article h3 {
            margin: .8rem 0 .5rem;
        }

        article p {
            min-height: 2.5rem;
            margin: 0;
            color: #cbd5e1;
            overflow-wrap: anywhere;
        }

        .badge {
            display: inline-flex;
            padding: .25rem .55rem;
            border-radius: 999px;
            font-size: .7rem;
            font-weight: 800;
            letter-spacing: .08em;
            text-transform: uppercase;
        }

        .badge.safe {
            background: rgba(52, 211, 153, .13);
            color: #6ee7b7;
        }

        .badge.trusted {
            background: rgba(251, 191, 36, .12);
            color: #fcd34d;
        }

        .list-head {
            display: flex;
            align-items: end;
            justify-content: space-between;
            gap: 1rem;
            margin-top: 2rem;
        }

        button {
            min-height: 2.6rem;
            padding: 0 1rem;
            border: 1px solid #334155;
            border-radius: .8rem;
            background: #172033;
            color: #e2e8f0;
            cursor: pointer;
            font: inherit;
            font-weight: 700;
        }

        button.primary {
            border-color: #22d3ee;
            background: #0891b2;
            color: white;
        }

        ol {
            display: grid;
            gap: .65rem;
            padding: 0;
            list-style: none;
        }

        li {
            display: flex;
            align-items: center;
            gap: .8rem;
            padding: .8rem;
            border: 1px solid #263247;
            border-radius: .8rem;
            background: #0a1222;
        }

        .number {
            display: grid;
            width: 1.8rem;
            height: 1.8rem;
            place-items: center;
            border-radius: .55rem;
            background: #172554;
            color: #93c5fd;
            font-size: .78rem;
            font-weight: 800;
        }

        .details-toggle {
            margin-top: .5rem;
        }

        aside {
            margin-top: .75rem;
            border-color: rgba(34, 211, 238, .3);
            color: #a5f3fc;
            line-height: 1.55;
        }
    `;

    @property()
    userName = 'Ada';

    @property(Array)
    tasks: SampleTask[] = [
        { label: 'Compile the TypeScript sources' },
        { label: 'Run browser regression tests' },
        { label: 'Inspect the coverage report' },
    ];

    richMessage = '<strong>Markup-like input</strong> stays literal on the safe side.';
    showDetails = true;
    nextTask = 4;

    constructor() {
        super();
        this._restoreCachedInititalValues();
    }

    ready() {
        this._parseAttributesToProperties();
        this._assignEvents();
        this._bindingsParse();
    }

    updateName(event: Event) {
        this.userName = (event.currentTarget as HTMLInputElement).value;
        this._bindingsRefresh('userName');
    }

    addTask() {
        this.tasks = [
            ...this.tasks,
            { label: `Review sample interaction ${this.nextTask++}` },
        ];
        this._bindingsRefresh('tasks');
    }

    toggleDetails() {
        this.showDetails = !this.showDetails;
        this._bindingsRefresh('showDetails');
    }
}

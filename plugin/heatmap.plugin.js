import * as d3 from "https://esm.run/d3@7";

export default class PluginTileLayer extends HTMLElement {
    //#region VGA host APIs
    set sharedStates(value) {
        this.metadata = value?.metadata;
        this.#renderChart();
    }

    obtainHeaderCallback = () => `${this.displayName}`;

    hostFirstLoadedCallback() {
        const loadingEndDelegate = this.notifyLoadingDelegate?.();
        this.#renderChart();
        loadingEndDelegate?.();
    }
    //#endregion

    //#region plugin properties
    displayName = "Heatmap";
    conferences = [];
    years = [];
    //#endregion

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.renderUI();
    }

    renderUI() {
        if (!this.shadowRoot) return;
        this.shadowRoot.adoptedStyleSheets = [this.#styleSheet];
    }

    async #renderChart() {
        this.shadowRoot.innerHTML = "";

        if (this.metadata?.id == null) {
            return;
        }

        const margin = { top: 30, right: 30, bottom: 30, left: 30 },
            width = 500,
            height = 500;

        const svg = d3.select(this.shadowRoot)
            .append("svg")
            .attr(
                "viewBox",
                `0 0 ${width + margin.left + margin.right} ${
                    height + margin.top + margin.bottom
                }`,
            )
            .attr("preserveAspectRatio", "xMidYMid meet")
            .attr("width", "100%")
            .attr("height", "100%")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .range([0, width])
            .domain(this.years)
            .padding(0.01);
        svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x));

        const y = d3.scaleBand()
            .range([height, 0])
            .domain(this.conferences)
            .padding(0.01);
        svg.append("g")
            .call(d3.axisLeft(y));

        const timeSeries = await fetch(
            `${this.configBaseUrl}time-series/${this.metadata.id}.csv`,
        ).then((response) => response.text());
        const data = d3.csvParseRows(timeSeries).flatMap((ts, ci) =>
            ts.map((value, yi) => ({
                year: this.years[yi],
                conference: this.conferences[ci],
                value,
            }))
        );
        const values = data.map((d) => d.value);

        const myColor = d3.scaleLinear()
            .range(["white", "red"])
            .domain([d3.min(values), d3.max(values)]);

        svg.selectAll()
            .data(data)
            .join("rect")
            .attr("x", function (d) {
                return x(d.year);
            })
            .attr("y", function (d) {
                return y(d.conference);
            })
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
            .style("fill", function (d) {
                return myColor(d.value);
            })
            .append("title")
            .text((d) => `${d.conference}:${d.year}:${d.value}`);
    }

    get #styleSheet() {
        const css = /* css */ `
        :host {
          display: block;
        }
      `;
        const styleSheet = new CSSStyleSheet();
        styleSheet.replaceSync(css);
        return styleSheet;
    }
}

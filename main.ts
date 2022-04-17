import { Plugin, MarkdownRenderChild, MarkdownRenderer } from 'obsidian';

export default class ObsidianColumns extends Plugin {

	async onload() {

		this.registerMarkdownCodeBlockProcessor("md", (source, el, ctx) => {
			const sourcePath = ctx.sourcePath;
			let child = el.createDiv();
			MarkdownRenderer.renderMarkdown(
				source,
				child,
				sourcePath,
				null
			);
		});

		this.registerMarkdownCodeBlockProcessor("col", (source, el, ctx) => {
			const sourcePath = ctx.sourcePath;
			let rows = source.split("\n");
			let child = createDiv();
			MarkdownRenderer.renderMarkdown(
				source,
				child,
				sourcePath,
				null
			);
			console.log(child.children)
			let parent = el.createEl("div", { cls: "columnParent" });
			Array.from(child.children).forEach((c) => {
				let cc = parent.createEl("div", {cls: "columnChild"})
				cc.appendChild(c)
			})
			console.log(parent)
		});
	}

	onunload() {

	}
}
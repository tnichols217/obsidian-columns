import { Plugin, MarkdownRenderChild, MarkdownRenderer } from 'obsidian';

const COLUMNNAME = "col"
const COLUMNMD = COLUMNNAME + "-md"
const TOKEN = "!!!"

export default class ObsidianColumns extends Plugin {

	async onload() {

		this.registerMarkdownCodeBlockProcessor(COLUMNMD, (source, el, ctx) => {
			const sourcePath = ctx.sourcePath;
			let child = el.createDiv();
			MarkdownRenderer.renderMarkdown(
				source,
				child,
				sourcePath,
				null
			);
		});

		this.registerMarkdownCodeBlockProcessor(COLUMNNAME, (source, el, ctx) => {
			const sourcePath = ctx.sourcePath;
			let rows = source.split("\n");
			let child = createDiv();
			MarkdownRenderer.renderMarkdown(
				source,
				child,
				sourcePath,
				null
			);
			let parent = el.createEl("div", { cls: "columnParent" });
			Array.from(child.children).forEach((c) => {
				let cc = parent.createEl("div", { cls: "columnChild" })
				cc.appendChild(c)
			})
		});

		let processList = (element: Element) => {
			for (let child of Array.from(element.children)) {
				if (child == null) {
					continue
				}
				if (child.nodeName != "UL" && child.nodeName != "OL") {
					continue
				}
				for (let listItem of Array.from(child.children)) {
					if (listItem == null) {
						continue
					}
					if (!listItem.textContent.startsWith(TOKEN + COLUMNNAME)) {
						processList(listItem)
						continue
					}
					child.removeChild(listItem)
					let colParent = element.createEl("div", { cls: "columnParent" })
					let itemList = listItem.querySelector("ul, ol")
					if (itemList == null) {
						continue
					}
					for (let itemListItem of Array.from(itemList.children)) {
						let childDiv = colParent.createEl("div", { cls: "columnChild" })
						let span = parseFloat(itemListItem.textContent.split("\n")[0].split(" ")[0])
						if (!isNaN(span)) {
							childDiv.setAttribute("style", "flex-grow:" + span.toString())
						}
						let afterText = false
						processList(itemListItem)
						for (let itemListItemChild of Array.from(itemListItem.childNodes)) {
							if (afterText) {
								childDiv.appendChild(itemListItemChild)
							}
							if (itemListItemChild.nodeName == "#text") {
								afterText = true
							}
						}
					}
				}
			}
		}

		this.registerMarkdownPostProcessor((element, context) => {processList(element)});
	}

	onunload() {

	}
}
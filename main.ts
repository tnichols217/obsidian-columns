import { Plugin, MarkdownRenderChild, MarkdownRenderer, PluginSettingTab, App, Setting, MarkdownView, MarkdownPostProcessorContext } from 'obsidian';

const COLUMNNAME = "col"
const COLUMNMD = COLUMNNAME + "-md"
const TOKEN = "!!!"

interface settingItem<T> {
	value: T
	name?: string
	desc?: string
}

interface columnSettings {
	wrapSize: settingItem<number>,
	defaultSpan: settingItem<number>
}

const DEFAULT_SETTINGS: columnSettings = {
	wrapSize: { value: 100, name: "Minimum width of column", desc: "Columns will have this minimum width before wrapping to a new row. 0 disables column wrapping. Useful for smaller devices" },
	defaultSpan: { value: 1, name: "The default span of an item", desc: "The default width of a column. If the minimum width is specified, the width of the column will be multiplied by this setting." }
}

let parseBoolean = (value: string) => {
	return (value == "yes" || value == "true")
}

let parseObject = (value: any, typ: string) => {
	if (typ == "string") {
		return value
	}
	if (typ == "boolean") {
		return parseBoolean(value)
	}
	if (typ == "number") {
		return parseFloat(value)
	}
}

let processChild = (c: HTMLElement) => {
	if (c.firstChild != null && "tagName" in c.firstChild && (c.firstChild as HTMLElement).tagName == "BR") {
		c.removeChild(c.firstChild)
	}
	let firstChild = c

	while (firstChild != null) {
		if ("style" in firstChild) {
			firstChild.style.marginTop = "0px"
		}
		firstChild = (firstChild.firstChild as HTMLElement)
	}
	let lastChild = c
	while (lastChild != null) {
		if ("style" in lastChild) {
			lastChild.style.marginBottom = "0px"
		}
		lastChild = (lastChild.lastChild as HTMLElement)
	}
}

export default class ObsidianColumns extends Plugin {
	generateCssString = (span: number) => {
		return "flex-grow:" + span.toString() + "; flex-basis:" + (this.settings.wrapSize.value * span).toString() + "px" + "; width:" + (this.settings.wrapSize.value * span).toString() + "px"
	}

	settings: columnSettings;

	async onload() {

		await this.loadSettings();
		this.addSettingTab(new ObsidianColumnsSettings(this.app, this));

		this.registerMarkdownCodeBlockProcessor(COLUMNMD, (source, el, ctx) => {
			const sourcePath = ctx.sourcePath;
			let child = el.createDiv();
			let renderChild = new MarkdownRenderChild(child)
			ctx.addChild(renderChild)
			MarkdownRenderer.renderMarkdown(
				source,
				child,
				sourcePath,
				renderChild
			);
		})

		this.registerMarkdownCodeBlockProcessor(COLUMNNAME, (source, el, ctx) => {
			const sourcePath = ctx.sourcePath;
			let child = createDiv();
			let renderChild = new MarkdownRenderChild(child)
			ctx.addChild(renderChild)
			MarkdownRenderer.renderMarkdown(
				source,
				child,
				sourcePath,
				renderChild
			);
			let parent = el.createEl("div", { cls: "columnParent" });
			Array.from(child.children).forEach((c: HTMLElement) => {
				let cc = parent.createEl("div", { cls: "columnChild" })
				let renderCc = new MarkdownRenderChild(cc)
				ctx.addChild(renderCc)
				cc.setAttribute("style", this.generateCssString(this.settings.defaultSpan.value))
				cc.appendChild(c)
				processChild(c)
			})
		})

		let processList = (element: Element, context: MarkdownPostProcessorContext) => {
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
					if (!listItem.textContent.trim().startsWith(TOKEN + COLUMNNAME)) {
						processList(listItem, context)
						continue
					}
					child.removeChild(listItem)
					let colParent = element.createEl("div", { cls: "columnParent" })
					let renderColP = new MarkdownRenderChild(colParent)
					context.addChild(renderColP)
					let itemList = listItem.querySelector("ul, ol")
					if (itemList == null) {
						continue
					}
					for (let itemListItem of Array.from(itemList.children)) {
						let childDiv = colParent.createEl("div", { cls: "columnChild" })
						let renderColC = new MarkdownRenderChild(childDiv)
						context.addChild(renderColC)
						let span = parseFloat(itemListItem.textContent.split("\n")[0].split(" ")[0])
						if (isNaN(span)) {
							span = this.settings.defaultSpan.value
						}
						childDiv.setAttribute("style", this.generateCssString(span))
						let afterText = false
						processList(itemListItem, context)
						for (let itemListItemChild of Array.from(itemListItem.childNodes)) {
							if (afterText) {
								childDiv.appendChild(itemListItemChild)
							}
							if (itemListItemChild.nodeName == "#text") {
								afterText = true
							}
						}
						processChild(childDiv)
					}
				}
			}
		}

		this.registerMarkdownPostProcessor((element, context) => { processList(element, context) });
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class ObsidianColumnsSettings extends PluginSettingTab {
	plugin: ObsidianColumns;

	constructor(app: App, plugin: ObsidianColumns) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: 'Settings for obsidian-columns' });

		let keyvals = Object.entries(DEFAULT_SETTINGS)

		console.log(keyvals)

		for (let keyval of keyvals) {
			new Setting(containerEl)
				.setName(keyval[1].name)
				.setDesc(keyval[1].desc)
				.addText(text => text
					.setPlaceholder(String(keyval[1].value))
					.setValue(String((this.plugin.settings as any)[keyval[0]].value))
					.onChange((value) => {
						keyval[1].value = parseObject(value, typeof keyval[1].value);
						this.plugin.saveSettings();
					}));
		}
	}
}
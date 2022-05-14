import { Plugin, MarkdownRenderChild, MarkdownRenderer, PluginSettingTab, App, Setting, MarkdownView, MarkdownPostProcessorContext } from 'obsidian';

const COLUMNNAME = "col"
const COLUMNMD = COLUMNNAME + "-md"
const TOKEN = "!!!"
const SETTINGSDELIM = "\n===\n"

interface SettingItem<T> {
	value: T
	name?: string
	desc?: string
}

interface ColumnSettings {
	wrapSize: SettingItem<number>,
	defaultSpan: SettingItem<number>
}

const DEFAULT_SETTINGS: ColumnSettings = {
	wrapSize: { value: 100, name: "Minimum width of column", desc: "Columns will have this minimum width before wrapping to a new row. 0 disables column wrapping. Useful for smaller devices" },
	defaultSpan: { value: 1, name: "The default span of an item", desc: "The default width of a column. If the minimum width is specified, the width of the column will be multiplied by this setting." }
}

let parseSettings = (settings: string) => {
	let o = {}
	settings.split("\n").map((i) => {
		return i.split(";")
	}).reduce((a, b) => {
		a.push(...b)
		return a
	}).map((i) => {
		return i.split("=").map((j) => {
			return j.trim()
		}).slice(0, 2)
	}).forEach((i) => {
		(o as any)[i[0]] = i[1]
	})
	return o
}

export default class ObsidianColumns extends Plugin {
	generateCssString = (span: number): CSSStyleDeclaration => {
		let o = {} as CSSStyleDeclaration
		o.flexGrow = span.toString()
		o.flexBasis = (this.settings.wrapSize.value * span).toString() + "px"
		o.width = (this.settings.wrapSize.value * span).toString() + "px"
		console.log(o)
		return o
	}

	applyStyle = (el: HTMLElement, styles: CSSStyleDeclaration) => {
		console.log(el.style)
		console.log(styles)
		Object.assign(el.style, styles)
		console.log(el.style)
	}

	settings: ColumnSettings;

	parseBoolean = (value: string) => {
		return (value == "yes" || value == "true")
	}
	
	parseObject = (value: any, typ: string) => {
		if (typ == "string") {
			return value
		}
		if (typ == "boolean") {
			return this.parseBoolean(value)
		}
		if (typ == "number") {
			return parseFloat(value)
		}
	}
	
	processChild = (c: HTMLElement) => {
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

	async onload() {

		await this.loadSettings();
		this.addSettingTab(new ObsidianColumnsSettings(this.app, this));

		this.registerMarkdownCodeBlockProcessor(COLUMNMD, (source, el, ctx) => {
			let split = source.split(SETTINGSDELIM)
			let settings = {}
			if (split.length > 1) {
				source = split.slice(1).join(SETTINGSDELIM)
				settings = parseSettings(split[0])
			}

			console.log(settings)

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
			if ("flexGrow" in settings) {
				let flexGrow = parseFloat((settings as CSSStyleDeclaration).flexGrow)
				let CSS = this.generateCssString(flexGrow)
				delete CSS.width
				this.applyStyle(child, CSS)
			}
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
				console.log(cc.style.flexGrow)
				if (cc.style.flexGrow != "") {
					this.applyStyle(cc, this.generateCssString(this.settings.defaultSpan.value))
				}
				cc.appendChild(c)
				if (c.classList.contains("block-language-" + COLUMNMD) && (c.childNodes[0] as HTMLElement).style.flexGrow != "") {
					cc.style.flexGrow = (c.childNodes[0] as HTMLElement).style.flexGrow
					cc.style.flexBasis = (c.childNodes[0] as HTMLElement).style.flexBasis
					cc.style.width = (c.childNodes[0] as HTMLElement).style.flexBasis
				}
				this.processChild(c)
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
						this.applyStyle(childDiv, this.generateCssString(span))
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
						this.processChild(childDiv)
					}
				}
			}
		}

		this.registerMarkdownPostProcessor((element, context) => { processList(element, context) });
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = DEFAULT_SETTINGS
		this.loadData().then((data) => {
			if (data) {
				let items = Object.entries(data)
				items.forEach((item:[string, string]) => {
					(this.settings as any)[item[0]].value = item[1]
				})
			}
		})
	}

	async saveSettings() {
		let saveData:any = {}
		Object.entries(this.settings).forEach((i) => {
			saveData[i[0]] = (i[1] as SettingItem<any>).value
		})
		await this.saveData(saveData);
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

		for (let keyval of keyvals) {
			let setting = new Setting(containerEl)
				.setName(keyval[1].name)
				.setDesc(keyval[1].desc)

			if (typeof keyval[1].value == "boolean") {
				setting.addToggle(toggle => toggle
					.setValue((this.plugin.settings as any)[keyval[0]].value)
					.onChange((bool) => {
						(this.plugin.settings as any)[keyval[0]].value = bool
						this.plugin.saveSettings()
					})
				)
			} else {
				setting.addText(text => text
					.setPlaceholder(String(keyval[1].value))
					.setValue(String((this.plugin.settings as any)[keyval[0]].value))
					.onChange((value) => {
						(this.plugin.settings as any)[keyval[0]].value = this.plugin.parseObject(value, typeof keyval[1].value)
						this.plugin.saveSettings()
					})
				)
			}
		}
	}
}
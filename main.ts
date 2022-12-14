import { Plugin, MarkdownRenderChild, MarkdownRenderer, PluginSettingTab, App, MarkdownPostProcessorContext, Editor, MarkdownView, Modal, Setting } from 'obsidian';
import { SettingItem, display, loadSettings, saveSettings, createSetting } from 'obsidian-settings/settings'
import { eventNames, umask } from 'process';

const NAME = "Obsidian Columns"
const COLUMNNAME = "col"
const COLUMNMD = COLUMNNAME + "-md"
const TOKEN = "!!!"
const SETTINGSDELIM = "==="
const COLUMNPADDING = 10

export interface ColumnSettings {
	wrapSize: SettingItem<number>,
	defaultSpan: SettingItem<number>
}

const DEFAULT_SETTINGS: ColumnSettings = {
	wrapSize: { value: 100, name: "Minimum width of column", desc: "Columns will have this minimum width before wrapping to a new row. 0 disables column wrapping. Useful for smaller devices" },
	defaultSpan: { value: 1, name: "The default span of an item", desc: "The default width of a column. If the minimum width is specified, the width of the column will be multiplied by this setting." }
}

let findSettings = (source: string, unallowed = ["`"], delim = SETTINGSDELIM): {settings: string, source: string} => {
	let lines = source.split("\n")

	let done = false

	lineLoop: for (let line of lines) {
		for (let j of unallowed) {
			if (line.contains(j)) {
				break lineLoop
			}
			if (line == delim) {
				let split = source.split(delim + "\n")
				if (split.length > 1) {
					return {settings: split[0], source: split.slice(1).join(delim + "\n")}
				}
				break lineLoop
			}
		}
	}
	return {settings: "", source: source}
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

let parseDirtyNumber = (num: string) => {
	return parseFloat(num.split("")
		.filter((char: string) => "0123456789.".contains(char))
		.join(""))
}

export default class ObsidianColumns extends Plugin {
	generateCssString = (span: number): CSSStyleDeclaration => {
		let o = {} as CSSStyleDeclaration
		o.flexGrow = span.toString()
		o.flexBasis = (this.settings.wrapSize.value * span).toString() + "px"
		o.width = (this.settings.wrapSize.value * span).toString() + "px"
		return o
	}

	applyStyle = (el: HTMLElement, styles: CSSStyleDeclaration) => {
		Object.assign(el.style, styles)
	}

	settings: ColumnSettings;

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
			let mdSettings = findSettings(source)
			let settings = parseSettings(mdSettings.settings)
			source = mdSettings.source

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
			if ("height" in settings) {
				let heightCSS = {} as CSSStyleDeclaration
				heightCSS.height = (settings as {height: string}).height.toString()
				heightCSS.overflow = "scroll"
				this.applyStyle(child, heightCSS)
			}
		})

		this.registerMarkdownCodeBlockProcessor(COLUMNNAME, async (source, el, ctx) => {
			let mdSettings = findSettings(source)
			let settings = parseSettings(mdSettings.settings)
			source = mdSettings.source

			const sourcePath = ctx.sourcePath;
			let child = createDiv()
			let renderChild = new MarkdownRenderChild(child)
			ctx.addChild(renderChild)
			let renderAwait = MarkdownRenderer.renderMarkdown(
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
				this.applyStyle(cc, this.generateCssString(this.settings.defaultSpan.value))
				cc.appendChild(c)
				if (c.classList.contains("block-language-" + COLUMNMD) && (c.childNodes[0] as HTMLElement).style.flexGrow != "") {
					cc.style.flexGrow = (c.childNodes[0] as HTMLElement).style.flexGrow
					cc.style.flexBasis = (c.childNodes[0] as HTMLElement).style.flexBasis
					cc.style.width = (c.childNodes[0] as HTMLElement).style.flexBasis
				}
				this.processChild(c)
			})

			if ("height" in settings) {
				let height = (settings as {height: string}).height
				if (height == "shortest") {
					await renderAwait
					let shortest = Math.min(...Array.from(parent.children)
						.map((c: HTMLElement) => c.childNodes[0])
						.map((c: HTMLElement) => parseDirtyNumber(getComputedStyle(c).height) + parseDirtyNumber(getComputedStyle(c).lineHeight)))
					
					let heightCSS = {} as CSSStyleDeclaration
					heightCSS.height = shortest + "px"
					heightCSS.overflow = "scroll"
					Array.from(parent.children)
						.map((c: HTMLElement) => c.childNodes[0])
						.forEach((c: HTMLElement) => {
							this.applyStyle(c, heightCSS)
						})

				} else {
					let heightCSS = {} as CSSStyleDeclaration
					heightCSS.height = height
					heightCSS.overflow = "scroll"
					this.applyStyle(parent, heightCSS)
				}
			}
		})

		this.addCommand({
			id: 'insert-column-wrapper',
			name: 'Insert column wrapper',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				new ColumnInsertModal(this.app, (result) => {
					let num = result.numberOfColumns.value;
					let outString = "````col\n"
					for (let i = 0; i < num; i++) {
						outString += "```col-md\nflexGrow=1\n===\n# Column " + i + "\n```\n"
					}
					outString += "````\n"
					editor.replaceSelection(outString);
				}).open();
			}
		});

		this.addCommand({
			id: 'insert-column',
			name: 'Insert column',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				editor.replaceSelection("```col-md\nflexGrow=1\n===\n# New Column\n```");
			}
		});

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
		loadSettings(this, DEFAULT_SETTINGS)
		let r = document.querySelector(':root') as HTMLElement;
		r.style.setProperty('--obsidian-columns-min-width', this.settings.wrapSize.value.toString() + "px");
		r.style.setProperty('--obsidian-columns-def-span', this.settings.defaultSpan.value.toString());
	}

	async saveSettings() {
		await saveSettings(this, DEFAULT_SETTINGS)
	}
}


interface ModalSettings {
	numberOfColumns: SettingItem<number>,
}

const DEFAULT_MODAL_SETTINGS: ModalSettings = {
	numberOfColumns: { value: 2, name: "Number of Columns", desc: "Number of Columns to be made" },
}

export class ColumnInsertModal extends Modal {
	onSubmit: (result: ModalSettings) => void;

	constructor(app: App, onSubmit: (result: ModalSettings) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h1", { text: "Create a Column Wrapper" });


		let modalSettings: ModalSettings = DEFAULT_MODAL_SETTINGS

		let keyvals = (Object.entries(DEFAULT_MODAL_SETTINGS) as [string, SettingItem<any>][])

		for (let keyval of keyvals) {
			createSetting(contentEl, keyval, "", (value, key) => {
				(modalSettings as any)[key].value = value
			})
		}

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(modalSettings);
					}));
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}

class ObsidianColumnsSettings extends PluginSettingTab {
	plugin: ObsidianColumns;

	constructor(app: App, plugin: ObsidianColumns) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		display(this, DEFAULT_SETTINGS, NAME)
	}
}
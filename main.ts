import { Plugin, MarkdownRenderChild, MarkdownRenderer, PluginSettingTab, App, MarkdownPostProcessorContext, Editor, MarkdownView, Modal, Setting } from 'obsidian';
import { SettingItem, display, loadSettings, saveSettings, createSetting } from 'obsidian-settings/settings'

const NAME = "Obsidian Columns"
const COLUMNNAME = "col"
const COLUMNMD = COLUMNNAME + "-md"
const TOKEN = "!!!"
const SETTINGSDELIM = "==="
const COLUMNPADDING = 10
const MINWIDTHVARNAME = '--obsidian-columns-min-width'
const DEFSPANVARNAME = '--obsidian-columns-def-span'
const CODEBLOCKFENCE = "`"

type COLMDSETTINGS = {
	flexGrow?: string,
	height?: string,
	textAlign?: string
}

type COLSETTINGS = {
	height?: string,
	textAlign?: string,
	colMax?: string
}

export interface ColumnSettings {
	wrapSize: SettingItem<number>,
	defaultSpan: SettingItem<number>
}

const DEFAULT_SETTINGS: ColumnSettings = {
	wrapSize: {
		value: 100,
		name: "Minimum width of column",
		desc: "Columns will have this minimum width before wrapping to a new row. 0 disables column wrapping. Useful for smaller devices",
		onChange: (val: any) => {
			(document.querySelector(':root') as HTMLElement).style.setProperty(MINWIDTHVARNAME, val.toString() + "px")
		}
	},
	defaultSpan: {
		value: 1,
		name: "The default span of an item",
		desc: "The default width of a column. If the minimum width is specified, the width of the column will be multiplied by this setting.",
		onChange: (val: any) => {
			(document.querySelector(':root') as HTMLElement).style.setProperty(DEFSPANVARNAME, val.toString());
		}
	}
}

let findSettings = (source: string, unallowed = ["`"], delim = SETTINGSDELIM): { settings: string, source: string } => {
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
					return { settings: split[0], source: split.slice(1).join(delim + "\n") }
				}
				break lineLoop
			}
		}
	}
	return { settings: "", source: source }
}

let parseSettings = <T>(settings: string) => {
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
	return o as T
}

let countBeginning = (source: string) => {
	let out = 0
	let letters = source.split("")
	for (let letter of letters) {
		if (letter == CODEBLOCKFENCE) {
			out++
		} else {
			break
		}
	}
	return out
}

let parseRows = (source: string) => {
	let lines = source.split("\n")
	let rows = []
	let curToken = 0
	let newToken = 0
	let curRow = []
	for (let line of lines) {
		let newCount = countBeginning(line)
		newToken = newCount < 3 ? 0 : newCount
		if (curToken == 0 && newToken == 0 && line.startsWith(SETTINGSDELIM)) {
			rows.push(curRow.join("\n"))
			curRow = []
			continue
		} else if (curToken == 0) {
			curToken = newToken
		} else if (curToken == newToken) {
			curToken = 0
		}
		curRow.push(line)
	}
	rows.push(curRow.join("\n"))
	return rows
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
			let settings = parseSettings<COLMDSETTINGS>(mdSettings.settings)
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
			if (settings.flexGrow != null) {
				let flexGrow = parseFloat((settings as CSSStyleDeclaration).flexGrow)
				let CSS = this.generateCssString(flexGrow)
				delete CSS.width
				this.applyStyle(child, CSS)
			}
			if (settings.height != null) {
				let heightCSS = {} as CSSStyleDeclaration
				heightCSS.height = (settings as { height: string }).height.toString()
				heightCSS.overflow = "scroll"
				this.applyStyle(child, heightCSS)
			}
			if (settings.textAlign != null) {
				let alignCSS = {} as CSSStyleDeclaration
				alignCSS.textAlign = settings.textAlign
				this.applyStyle(child, alignCSS)
			}
		})

		this.registerMarkdownCodeBlockProcessor(COLUMNNAME, async (source, el, ctx) => {
			let mdSettings = findSettings(source)
			let settings = parseSettings<COLSETTINGS>(mdSettings.settings)
			let rowSource = parseRows(mdSettings.source)

			console.log(rowSource)

			for (let source of rowSource) {
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

				if (settings.height != null) {
					let height = (settings as { height: string }).height
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
				if (settings.textAlign != null) {
					let alignCSS = {} as CSSStyleDeclaration
					alignCSS.textAlign = settings.textAlign
					this.applyStyle(parent, alignCSS)
				}
			}
		})

		this.addCommand({
			id: "insert-column-wrapper",
			name: "Insert column wrapper",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				new ColumnInsertModal(this.app, (result) => {
					let num = result.numberOfColumns.value
					let outString = "````col\n"
					for (let i = 0; i < num; i++) {
						outString += "```col-md\nflexGrow=1\n===\n# Column " + i + "\n```\n"
					}
					outString += "````\n"
					editor.replaceSelection(outString)
				}).open()
			}
		})

		this.addCommand({
			id: "insert-quick-column-wrapper",
			name: "Insert quick column wrapper",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				let selectedText = editor.getSelection() // Get the currently selected text
				let cursorPosition = editor.getCursor() // Get the current cursor position

				// Construct the string with the selected text placed in the specified location
				let outString = "````col\n```col-md\nflexGrow=1\n===\n" + selectedText + "\n```\n````\n"

				editor.replaceSelection(outString) // Replace the selection with the constructed string

				// If there was no selected text, place the cursor on the specified line, else place it after the inserted string
				if (selectedText === "") {
					editor.setCursor({ line: cursorPosition.line + 4, ch: 0 }) // Place the cursor on the specified line
				} else {
					let lines = selectedText.split('\n').length // Calculate the number of lines in the selected text
					editor.setCursor({ line: cursorPosition.line + 4 + lines - 1, ch: selectedText.length - selectedText.lastIndexOf('\n') - 1 }) // Place the cursor after the inserted string
				}
			}
		})

		this.addCommand({
			id: "insert-column",
			name: "Insert column",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				let selectedText = editor.getSelection() // Get the currently selected text
				let cursorPosition = editor.getCursor() // Get the current cursor position

				let outString
				if (selectedText === "") {
					// If there is no selected text, insert a new column with a placeholder
					outString = "```col-md\nflexGrow=1\n===\n# New Column\n\n```"
					editor.replaceSelection(outString); // Replace the selection with the constructed string
					editor.setCursor({ line: cursorPosition.line + 4, ch: 0 }) // Place the cursor on the new line after # New Column
				} else {
					// If there is selected text, place it in the specified location
					outString = "```col-md\nflexGrow=1\n===\n" + selectedText + "\n```"
					editor.replaceSelection(outString); // Replace the selection with the constructed string
					let lines = selectedText.split('\n').length // Calculate the number of lines in the selected text
					editor.setCursor({ line: cursorPosition.line + lines + 2, ch: selectedText.length - selectedText.lastIndexOf('\n') - 1 }) // Place the cursor after the last character of the selected text
				}
			}
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
		await loadSettings(this, DEFAULT_SETTINGS)
		let r = document.querySelector(':root') as HTMLElement;
		console.log(this.settings.wrapSize.value.toString())
		r.style.setProperty(MINWIDTHVARNAME, this.settings.wrapSize.value.toString() + "px");
		r.style.setProperty(DEFSPANVARNAME, this.settings.defaultSpan.value.toString());
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
			createSetting(contentEl, keyval, "", (value: any, key: any) => {
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